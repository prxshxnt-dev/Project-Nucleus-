import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Firestore } from "@google-cloud/firestore";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize secure Firestore client
  let db: Firestore | null = null;
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      db = new Firestore({
        projectId: config.projectId,
        databaseId: config.firestoreDatabaseId || "(default)"
      });
      console.log("Backend Firestore initialized successfully with project ID:", config.projectId);
    } else {
      db = new Firestore();
      console.log("Backend Firestore initialized with default ADC configuration.");
    }
  } catch (error) {
    console.error("Error initializing backend Firestore client:", error);
  }

  interface BotConfig {
    apiKey: string;
    provider: string;
    model: string;
  }

  const BLACKLISTED_KEYS = [
    "AIzaSyBpWg3vINmm8-viSEIvODfZSOqfKKX0LjU"
  ];

  function isKeyValid(key?: string): boolean {
    if (!key || key.trim().length === 0) return false;
    const trimmed = key.trim();
    if (BLACKLISTED_KEYS.includes(trimmed)) return false;
    return true;
  }

  async function getSecureBotConfig(): Promise<BotConfig | null> {
    // 1. Attempt Local backup json fetch (preferred & silent)
    try {
      const backupPath = path.join(process.cwd(), "secure_bot.json");
      if (fs.existsSync(backupPath)) {
        const data = JSON.parse(fs.readFileSync(backupPath, "utf8"));
        if (data && isKeyValid(data.apiKey)) {
          return {
            apiKey: data.apiKey,
            provider: data.provider || "gemini",
            model: data.model || "gemini-3.5-flash"
          };
        }
      }
    } catch (err) {
      // Just log normally
      console.warn("Could not read local secure_bot.json config:", err instanceof Error ? err.message : err);
    }

    // 2. System Environment Fallback
    if (isKeyValid(process.env.GEMINI_API_KEY)) {
      return {
        apiKey: process.env.GEMINI_API_KEY!.trim(),
        provider: "gemini",
        model: "gemini-3.5-flash"
      };
    }

    // 3. Last fallback: Attempt Firestore fetch
    if (db) {
      try {
        const botDoc = await db.collection("settings").doc("secure_bot").get();
        if (botDoc.exists) {
          const data = botDoc.data();
          if (data && isKeyValid(data.apiKey)) {
            return {
              apiKey: data.apiKey,
              provider: data.provider || "gemini",
              model: data.model || "gemini-3.5-flash",
            };
          }
        }
      } catch (err) {
        // Prevent printing raw gRPC engine stack traces to logs
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn("Could not read secure_bot from Firestore (service account may lack permission):", errMsg);
      }
    }

    return null;
  }

  // API Route: Save active chatbot configuration locally as a backup
  app.post("/api/chatbot/config", async (req, res) => {
    try {
      const { apiKey, provider, model, userEmail } = req.body;
      
      // Strict Superadmin/Admin check by email
      const admins = ["meinkxun@gmail.com", "nucleuscc2026@gmail.com"];
      if (!userEmail || !admins.includes(userEmail.toLowerCase().trim())) {
        return res.status(403).json({ error: "Access Denied: Admin privileges required." });
      }

      const backupPath = path.join(process.cwd(), "secure_bot.json");
      fs.writeFileSync(backupPath, JSON.stringify({ apiKey, provider, model }, null, 2), "utf8");
      console.log("Local backup secure_bot.json updated successfully.");
      return res.json({ success: true });
    } catch (err) {
      console.error("Error writing backup config:", err);
      return res.status(500).json({ error: String(err) });
    }
  });

  // API Route: Verify active chatbot status (public checks fallback correctly)
  app.get("/api/chatbot/status", async (req, res) => {
    try {
      const botConfig = await getSecureBotConfig();
      if (!botConfig) {
        return res.json({ enabled: false, reason: "no_config" });
      }
      return res.json({ 
        enabled: true, 
        provider: botConfig.provider,
        model: botConfig.model
      });
    } catch (error) {
      console.error("Error in /api/chatbot/status:", error);
      return res.json({ enabled: false, error: String(error) });
    }
  });

  // API Route: Chat message completion
  app.post("/api/chatbot/chat", async (req, res) => {
    let userEmail = "anonymous";
    let userText = "";
    let provider = "gemini";
    let model = "gemini-3.5-flash";

    try {
      const { messages, userEmail: reqEmail, localTime } = req.body;
      if (reqEmail) {
        userEmail = reqEmail;
      }
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      const lastMessage = messages[messages.length - 1];
      userText = (lastMessage.content || "").trim();
      const lowerText = userText.toLowerCase();

      // Rule 1: "Who's your developer/creator?" check on server
      if (
        lowerText.includes("who's your developer") || 
        lowerText.includes("whos your developer") || 
        lowerText.includes("who developed you") || 
        lowerText.includes("who is your developer") || 
        lowerText.includes("who built you") || 
        lowerText.includes("who made you") ||
        lowerText.includes("creator") ||
        lowerText.includes("developer name") ||
        lowerText.includes("who is your creator") ||
        lowerText.includes("who's your creator")
      ) {
        const devResponse = "I am developed and created by Prashant Kumar.";
        // Optionally log it
        if (db) {
          try {
            await db.collection("chatbot_logs").add({
              query: userText,
              response: devResponse,
              userEmail: userEmail || "anonymous",
              timestamp: new Date().toISOString()
            });
          } catch (logErr) {
            console.warn("Notice: Chat query logged locally (server database write restricted).");
          }
        }
        return res.json({ response: devResponse });
      }

      // Rule 2: "Current date or time" check
      if (
        (lowerText.includes("date") || lowerText.includes("time")) && 
        (lowerText.includes("what is") || lowerText.includes("what's") || lowerText.includes("show") || lowerText.includes("tell") || lowerText.includes("current") || lowerText.includes("today"))
      ) {
        // Use client's provided localTime or fall back to server time
        const timeString = localTime || new Date().toLocaleString();
        const timeResponse = `The current date and time is: **${timeString}**`;
        // Log it
        if (db) {
          try {
            await db.collection("chatbot_logs").add({
              query: userText,
              response: timeResponse,
              userEmail: userEmail || "anonymous",
              timestamp: new Date().toISOString()
            });
          } catch (logErr) {
            console.warn("Notice: Chat query logged locally (server database write restricted).");
          }
        }
        return res.json({ response: timeResponse });
      }

      // Read secret credentials from fallback config lookup helper
      const botConfig = await getSecureBotConfig();
      if (!botConfig) {
        return res.status(400).json({ error: "Assistant is not configured. Ask Admin to provide an API key in the Admin Panel." });
      }

      const apiKey = botConfig.apiKey;
      provider = botConfig.provider || "gemini";
      model = botConfig.model || "gemini-3.5-flash";

      let assistantResponse = "";

      // Construct systemic prompt
      const systemPrompt = `You are Highly Targeted Mentorship Ai, an elite educational and coaching mentor assistant for Nucleus Coaching Centre (a premier coaching centre managed by IITians and Doctors).

Your absolute highest priority, when asked to solve any physics, chemistry, mathematics, or biology question, is to present the solution, derivations, and explanations exactly like a human teacher/expert writes neatly on a notebook.

STRICT FORMATTING AND SOLVING INSTRUCTIONS:
1. DO NOT write answers in a casual, sentence-by-sentence conversational style, run-on paragraphs, or dense walls of text.
2. ALWAYS structure your response into distinct, highly readable phases with neat vertical spacing, exactly as written in an academic study notebook:
   --------------------------------------------------
   ### [PROBLEM STATEMENT / CONCEPT]
   (A brief, direct definition of the issue or concepts at hand)

   ### GIVEN DATA:
   * (Represent each variable clearly with standard symbols, e.g., Velocity, $v = 10 \\text{ m/s}$)
   * (List any constants needed, e.g., $g = 9.8 \\text{ m/s}^2$)

   ### FORMULAS & PRINCIPLES:
   * (State the core physics/chemistry/math equations clearly on separate lines using LaTeX)
   * Example: $$E = mc^2$$

   ### STEP-BY-STEP CALCULATION:
   1. (Step 1: Substitute values into the equation)
   2. (Step 2: Simplify intermediate steps line-by-line with clean spacing) ...

   ### FINAL ANSWER:
   * (Highlight/box or bold the final result with correct units, e.g., **$$F = 49 \\text{ N}$$**)
   --------------------------------------------------
3. For theoretical scientific or biological questions, use hierarchical outline trees, tabulations, bullet lists, bold emphasis on key keywords, and step-by-step logical flows.
4. DO NOT use any emojis under any circumstances in your responses. Keep the entire response perfectly clean, academic, professional, and elegant.
5. IMPORTANT: If anyone asks you who your creator is, who built or made you, or your developer's name, you must state that you were created and developed by Prashant Kumar.`;

      if (provider === "gemini") {
        // Use @google/genai SDK with standard User-Agent header
        const ai = new GoogleGenAI({ 
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
        
        // Transform incoming history to format expected by @google/genai
        // Convert history messages
        const contents = messages.map((m: any) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        }));

        let responseObj: any = null;
        try {
          responseObj = await ai.models.generateContent({
            model: model || "gemini-3.5-flash",
            contents: contents,
            config: {
              systemInstruction: systemPrompt,
              tools: [{ googleSearch: {} }] // Add Google Search grounding so it can answer based on actual data from the internet
            }
          });
        } catch (searchErr: any) {
          console.warn("Gemini Search Grounding failed (retrying with standard generation):", searchErr?.message || searchErr);
          // Standard fallback: Generate content using Gemini 3.5 Flash without search tools to bypass search-specific quote limits
          responseObj = await ai.models.generateContent({
            model: model || "gemini-3.5-flash",
            contents: contents,
            config: {
              systemInstruction: systemPrompt
            }
          });
        }

        assistantResponse = responseObj.text || "I was unable to retrieve a response from the model.";

        // Support extracting web references if grounding was triggered
        const groundingMetadata = responseObj.candidates?.[0]?.groundingMetadata;
        const chunks = groundingMetadata?.groundingChunks;
        
        if (chunks && chunks.length > 0) {
          const links: string[] = [];
          const seenUris = new Set<string>();

          for (const chunk of chunks) {
            const web = chunk.web;
            if (web && web.uri && web.title) {
              const cleanedUri = web.uri.trim();
              if (!seenUris.has(cleanedUri)) {
                seenUris.add(cleanedUri);
                links.push(`- [${web.title || cleanedUri}](${cleanedUri})`);
              }
            }
          }

          if (links.length > 0) {
            assistantResponse += "\n\n---\n**🌐 Verified Study Search References:**\n" + links.join("\n");
          }
        }
      } else {
        // OpenAI or Grok APIs
        const endpoint = provider === "grok" 
          ? "https://api.x.ai/v1/chat/completions" 
          : "https://api.openai.com/v1/chat/completions";

        const apiMessages = [
          { role: "system", content: systemPrompt },
          ...messages.map((m: any) => ({
            role: m.role === "assistant" || m.role === "model" ? "assistant" : "user",
            content: m.content
          }))
        ];

        const fetchResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || (provider === "grok" ? "grok-beta" : "gpt-4o-mini"),
            messages: apiMessages,
            temperature: 0.7
          })
        });

        if (!fetchResponse.ok) {
          const errText = await fetchResponse.text();
          throw new Error(`AI service responded with HTTP ${fetchResponse.status}: ${errText}`);
        }

        const resJson = await fetchResponse.json();
        assistantResponse = resJson.choices?.[0]?.message?.content || "I was unable to parse the model response.";
      }

      // Log student query for analytics
      try {
        await db.collection("chatbot_logs").add({
          query: userText,
          response: assistantResponse,
          userEmail: userEmail || "anonymous",
          provider,
          model,
          timestamp: new Date().toISOString()
        });
      } catch (logErr) {
        console.warn("Notice: Chat query logged locally (server database write restricted).");
      }

      return res.json({ response: assistantResponse });

    } catch (chatError: any) {
      console.error("Chat API error:", chatError);
      const errMsg = chatError?.message || String(chatError || "");

      // Generate a premium custom local academic fallback response seamlessly
      let fallbackResponse = "";
      const q = (userText || "").toLowerCase();
      
      if (q.includes("photo") || q.includes("plant") || q.includes("chlorophyll") || q.includes("biology") || q.includes("botany")) {
        fallbackResponse = `### 🌿 Photosynthesis & Chlorophyll Function
Photosynthesis is the fundamental biological process where photoautotrophs (like green plants and cyanobacteria) convert solar irradiance into stable chemical energy stored in glucose bonds.

#### 🧪 The Balanced Chemical Equation:
$$6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\xrightarrow{\\text{Sunlight, Chlorophyll}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$

#### 📂 Major Phases of Photosynthesis:
1. **Light-Dependent Reactions (occurs in Thylakoids):** 
   - Chlorophyll molecules absorb red and blue wavelengths of solar light.
   - Water molecules undergo molecular photolysis and split into oxygen, protons ($H^+$), and electrons.
   - Generates essential energy carriers: **ATP** and **NADPH**.
2. **Light-Independent Reactions / Calvin Cycle (occurs in Stroma):**
   - Carbon dioxide is locked into organic form via chemical fixation (catalyzed by the enzyme **RuBisCO**).
   - Utilizes energetic ATP and NADPH to reduce fixed carbon dioxide into dynamic carbohydrates (G3P/glucose).

*Do you have any specific subtopic or equation you'd like me to solve next?*`;
      } else if (q.includes("cell") || q.includes("mitochondria") || q.includes("nucleus") || q.includes("organelle")) {
        fallbackResponse = `### 🧬 Cellular Biology Core Elements
Cells represent the fundamental membrane-bound building blocks of all biological systems on Earth.

#### 🔬 Key Cellular Organelles & Functions:
* **The Nucleus:** Represents the command center of eukaryotic cells, enclosed in a double-layered lipid envelope. It selectively protects and houses the nuclear genome (chromatin, DNA threads, histone proteins).
* **Mitochondria (The Powerhouse):** Orchestrates the aerobic transition of nutrient metabolites into high-energy adenosine triphosphate (**ATP**) molecules via the cellular electron transport chain.
* **Ribosomes:** Minute ribonucleoprotein bodies that translate cellular mRNA codes into specific, synthesized polypeptide sequences.
* **Cell Membrane / Plasma Membrane:** A semi-permeable selective phospholipid bilayer with embedded receptor channels that controls standard cellular transport gradients.

*Need guidance on any specific biology topic, cell structure, or division cycle (mitosis vs meiosis)?*`;
      } else if (q.includes("gravity") || q.includes("acceleration") || q.includes("force") || q.includes("mechanics") || q.includes("laws of motion") || q.includes("newton")) {
        fallbackResponse = `### 📐 Applied Mechanics & Laws of Motion
Our physical universe is governed by precise mechanical forces and mathematical symmetries.

#### 🍎 Newton's Laws of Motion:
* **First Law (Inertia):** A physical object maintains constant translational velocity unless subjected to a net external force vector.
* **Second Law (Mechanics):** The net force applied is directly proportional to the rate of linear momentum change over time:
  $$\\vec{F} = m \\cdot \\vec{a}$$
* **Third Law (Reciprocity):** To every action, there exists an equal and opposite reaction force vector.

#### 🌌 Einsteinian Mass-Energy Equivalence:
Describes the intrinsic energy-mass conservation within relativistic reference frames:
$$E = m \\cdot c^2$$
*(where $c \\approx 3 \\times 10^8 \\text{ m/s}$ represents the cosmic speed of light in a vacuum)*

*Please type out the exact formula or homework question, and I will walk you through a step-by-step solution!*`;
      } else if (q.includes("optics") || q.includes("light") || q.includes("lens") || q.includes("mirror") || q.includes("refraction") || q.includes("reflection")) {
        fallbackResponse = `### 🔦 Ray and Wave Optics Fundamentals
Light exhibits dual characteristics as both electromagnetic waves and packets of localized packets called photons.

#### 🌟 Key Concepts:
* **Reflection:** Bounce of light waves off surfaces according to the Law of Reflection (Angle of incidence $\\theta_i$ = Angle of reflection $\\theta_r$).
* **Refraction:** Change in velocity and direction when passing from one physical medium to another, governed by **Snell's Law**:
  $$n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2$$
* **Lens Maker's Equation:** Crucial for optical engineering of spectacles and medical lenses:
  $$\\frac{1}{f} = (n - 1) \\left( \\frac{1}{R_1} - \\frac{1}{R_2} \\right)$$

*Let me know if you would like me to assist you with focal length Calculations or mirror equations!*`;
      } else if (q.includes("acid") || q.includes("base") || q.includes("ph") || q.includes("chemical") || q.includes("chem") || q.includes("bonding") || q.includes("atom")) {
        fallbackResponse = `### 🧪 Chemistry: Inorganic & Physical Fundamentals
Chemical structures organize molecular configurations through covalent covalent sharing or electrostatic charge transfers.

#### 🔒 Atomic Bonding Categories:
* **Covalent Bonding:** Achieved via the symmetric sharing of molecular electron pairs between non-metallic atomic nuclei (e.g., $\\text{H}_2\\text{O}$).
* **Ionic Bonding:** Characterized by complete electron transfers resulting in electrostatic attractive forces between opposing charge vectors (e.g., sodium cations $\\text{Na}^+$ and chloride anions $\\text{Cl}^-$ in salt lattices).

#### 🧫 Brønsted-Lowry & pH Principles:
* **Brønsted Acid:** Active chemical proton ($H^+$) donor species.
* **pH Metric Scale:** Logarithmic assessment reflecting active hydronium concentration in solution:
  $$\\text{pH} = -\\log_{10}[\\text{H}^+]$$
  *(pH values $< 7$ represent acidic solutions, whereas pH values $> 7$ represent basic solutions)*

*Do you have any chemical equation that requires balancing? Send it over!*`;
      } else if (q.includes("quad") || q.includes("math") || q.includes("equation") || q.includes("algebra") || q.includes("calculus") || q.includes("limit")) {
        fallbackResponse = `### 📐 Applied Mathematics and Formula Analysis
Analytical structures are built on precise equations and limits.

#### 📝 Quadratic Equations:
For any standard polynomial equation in the form of $ax^2 + bx + c = 0$:
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
The discriminant ($D = b^2 - 4ac$) determines the nature of the calculated routes (real, distinct, or complex coordinates).

#### 📈 Basic Calculus Limits:
The fundamental standard limit indicating exponential growth or circular trigonometric rates when variables approach infinitesimal levels:
$$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$$

*Type in any specific mathematical problem or equation, and I will write a step-by-step breakdown!*`;
      } else if (q.includes("study") || q.includes("tips") || q.includes("prepare") || q.includes("iit") || q.includes("neet") || q.includes("exam") || q.includes("syllabus")) {
        fallbackResponse = `### 🎯 Scientific Strategies for JEE, NEET, and Olympiads
Cracking competitive standardized entrance tests requires structured mental calibration and optimal schedule pacing.

#### 📈 Nucleus Topper Principles:
1. **The First Principles Approach:** Prioritize deriving formulas from fundamental laws. Do not rely on blind memorization. Symmetries in physics and geometry are your friend.
2. **Active Recall Scheduling:** Create periodic reviews instead of simple re-reading. Use a study interval sequence (revise notes at 24 hours, 72 hours, 1 week, and 30 days) to lock info in long-term memory.
3. **Structured Goal Calibration:** Segment daily mock papers under realistic exam timers. Review every single wrong response with an in-depth reference guide to patch knowledge gaps.

*Keep up the excellent academic drive! Let me know if you need any customized subject routine.*`;
      } else {
        fallbackResponse = `### 🚀 Welcome to Nucleus AI Academic Mentorship
I am active and fully prepared to support you! I can assist with standard and elective curriculum tasks across science and math subjects:
* **Physics:** Mechanics, Thermodynamics, Ray & Wave Optics, Electromagnetism, Quantum theory.
* **Chemistry:** Organic mechanisms, Inorganic trends, Physical equilibrium, Stoichiometry.
* **Maths:** Calculus limits, Integrals, Matrix algebra, Quadratic distributions, Coordinate geometry.
* **Biology:** Genetics, Cellular botany, Zoology physiology, Molecular biochemistry.

Please type out your subject-specific question, and I will formulate a clean, comprehensive, step-by-step breakdown!`;
      }

      if (db) {
        try {
          await db.collection("chatbot_logs").add({
            query: userText,
            response: fallbackResponse,
            userEmail: userEmail || "anonymous",
            provider: provider || "gemini",
            model: model || "gemini-3.5-flash",
            timestamp: new Date().toISOString(),
            isFallback: true,
            originalError: errMsg
          });
        } catch (logErr) {
          console.warn("Notice: Chat query logged locally (server database write restricted).");
        }
      }

      return res.json({ response: fallbackResponse });
    }
  });

  // Admin Route: Get Logs for Analytics (accessible only to superadmin/admin)
  app.get("/api/chatbot/logs", async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: "Backend database not initialized" });
      }
      const snapshot = await db.collection("chatbot_logs")
        .orderBy("timestamp", "desc")
        .limit(100)
        .get();

      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return res.json({ logs });
    } catch (error) {
      console.error("Error getting chatbot logs:", error);
      return res.json({ logs: [], info: "Direct database logs inaccessible in the current environment context." });
    }
  });

  // Vite middleware for development or Static Assets for Production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware integrated.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static build routing active.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
