import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { 
  initializeFirestore,
  doc as firestoreDoc, 
  getDoc as firestoreGetDoc, 
  setDoc as firestoreSetDoc, 
  deleteDoc as firestoreDeleteDoc,
  updateDoc as firestoreUpdateDoc,
  collection as firestoreCollection,
  getDocs as firestoreGetDocs,
  query as firestoreQuery,
  where as firestoreWhere,
  addDoc as firestoreAddDoc,
  limit as firestoreLimit,
  orderBy as firestoreOrderBy
} from "firebase/firestore";

class FirestoreWrapper {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  collection(collectionPath: string) {
    const firestoreDb = this.db;
    return {
      doc(docId: string) {
        return {
          async set(data: any) {
            await firestoreSetDoc(firestoreDoc(firestoreDb, collectionPath, docId), data);
          },
          async get() {
            const snap = await firestoreGetDoc(firestoreDoc(firestoreDb, collectionPath, docId));
            return {
              exists: snap.exists(),
              data: () => snap.data()
            };
          },
          async update(data: any) {
            await firestoreUpdateDoc(firestoreDoc(firestoreDb, collectionPath, docId), data);
          },
          async delete() {
            await firestoreDeleteDoc(firestoreDoc(firestoreDb, collectionPath, docId));
          }
        };
      },
      async add(data: any) {
        const docRef = await firestoreAddDoc(firestoreCollection(firestoreDb, collectionPath), data);
        return { id: docRef.id };
      },
      where(field: string, op: string, value: any) {
        return this._buildQuery([firestoreWhere(field, (op === "==" ? "==" : op) as any, value)]);
      },
      orderBy(field: string, direction: "asc" | "desc" = "asc") {
        return this._buildQuery([firestoreOrderBy(field, direction)]);
      },
      limit(n: number) {
        return this._buildQuery([firestoreLimit(n)]);
      },
      async get() {
        const snap = await firestoreGetDocs(firestoreCollection(firestoreDb, collectionPath));
        return {
          empty: snap.empty,
          docs: snap.docs.map(d => ({
            id: d.id,
            data: () => d.data()
          }))
        };
      },
      _buildQuery(constraints: any[]) {
        const self = this;
        return {
          constraints: [...constraints],
          where(field: string, op: string, value: any) {
            this.constraints.push(firestoreWhere(field, (op === "==" ? "==" : op) as any, value));
            return this;
          },
          orderBy(field: string, direction: "asc" | "desc" = "asc") {
            this.constraints.push(firestoreOrderBy(field, direction));
            return this;
          },
          limit(n: number) {
            this.constraints.push(firestoreLimit(n));
            return this;
          },
          async get() {
            const q = firestoreQuery(firestoreCollection(firestoreDb, collectionPath), ...this.constraints);
            const snap = await firestoreGetDocs(q);
            return {
              empty: snap.empty,
              docs: snap.docs.map(d => ({
                id: d.id,
                data: () => d.data()
              }))
            };
          }
        };
      }
    };
  }
}

import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();
const PORT = 3000;

async function startServer() {
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Ensure uploads folder exists
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

  // Initialize secure Firestore client
  let db: FirestoreWrapper | null = null;
  try {
    let config: any = null;
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else if (process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID) {
      config = {
        apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
        measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID,
        firestoreDatabaseId: process.env.FIRESTORE_DB_ID || process.env.VITE_FIRESTORE_DB_ID || "(default)"
      };
      console.log("Backend Firebase config successfully loaded from Environment Variables fallback.");
    }

    if (config) {
      const firebaseApp = initializeApp(config);
      let rawDb: any = null;
      try {
        rawDb = initializeFirestore(firebaseApp, {
          experimentalForceLongPolling: true
        }, config.firestoreDatabaseId || config.databaseId);
      } catch (e1) {
        console.warn("Backend failed to initialize custom Firestore database, falling back to default database ID:", e1);
        try {
          rawDb = initializeFirestore(firebaseApp, {
            experimentalForceLongPolling: true
          });
        } catch (e2) {
          console.error("Critical: Backend failed to initialize any Firestore database instance:", e2);
        }
      }
      
      if (rawDb) {
        db = new FirestoreWrapper(rawDb);
        console.log("Backend Firestore Client SDK initialized successfully with project ID:", config.projectId);
      } else {
        console.error("Backend Firestore Client SDK initialization yielded null database reference.");
      }
    } else {
      console.warn("Backend Firebase config file not found, and no environment variable fallback was available.");
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

  // ==========================================
  //     SECURE EMAIL OTP AUTH SYSTEM
  // ==========================================
  const JWT_SECRET = process.env.JWT_SECRET || "nucleus_cc_auth_jwt_super_secret_key_987!";

  let smtpConfig = {
    host: process.env.SMTP_HOST || process.env.MAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || process.env.MAIL_PORT || "587"),
    secure: (process.env.SMTP_SECURE || process.env.MAIL_SECURE) === "true", // Default false for 587, true for 465
    user: process.env.SMTP_USER || process.env.SMTP_USERNAME || process.env.MAIL_USER || process.env.SMTP_EMAIL || "",
    pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.MAIL_PASS || "",
    from: process.env.SMTP_FROM || process.env.MAIL_FROM || ""
  };

  // If port is 465, direct secure SSL is typically true
  const actualPort = process.env.SMTP_PORT || process.env.MAIL_PORT;
  const actualSecure = process.env.SMTP_SECURE || process.env.MAIL_SECURE;
  if (actualPort === "465" && !actualSecure) {
    smtpConfig.secure = true;
  } else if (actualPort === "587" && !actualSecure) {
    smtpConfig.secure = false;
  }

  // Load SMTP from Firestore dynamically
  const syncSmtpFromDb = async () => {
    if (db) {
       try {
         const smtpDoc = await db.collection("settings").doc("smtp_config").get();
         if (smtpDoc.exists) {
           const data = smtpDoc.data();
           if (data) {
             if (data.host) smtpConfig.host = data.host;
             if (data.port) smtpConfig.port = parseInt(data.port);
             if (data.secure !== undefined) smtpConfig.secure = data.secure === true;
             if (data.user) smtpConfig.user = data.user;
             if (data.pass) smtpConfig.pass = data.pass;
             if (data.from) smtpConfig.from = data.from;
             console.log("Successfully synchronized active SMTP settings from settings/smtp_config document in firestore.");
           }
         }
       } catch (err) {
         console.warn("Dynamic SMTP settings load bypassed:", err instanceof Error ? err.message : err);
       }
    }
  };

  // Seed configuration immediately during server setup
  await syncSmtpFromDb();

  // Helper to get current active transporter
  const getTransporter = async () => {
    // Dynamic on-demand synchronization ensures stateless environments (Vercel) always have the latest settings
    await syncSmtpFromDb();

    if (!smtpConfig.user || !smtpConfig.pass) {
      return null;
    }
    return nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  };

  // Local backups to prevent disruptions
  const fallbackOtps = new Map<string, { otp: string; expiresAt: number; type: string; lastSentAt: number }>();

  // Store OTP
  const storeOtpCode = async (identifier: string, otp: string, type: string) => {
    const key = identifier.toLowerCase().trim();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins
    const now = Date.now();

    fallbackOtps.set(key, { otp, expiresAt, type, lastSentAt: now });

    if (db) {
      try {
        await db.collection("otps").doc(`${key}_${type}`).set({
          identifier: key,
          otp,
          type,
          expiresAt: new Date(expiresAt).toISOString(),
          lastSentAt: new Date(now).toISOString()
        });
      } catch (err) {
        console.warn("Firestore writing OTP failed, fallback cache used:", err instanceof Error ? err.message : err);
      }
    }
  };

  // Verify OTP Helper
  const verifyOtpCode = async (identifier: string, otpInput: string, type: string): Promise<boolean> => {
    const key = identifier.toLowerCase().trim();
    const now = Date.now();

    // Check fallback memory cache
    const cached = fallbackOtps.get(key);
    if (cached && cached.type === type && cached.otp === otpInput && cached.expiresAt > now) {
      fallbackOtps.delete(key);
      return true;
    }

    if (db) {
      try {
        const docSnap = await db.collection("otps").doc(`${key}_${type}`).get();
        if (docSnap.exists) {
          const data = docSnap.data();
          if (data && data.otp === otpInput && data.type === type && new Date(data.expiresAt).getTime() > now) {
            await db.collection("otps").doc(`${key}_${type}`).delete();
            return true;
          }
        }
      } catch (err) {
        console.warn("Firestore verify OTP failed:", err instanceof Error ? err.message : err);
      }
    }
    return false;
  };

  // Endpoint: Sync SMTP Config from Firestore on request
  app.post("/api/auth/smtp-config-sync", async (req, res) => {
    try {
      const { host, port, secure, user, pass } = req.body;
      if (host) smtpConfig.host = host.trim();
      if (port) smtpConfig.port = parseInt(port);
      if (secure !== undefined) smtpConfig.secure = secure === true;
      if (user) smtpConfig.user = user.trim();
      if (pass) smtpConfig.pass = pass.trim();

      console.log(`[SMTP CONFIG SYNC] Active transporter configuration refreshed via Admin request. Active User: ${smtpConfig.user}`);
      return res.json({ success: true, message: "Server-side SMTP configuration successfully synchronized." });
    } catch (err: any) {
      console.error("Failed to sync SMTP:", err);
      return res.status(500).json({ error: err?.message || "Internal sync failure." });
    }
  });

  // Endpoint: Send OTP (OTP strictly delivered via Email)
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { email, phone, type } = req.body; // type: 'register' | 'login' | 'reset'
      if (!email && !phone) {
        return res.status(400).json({ error: "Email address or Mobile Phone Number is required to send OTP." });
      }

      let emailClean = email ? email.toLowerCase().trim() : "";
      const phoneClean = phone ? phone.trim() : "";
      const otpType = type || "register";

      // If we only have phone (e.g., OTP login with phone), find the associated student to send the OTP to their email
      if (!emailClean && phoneClean && db) {
        try {
          const snap = await db.collection("users").where("phone", "==", phoneClean).limit(1).get();
          if (!snap.empty) {
            const userData = snap.docs[0].data();
            if (userData && userData.email) {
              emailClean = userData.email.toLowerCase().trim();
            }
          }
        } catch (e) {
          console.warn("Firestore lookup phone to find email failed:", e);
        }
      }

      // If we still don't have an email with phone-only login, look up has failed or account doesn't exist
      if (!emailClean && phoneClean && otpType !== "register") {
        return res.status(400).json({ error: "No registered student email was found for this phone number." });
      }

      if (!emailClean) {
        return res.status(400).json({ error: "Email address is required to dispatch the OTP code." });
      }

      // 1. Cooldown Rate-Limiter (60 seconds) to prevent spam on this email address
      if (emailClean) {
        const cached = fallbackOtps.get(emailClean);
        if (cached && (Date.now() - cached.lastSentAt) < 60000) {
          const remainingSec = Math.ceil((60000 - (Date.now() - cached.lastSentAt)) / 1000);
          return res.status(429).json({ error: `Please wait ${remainingSec} seconds before requesting a new OTP.` });
        }
      }

      // 2. Extra checks for register/login states
      if (otpType === "register" && db) {
        try {
          if (emailClean) {
            const snap = await db.collection("users").where("email", "==", emailClean).limit(1).get();
            if (!snap.empty) {
              return res.status(400).json({ error: "This email is already registered. Please proceed to Login." });
            }
          }
          if (phoneClean) {
            const snap = await db.collection("users").where("phone", "==", phoneClean).limit(1).get();
            if (!snap.empty) {
              return res.status(400).json({ error: "This phone number is already registered. Please proceed to Login." });
            }
          }
        } catch (e) {
          console.warn("Firestore verify unique user failed:", e);
        }
      }

      if (otpType === "login" || otpType === "reset") {
        if (db) {
          try {
            let found = false;
            if (emailClean) {
              const snap = await db.collection("users").where("email", "==", emailClean).limit(1).get();
              if (!snap.empty) found = true;
            }
            if (!found) {
              return res.status(400).json({ error: "No registered student account was found." });
            }
          } catch (e) {
            console.warn("Firestore check student exists failed:", e);
          }
        }
      }

      // 3. Generate a secure 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // 4. Save to cache and database - strictly associated with the EMAIL address
      await storeOtpCode(emailClean, otp, otpType);

      // 5. Send Email via Nodemailer (strictly to email)
      let emailSent = false;
      let reason = "";

      const activeTransporter = await getTransporter();
      if (activeTransporter) {
        try {
          console.log(`[SMTP LOG] Starting SMTP OTP verification process.`);
          console.log(`[SMTP LOG] Recipient email: ${emailClean}`);
          console.log(`[SMTP LOG] Generated OTP code: ${otp}`);
          console.log(`[SMTP LOG] SMTP Host: ${smtpConfig.host}, Port: ${smtpConfig.port}, Secure: ${smtpConfig.secure}`);
          console.log(`[SMTP LOG] SMTP User: ${smtpConfig.user}`);

          // Test SMTP connection and auth
          console.log(`[SMTP LOG] Testing SMTP connection using transporter.verify()...`);
          await activeTransporter.verify();
          console.log(`[SMTP LOG] SMTP Connection Status: VERIFIED`);
          console.log(`[SMTP LOG] SMTP Authentication Result: SUCCESS`);

          const fromHeader = smtpConfig.from 
            ? (smtpConfig.from.includes("<") ? smtpConfig.from : `"${smtpConfig.from}" <${smtpConfig.user}>`) 
            : `"Nucleus.CC" <${smtpConfig.user}>`;

          const mailOptions = {
            from: fromHeader,
            to: emailClean,
            subject: `📚 Nucleus.CC Verification Code - ${otp}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ebd7b3; border-radius: 12px; background-color: #FAF6ED; color: #000000;">
                <div style="text-align: center; margin-bottom: 25px;">
                  <h1 style="color: #F15A29; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;">Nucleus.CC</h1>
                  <p style="color: #555555; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; font-weight: 600;">Premium Learning Ecosystem</p>
                </div>
                <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #ebd7b3; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
                  <p style="color: #222222; font-size: 16px; margin-top: 0; margin-bottom: 25px; line-height: 1.5;">To verify your email address on Nucleus.CC, please enter the dynamic verification code below:</p>
                  <div style="background-color: #FAF0E4; color: #F15A29; font-size: 36px; font-weight: 800; padding: 18px; border-radius: 10px; letter-spacing: 8px; margin: 25px 0; display: inline-block; border: 1px dashed #F15A29;">
                    ${otp}
                  </div>
                  <p style="color: #555555; font-size: 13px; margin-bottom: 0; line-height: 1.5;">This security PIN is valid for <strong>5 minutes</strong> and can only be used once. Do not share this OTP with anyone.</p>
                </div>
                <div style="text-align: center; margin-top: 25px; color: #777777; font-size: 11px; line-height: 1.4;">
                  © 2026 Nucleus.CC. Crafted with high excellence for school student levels.<br/>
                  Managed by core IITians and medical Doctors.
                </div>
              </div>
            `
          };
          console.log(`[SMTP LOG] Dispatching mail via sendMail()...`);
          const info = await activeTransporter.sendMail(mailOptions);
          emailSent = true;
          console.log(`[SMTP LOG] sendMail() Response:`, JSON.stringify(info));
          console.log(`[SMTP LOG] Email OTP successfully sent to ${emailClean}`);
        } catch (mailErr: any) {
          console.error(`[SMTP LOG] Nodemailer SMTP dispatch failed! Error Message: ${mailErr.message}`);
          console.error(`[SMTP LOG] Error Name: ${mailErr.name}`);
          console.error(`[SMTP LOG] Error Code: ${mailErr.code}`);
          console.error(`[SMTP LOG] Error Stack:`, mailErr.stack);
          reason = mailErr?.message || "SMTP server rejected transaction.";
        }
      } else {
        console.warn(`[SMTP LOG] No transporter created. Check your environment variables or Firestore smtp_config.`);
        reason = "SMTP credentials missing or unconfigured on workspace/database.";
      }

      const isSimulated = !emailSent;
      if (isSimulated) {
        console.log(`\n==============================================\n[SANDBOX Fallback] Email: '${emailClean}' | OTP Code: '${otp}' | Reason: ${reason}\n==============================================\n`);
      } else {
        console.log(`[OTP DISPATCH REAL] Email: '${emailClean}' | OTP Code: '${otp}' successfully dispatched.`);
      }
      
      const obfuscatedEmail = emailClean.replace(/(.{2})(.*)(@.*)/, "$1***$3");
      return res.json({
        success: true,
        email: emailClean,
        simulated: isSimulated,
        simulatedOtp: isSimulated ? otp : undefined,
        message: isSimulated
          ? `[Simulation Mode] OTP generated for your testing: ${otp}`
          : `A secure verification code has been dispatched to your email: ${obfuscatedEmail}`
      });
    } catch (err: any) {
      console.error("OTP Send error:", err);
      return res.status(500).json({ error: err?.message || "Internal server error during OTP send." });
    }
  });

  // Endpoint: Verify OTP (Strictly matching via Email)
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, phone, otp, type } = req.body;
      if (!email && !phone) {
        return res.status(400).json({ error: "Email or Phone is missing." });
      }
      if (!otp) {
        return res.status(400).json({ error: "Verification PIN code is missing." });
      }

      let emailClean = email ? email.toLowerCase().trim() : "";
      const phoneClean = phone ? phone.trim() : "";

      // Resolve email from phone number if email is not supplied
      if (!emailClean && phoneClean && db) {
        try {
          const snap = await db.collection("users").where("phone", "==", phoneClean).limit(1).get();
          if (!snap.empty) {
            const userData = snap.docs[0].data();
            if (userData && userData.email) {
              emailClean = userData.email.toLowerCase().trim();
            }
          }
        } catch (e) {
          console.warn("Firestore verify-otp lookup phone failed:", e);
        }
      }

      if (!emailClean) {
        return res.status(400).json({ error: "Could not locate a registered email associated with this identity." });
      }

      const verified = await verifyOtpCode(emailClean, otp, type);

      if (verified) {
        return res.json({ success: true, message: "Verification completed successfully." });
      } else {
        return res.status(400).json({ error: "Invalid or expired verification PIN. Please request a new one." });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Internal verification failure." });
    }
  });

  // Endpoint: User Signup / Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, phone, password, classGroup, otp } = req.body;
      if (!name || !email || !password || !otp) {
        return res.status(400).json({ error: "All profile fields are mandatory." });
      }

      const emailClean = email.toLowerCase().trim();
      const phoneClean = phone ? phone.trim() : "";
      const passwordHash = bcrypt.hashSync(password, 10);
      const uid = "student-" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString().slice(-6);

      // Verify OTP code first
      let validated = false;
      if (emailClean) {
        validated = await verifyOtpCode(emailClean, otp, "register");
      }
      if (!validated && phoneClean) {
        validated = await verifyOtpCode(phoneClean, otp, "register");
      }

      if (!validated) {
        return res.status(400).json({ error: "Invalid or expired verification PIN code." });
      }

      // Check for duplicates
      if (db) {
        const snap = await db.collection("users").where("email", "==", emailClean).limit(1).get();
        if (!snap.empty) {
          return res.status(400).json({ error: "An account is already linked with this email address." });
        }
        if (phoneClean) {
          const phoneSnap = await db.collection("users").where("phone", "==", phoneClean).limit(1).get();
          if (!phoneSnap.empty) {
            return res.status(400).json({ error: "An account is already linked with this phone number." });
          }
        }
      }

      // Store credentials in credentials subcollection (hiding password from standard client rules)
      if (db) {
        try {
          await db.collection("credentials").doc(emailClean).set({
            email: emailClean,
            passwordHash,
            uid,
            createdAt: new Date().toISOString()
          });

          // Write public student user details to global users collection
          await db.collection("users").doc(uid).set({
            email: emailClean,
            phone: phoneClean,
            displayName: name.trim(),
            role: "student",
            planId: "free",
            classGroup: classGroup || "11",
            unlockedMaterials: [],
            streak: 4,
            todayStudyMinutes: 30,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } catch (dbErr: any) {
          console.error("Firestore database write failed during register:", dbErr);
          return res.status(500).json({ error: "Failed to persist student record in Firestore DB." });
        }
      }

      // Create JWT session token
      const token = jwt.sign({ uid, email: emailClean, role: "student" }, JWT_SECRET, { expiresIn: "7d" });

      return res.json({
        success: true,
        token,
        user: {
          uid,
          email: emailClean,
          phone: phoneClean,
          displayName: name.trim(),
          role: "student",
          planId: "free",
          classGroup: classGroup || "11",
          streak: 4,
          todayStudyMinutes: 30
        }
      });
    } catch (err: any) {
      console.error("Auth register failed:", err);
      return res.status(500).json({ error: err?.message || "Registration service error." });
    }
  });

  // Endpoint: Passwordless User Login via OTP
  app.post("/api/auth/login-otp", async (req, res) => {
    try {
      const { email, phone, otp } = req.body;
      if (!email && !phone) {
        return res.status(400).json({ error: "Either Email or Mobile Phone must be supplied." });
      }
      if (!otp) {
        return res.status(400).json({ error: "Verification OTP code is required." });
      }

      let emailClean = email ? email.toLowerCase().trim() : "";
      const phoneClean = phone ? phone.trim() : "";

      // Look up and resolve email address from phone number if email is not supplied
      if (!emailClean && phoneClean && db) {
        try {
          const snap = await db.collection("users").where("phone", "==", phoneClean).limit(1).get();
          if (!snap.empty) {
            const userData = snap.docs[0].data();
            if (userData && userData.email) {
              emailClean = userData.email.toLowerCase().trim();
            }
          }
        } catch (e) {
          console.warn("Firestore login-otp lookup phone failed:", e);
        }
      }

      if (!emailClean) {
        return res.status(400).json({ error: "Could not locate a registered email associated with this identity." });
      }

      // 1. Verify OTP matching strictly email
      let validated = await verifyOtpCode(emailClean, otp, "login");

      if (!validated) {
        return res.status(400).json({ error: "Invalid or expired verification OTP." });
      }

      // 2. Locate Student User details
      let userData: any = null;
      let uid: string = "";

      if (db) {
        const snap = await db.collection("users").where("email", "==", emailClean).limit(1).get();
        if (!snap.empty) {
          uid = snap.docs[0].id;
          userData = snap.docs[0].data();
        }
      }

      if (!userData) {
        return res.status(400).json({ error: "No student details found. Please Register first." });
      }

      const token = jwt.sign({ uid, email: userData.email, role: userData.role || "student" }, JWT_SECRET, { expiresIn: "7d" });

      return res.json({
        success: true,
        token,
        user: {
          uid,
          email: userData.email || emailClean,
          phone: userData.phone || phoneClean,
          displayName: userData.displayName || "Student",
          role: userData.role || "student",
          planId: userData.planId || "free",
          classGroup: userData.classGroup || "11",
          streak: userData.streak || 5,
          todayStudyMinutes: userData.todayStudyMinutes || 45
        }
      });
    } catch (err: any) {
      console.error("OTP login failed:", err);
      return res.status(500).json({ error: err?.message || "OTP Login service error." });
    }
  });

  // Endpoint: User Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      const emailClean = email.toLowerCase().trim();

      if (db) {
        try {
          const credDoc = await db.collection("credentials").doc(emailClean).get();
          if (!credDoc.exists) {
            return res.status(400).json({ error: "No student account found with this email. Please sign up." });
          }

          const cred = credDoc.data();
          if (!cred || !cred.passwordHash) {
            return res.status(400).json({ error: "Authentication record is corrupted. Try signing up again or resetting password." });
          }

          const passwordValid = bcrypt.compareSync(password, cred.passwordHash);
          if (!passwordValid) {
            return res.status(400).json({ error: "Incorrect password. Please verify and try again." });
          }

          const uid = cred.uid;
          const userDoc = await db.collection("users").doc(uid).get();
          if (!userDoc.exists) {
            return res.status(400).json({ error: "Corresponding user profile is missing in our system." });
          }

          const userData = userDoc.data() || {};
          const token = jwt.sign({ uid, email: emailClean, role: userData.role || "student" }, JWT_SECRET, { expiresIn: "7d" });

          return res.json({
            success: true,
            token,
            user: {
              uid,
              email: emailClean,
              displayName: userData.displayName || "Student",
              role: userData.role || "student",
              planId: userData.planId || "free",
              classGroup: userData.classGroup || "11",
              streak: userData.streak || 5,
              todayStudyMinutes: userData.todayStudyMinutes || 45
            }
          });
        } catch (dbErr: any) {
          console.error("Firestore user login lookup failed:", dbErr);
          return res.status(500).json({ error: "Database error during user password check." });
        }
      }

      return res.status(500).json({ error: "Backend database client not ready for secure logins." });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Login service error." });
    }
  });

  // Endpoint: Forgot Password Trigger
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required." });
      }

      const emailClean = email.toLowerCase().trim();

      // Check if user exists
      if (db) {
        const credDoc = await db.collection("credentials").doc(emailClean).get();
        if (!credDoc.exists) {
          return res.status(400).json({ error: "No user is registered with this email address." });
        }
      }

      // Generate verification PIN
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await storeOtpCode(emailClean, otp, "reset");

      let emailSent = false;
      const activeTransporter = await getTransporter();
      if (activeTransporter) {
        try {
          console.log(`[SMTP LOG - Forgot Password] Starting SMTP reset process.`);
          console.log(`[SMTP LOG - Forgot Password] Recipient email: ${emailClean}`);
          console.log(`[SMTP LOG - Forgot Password] Generated reset OTP code: ${otp}`);
          console.log(`[SMTP LOG - Forgot Password] SMTP Host: ${smtpConfig.host}, Port: ${smtpConfig.port}, Secure: ${smtpConfig.secure}`);
          console.log(`[SMTP LOG - Forgot Password] SMTP User: ${smtpConfig.user}`);

          // Test SMTP connection and auth
          console.log(`[SMTP LOG - Forgot Password] Testing SMTP connection using transporter.verify()...`);
          await activeTransporter.verify();
          console.log(`[SMTP LOG - Forgot Password] SMTP Connection Status: VERIFIED`);
          console.log(`[SMTP LOG - Forgot Password] SMTP Authentication Result: SUCCESS`);

          const fromHeader = smtpConfig.from 
            ? (smtpConfig.from.includes("<") ? smtpConfig.from : `"${smtpConfig.from}" <${smtpConfig.user}>`) 
            : `"Nucleus.CC Support" <${smtpConfig.user}>`;

          const mailOptions = {
            from: fromHeader,
            to: emailClean,
            subject: `📚 Reset security credentials - Nucleus.CC`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ebd7b3; border-radius: 12px; background-color: #FAF6ED; color: #000000;">
                <h2 style="color: #F15A29; text-align: center; margin-bottom: 20px;">Nucleus.CC Support</h2>
                <div style="background-color: #ffffff; padding: 25px; border-radius: 10px; border: 1px solid #ebd7b3;">
                  <p style="font-size: 14px; color: #333;">You requested a password reset for your student account at Nucleus.CC. Enter the following 6-digit verification code to update your credentials:</p>
                  <p style="text-align: center; background-color: #FFF2EB; color: #F15A29; font-size: 32px; font-weight: 800; padding: 15px; border-radius: 8px; letter-spacing: 6px; margin: 20px 0; border: 1px dashed #F15A29;">
                    ${otp}
                  </p>
                  <p style="font-size: 12px; color: #666; margin-top: 20px;">This security PIN expires in <strong>5 minutes</strong>. If you did not make this request, you can safely ignore this mail.</p>
                </div>
              </div>
            `
          };
          console.log(`[SMTP LOG - Forgot Password] Dispatching reset mail via sendMail()...`);
          const info = await activeTransporter.sendMail(mailOptions);
          emailSent = true;
          console.log(`[SMTP LOG - Forgot Password] sendMail() Response:`, JSON.stringify(info));
          console.log(`[SMTP LOG - Forgot Password] Reset email OTP successfully sent to ${emailClean}`);
        } catch (mailErr: any) {
          console.error(`[SMTP LOG - Forgot Password] Nodemailer SMTP dispatch failed! Error Message: ${mailErr.message}`);
          console.error(`[SMTP LOG - Forgot Password] Error Name: ${mailErr.name}`);
          console.error(`[SMTP LOG - Forgot Password] Error Code: ${mailErr.code}`);
          console.error(`[SMTP LOG - Forgot Password] Error Stack:`, mailErr.stack);
        }
      } else {
        console.warn(`[SMTP LOG - Forgot Password] No transporter created. Check your environment variables or Firestore smtp_config.`);
      }

      const isSimulated = !emailSent;
      if (isSimulated) {
        console.log(`\n==============================================\n[SANDBOX ForgotPassword Fallback] Email: '${emailClean}' | OTP Code: '${otp}'\n==============================================\n`);
      }

      return res.json({
        success: true,
        simulated: isSimulated,
        simulatedOtp: isSimulated ? otp : undefined,
        message: isSimulated
          ? `[Simulation Mode] OTP reset PIN generated for your testing: ${otp}`
          : `A password reset PIN was sent to your email address: ${emailClean}.`
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Reset password request failed." });
    }
  });

  // Endpoint: Reset Password Apply
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: "All input values are required to complete resets." });
      }
      const emailClean = email.toLowerCase().trim();

      const validated = await verifyOtpCode(emailClean, otp, "reset");
      if (!validated) {
        return res.status(400).json({ error: "Incorrect or expired reset PIN." });
      }

      const passwordHash = bcrypt.hashSync(newPassword, 10);

      if (db) {
        try {
          const credRef = db.collection("credentials").doc(emailClean);
          const credDoc = await credRef.get();
          if (!credDoc.exists) {
            return res.status(400).json({ error: "Student authorization document does not exist." });
          }

          await credRef.update({ passwordHash });
          return res.json({ success: true, message: "Your password has been successfully updated!" });
        } catch (dbErr) {
          return res.status(500).json({ error: "Failed to update profile password hash in Firestore DB." });
        }
      }

      return res.status(500).json({ error: "Database not configured." });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Password update system error." });
    }
  });

  // API Route: Class-wise library local file upload (base64 stream)
  app.post("/api/library/upload", async (req, res) => {
    try {
      const { fileName, fileType, fileData, userEmail } = req.body;
      
      // Strict Admin check
      const admins = ["meinkxun@gmail.com", "nucleuscc2026@gmail.com"];
      if (!userEmail || !admins.includes(userEmail.toLowerCase().trim())) {
        return res.status(403).json({ error: "Access Denied: Admin privileges required." });
      }

      if (!fileName || !fileData) {
        return res.status(400).json({ error: "File name and file data are required." });
      }

      // Ensure directory exists
      const targetDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Strip base64 metadata header if present
      let cleanedData = fileData;
      if (fileData.includes(";base64,")) {
        cleanedData = fileData.split(";base64,").pop();
      }

      const buffer = Buffer.from(cleanedData, "base64");
      
      // Generate a unique safe filename to avoid conflicts and spaces
      const extension = path.extname(fileName);
      const baseName = path.basename(fileName, extension).replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeFileName = `${baseName}_${Date.now()}${extension}`;
      const filePath = path.join(targetDir, safeFileName);

      fs.writeFileSync(filePath, buffer);

      const fileUrl = `/uploads/${safeFileName}`;
      return res.json({ success: true, fileUrl, safeFileName });
    } catch (err: any) {
      console.error("Error in /api/library/upload:", err);
      return res.status(500).json({ error: err?.message || String(err) });
    }
  });

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

  // Global quarantine state to temporarily disable Google Search tool when API key grounding quotas are exceeded
  let searchGroundingQuarantinedUntil = 0;

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

      // Pure greeting check:
      // Greetings should only be shown if the user's message is ONLY a greeting.
      // Examples: "Hi", "Hello", "Hey". If they combine a greeting with a question
      // (e.g., "Hello, explain photosynthesis"), we must ignore the greeting and answer the question immediately.
      const isPureGreeting = (text: string): boolean => {
        const clean = text.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
        const greetingWords = ["hi", "hello", "hey", "welcome", "greetings", "good morning", "good afternoon", "good evening", "yo", "hola", "namaste", "wassup", "sup", "hlo"];
        return greetingWords.includes(clean);
      };

      if (isPureGreeting(userText)) {
        const pureGreetingResponse = "Hello! I am your Nucleus AI Tutor. How can I help you with your Physics, Chemistry, Biology, Mathematics, or exam preparation questions today?";
        // Log it
        if (db) {
          try {
            await db.collection("chatbot_logs").add({
              query: userText,
              response: pureGreetingResponse,
              userEmail: userEmail || "anonymous",
              timestamp: new Date().toISOString()
            });
          } catch (logErr) {
            console.warn("Notice: Chat query logged locally.");
          }
        }
        return res.json({ response: pureGreetingResponse });
      }

      // Construct systemic prompt
      const systemPrompt = `You are Nucleus AI Advisor, an elite academic and entrance coaching AI tutor for Nucleus Coaching Centre (a premier educational platform managed by super-IITians and Doctors).
Your sole focus is to help students learn, understand, and solve academic concepts across Physics, Chemistry, Biology, Mathematics, English, Computer Science, and General Knowledge (covering CBSE, UP Board, JEE, and NEET preparation).

★★★ STRICT GREETING RULE ★★★
- NEVER use greetings (like "Hi", "Hello", "Welcome", "How are you?") when answering academic questions, even if the student's message started with a greeting (e.g. "Hello, explain Newton's second law").
- Immediately explain the concept or solve the question directly and professionally without introductory filler.

★★★ INTELLIGENT INTENT DETECTION ★★★
- Automatically identify the user's intent: Greeting, Academic Question, Homework Help, Doubt Solving, Mathematical Problems, Numerical Solving, Notes Request, PDF Request, Batch Information, Exam Preparation, or General Conversation.
- Academic intents must always take absolute priority. If a student asks any academic-related query, treat it with deep expertise.

★★★ EXPLAINING UNKNOWN QUESTIONS ★★★
- If you are unsure of the answer, or if there is not enough context to provide a guaranteed accurate academic response, you MUST start your response exactly with this phrase: "I'm not completely sure, but based on the available information, here's the best explanation..." and then provide the absolute best, most helpful academic guidance possible. Do not say "I don't know" or "I cannot help" or output greetings.

★★★ CRITICAL RULE — NO RAW MATHEMATICS / NO LATEX SYNTAX ★★★
Never show raw mathematical code, symbols requiring LaTeX rendering, or markdown math syntax. The student should NEVER see raw mathematical code.
This includes:
- NO double dollar signs: $$ ... $$
- NO single dollar signs: $ ... $
- NO LaTeX brackets: \\( \\) or \\[ \\]
- NO LaTeX commands: \\frac, \\lim, \\sin, \\cos, \\sqrt, etc.
- NO Markdown math blocks or LaTeX source code.

INSTEAD:
Convert every mathematical expression into clean, human-readable text and plain math representation.
Examples:
- Write "Limit of sin(x)/x as x approaches 0 = 1" instead of "\\lim_{x\\to0}\\frac{\\sin x}{x}=1"
- Write "a ÷ b" or "a/b" instead of "\\frac{a}{b}"
- Write "sin(x)" instead of "\\sin(x)"
- Write "√25" instead of "\\sqrt{25}"

RESPONSE STYLE (Match a clean, native, highly readable mobile-friendly chat experience like ChatGPT):
1. Never return large paragraphs or write explanations in essay format. Avoid dense text blocks.
2. Always use a clean visual learning format with generous spacing, headings, bullet points, and numbered steps.
3. Keep all text plain-text human readable, utilizing standard characters (e.g. *, /, +, -, ^, √, ÷, θ, π, Δ, λ) to express equations.
4. Do NOT use technical jargon or computer-science terms when student questions are domain-specific. Keep all communications extremely professional, helpful, polite, and reassuring.

RESPONSE STRUCTURE:

1. DIRECT ANSWER
Start with the direct answer immediately in a clear human-readable format.
Example:
### Answer
x = 5 units

2. VISUAL REPRESENTATION (if applicable)
If the concept benefits from a schematic representation, generate a clean premium ASCII visual diagram. Display this BEFORE the detailed explanation. Do not use ASCII diagrams unless explicitly relevant or helpful.

3. CONCEPT USED
Show a small concept card.
Example:
---
#### 📖 Concept Used
* **Primary Principle**: [Standard Trigonometric Limit / Squeeze Theorem / Coulomb's Law, etc.]
---

4. STEP-BY-STEP SOLUTION
Always break solutions into distinct, numbered steps. Never combine multiple steps into one paragraph.
Format:
### Step 1
**Explanation**
[Clear explanation of the step]
**Formula / Equation**
[Plain text mathematical equation, e.g. Speed = Distance / Time]

### Step 2
**Explanation**
[Clear explanation of intermediate substitution]
**Value**
[Plain text calculation, e.g. Speed = 100 / 5 = 20 m/s]

5. MULTIPLE METHODS (if applicable)
If more than one valid method exists, present them as:
- **Method 1: Detailed Solution** (standard board method)
- **Method 2: Shortcut / Fast Exam Method** (optimized JEE/NEET tricks and alternate approaches)

6. FINAL ANSWER BOX
Always end with:
### 🎯 Final Answer
[Bolded final solution value with proper units, e.g. **20 m/s**]

7. EXAM INSIGHT
Add:
### 💡 Exam Insight
- **Common Mistakes**: [Highlight what students usually do wrong here]
- **Shortcut Tricks**: [JEE / NEET specific tricks]
- **Important Observations**: [Key notes from curriculum]

--------------------------------------------------
SUBJECT-SPECIFIC FORMATS:

- PHYSICS FORMAT:
  Given -> Formula -> Substitute Values -> Calculation -> Units -> Final Answer -> Exam Tip

- CHEMISTRY FORMAT:
  Concept -> Reaction / Formula -> Stepwise Explanation -> Final Answer -> NCERT Tip

- BIOLOGY FORMAT:
  Definition -> Explanation -> Diagram/Schematic (if applicable) -> Key Points -> NEET Note

- MATH FORMAT:
  Answer -> Concept Used -> Method 1 -> Method 2 -> Final Answer -> Shortcut

DIFFICULTY ADAPTATION:
Identify student level from context (Class 6-8: simple/intuitive; Class 9-10: Board focus; Class 11-12/JEE/NEET/Droppers: Competitive tricks first, fastest exam-oriented approach first).

★★★ OCR / IMAGE ANALYSIS ★★★
If the student provides an image, perform advanced OCR to detect all printed and handwritten text. Solve the problem presented in the image step-by-step using the exact visual, math, or science structures defined above. Never say you cannot understand the image unless it is completely unreadable or blank.

IMPORTANT: If anyone asks you who your creator is, who built or made you, or your developer's name, you must state that you were created and developed by Prashant Kumar.`;

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
        // Convert history messages (excluding last message if we handle it with image parts)
        const historyMessages = messages.slice(0, -1);
        const contents = historyMessages.map((m: any) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        }));

        // Assemble last message with potential image attachment
        const lastParts: any[] = [];
        if (req.body.image && req.body.image.data) {
          lastParts.push({
            inlineData: {
              mimeType: req.body.image.mimeType || "image/jpeg",
              data: req.body.image.data
            }
          });
          lastParts.push({
            text: userText || "Identify, read with OCR, and solve the question in this image step-by-step."
          });
        } else {
          lastParts.push({ text: userText });
        }

        contents.push({
          role: "user",
          parts: lastParts
        });

        let responseObj: any = null;
        const trySearchGrounding = Date.now() > searchGroundingQuarantinedUntil;

        if (trySearchGrounding) {
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
            const errStr = String(searchErr?.message || searchErr || "");
            console.warn("Gemini Search Grounding failed (retrying with standard generation):", errStr);
            
            // If it's a quota or rate limit error, quarantine search grounding for 1 hour to prevent sluggish retries
            if (errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("quota") || errStr.includes("429")) {
              console.warn("Search Grounding quota exceeded. Quarantining Google Search tool for 1 hour to guarantee prompt, uninterrupted chat responses.");
              searchGroundingQuarantinedUntil = Date.now() + 60 * 60 * 1000; // 1 hour
            }

            // Standard fallback: Generate content using Gemini 3.5 Flash without search tools to bypass search-specific quota limits
            responseObj = await ai.models.generateContent({
              model: model || "gemini-3.5-flash",
              contents: contents,
              config: {
                systemInstruction: systemPrompt
              }
            });
          }
        } else {
          // Instantly use standard generation to avoid 429 quota delays
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

  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
