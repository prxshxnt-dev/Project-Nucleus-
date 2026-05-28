import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Send, Sparkles, BookOpen, Clock, RefreshCw, Trash2, ArrowLeft } from "lucide-react";
import { useLocation } from "react-router-dom";
import Markdown from "react-markdown";
import { useSettingsStore } from "../store/settingsStore";
import { useAuthStore } from "../store/authStore";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "teacher";
  content: string;
  timestamp: Date;
  senderName?: string;
}

export const AIAssistantBot: React.FC = () => {
  const { settings } = useSettingsStore();
  const { user } = useAuthStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userSentMessageRef = useRef(false);
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  const resetSession = async () => {
    if (!sessionId) return;
    const sessionRef = doc(db, "chatbot_sessions", sessionId);
    try {
      await setDoc(sessionRef, {
        userId: user?.uid || "guest",
        userEmail: user?.email || "guest_student@nucleus.edu",
        userDisplayName: user?.displayName || "Guest Student",
        teacherJoined: false,
        unreadByAdmin: false,
        unreadByUser: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: "msg_welcome_" + Date.now(),
            role: "assistant",
            content: "Hello! I am **Highly Targeted Mentorship Ai**, your smart physics & entrance advisor.\n\nHow can I support your study session or mentor queries today?",
            timestamp: new Date().toISOString(),
            senderName: "Highly Targeted Mentorship Ai"
          }
        ]
      });
      setMessages([
        {
          id: "msg_welcome_" + Date.now(),
          role: "assistant",
          content: "Hello! I am **Highly Targeted Mentorship Ai**, your smart physics & entrance advisor.\n\nHow can I support your study session or mentor queries today?",
          timestamp: new Date(),
          senderName: "Highly Targeted Mentorship Ai"
        }
      ]);
    } catch (err) {
      console.error("Failed to reset chatbot session:", err);
    }
  };

  // Check from backend if chatbot is loaded and key is set
  const checkStatus = async () => {
    try {
      const res = await fetch("/api/chatbot/status");
      if (res.ok) {
        const data = await res.json();
        // Enabled if the API key exists or if global settings chatbotEnabled is true
        setIsEnabled(data.enabled || !!settings?.chatbotEnabled);
      }
    } catch (e) {
      console.error("Failed to fetch chatbot assistant backend status:", e);
      // Fallback to client-side Zustand settings
      setIsEnabled(!!settings?.chatbotEnabled);
    } finally {
      setCheckingStatus(false);
    }
  };

  const [sessionId, setSessionId] = useState("");
  const [teacherJoined, setTeacherJoined] = useState(false);

  // Synchronize Session ID
  useEffect(() => {
    let id = "";
    if (user) {
      id = "user_" + user.uid;
    } else {
      let localId = localStorage.getItem("nucleus_assistant_session_id");
      if (!localId) {
        localId = "guest_" + Math.random().toString(36).substring(2, 11);
        localStorage.setItem("nucleus_assistant_session_id", localId);
      }
      id = localId;
    }
    setSessionId(id);
  }, [user?.uid]);

  // Sync with Firestore in real-time
  useEffect(() => {
    if (!sessionId) return;

    const unsub = onSnapshot(doc(db, "chatbot_sessions", sessionId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.messages && Array.isArray(data.messages)) {
          const formatted: ChatMessage[] = data.messages.map((m: any) => ({
            id: m.id || "msg_" + Math.random(),
            role: m.role || "assistant",
            content: m.content || "",
            timestamp: m.timestamp?.seconds
              ? new Date(m.timestamp.seconds * 1000)
              : m.timestamp
                ? new Date(m.timestamp)
                : new Date(),
            senderName: m.senderName || ""
          }));
          setMessages(formatted);
        }
        setTeacherJoined(!!data.teacherJoined);
        // Clear unread state for user since they are reading now
        if (data.unreadByUser) {
          updateDoc(doc(db, "chatbot_sessions", sessionId), { unreadByUser: false }).catch(err => console.error(err));
        }
      } else {
        // Document was deleted - chat ended
        setIsOpen(false);
      }
    });

    return () => unsub();
  }, [sessionId]);

  // Create initial session document in firestore when the chatbot triggers or opens
  useEffect(() => {
    if (!sessionId || !isOpen) return;

    const setupSession = async () => {
      const sessionRef = doc(db, "chatbot_sessions", sessionId);
      try {
        const docSnap = await getDoc(sessionRef);
        if (!docSnap.exists()) {
          await setDoc(sessionRef, {
            userId: user?.uid || "guest",
            userEmail: user?.email || "guest_student@nucleus.edu",
            userDisplayName: user?.displayName || "Guest Student",
            teacherJoined: false,
            unreadByAdmin: false,
            unreadByUser: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [
              {
                id: "msg_welcome",
                role: "assistant",
                content: "Hello! I am **Highly Targeted Mentorship Ai**, your smart physics & entrance advisor.\n\nHow can I support your study session or mentor queries today?",
                timestamp: new Date().toISOString(),
                senderName: "Highly Targeted Mentorship Ai"
              }
            ]
          });
        }
      } catch (err) {
        console.error("Error initializing session in Firestore:", err);
      }
    };

    setupSession();
  }, [sessionId, isOpen]);

  useEffect(() => {
    checkStatus();
  }, [settings?.chatbotEnabled]);

  // Reset chatbot session when user leaves the chat or goes to home menu
  useEffect(() => {
    if (location.pathname === "/" && prevPathRef.current !== "/") {
      resetSession();
      setIsOpen(false);
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  // Reset chatbot session when user closes the chat window
  useEffect(() => {
    if (!isOpen && messages.length > 1) {
      resetSession();
    }
  }, [isOpen]);

  // Passive Smooth Scroll-To-Bottom logic (respects user free scrolling)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (userSentMessageRef.current) {
      // User sent raw input: Snap scroll to bottom
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      userSentMessageRef.current = false;
    } else {
      // Passive flow: only scroll if the user was already looking near the bottom
      const threshold = 160;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
      if (isNearBottom) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }
    }
  }, [messages, isLoading]);

  // Snap to bottom on initial open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const container = scrollContainerRef.current;
        if (container) {
          container.scrollTo({ top: container.scrollHeight });
        }
      }, 100);
    }
  }, [isOpen]);

  // Check if admin/superadmin is logged in to show preview toggle even when disabled
  const isAdminOrSuperAdmin = user?.role === "admin" || user?.role === "superadmin";
  const shouldRenderBot = isEnabled || isAdminOrSuperAdmin;

  if (checkingStatus) return null;
  if (!shouldRenderBot) return null;

  const quickStudySuggestions = [
    { label: "Photoelectric theory", query: "Explain Albert Einstein's photoelectric effect equation clearly." },
    { label: "Sin(x)/x Limit", query: "How do I solve the limit of sin(x)/x when x approaches 0?" },
    { label: "JEE/NEET timing", query: "Can you design a balanced everyday study timetable for Physics?" },
    { label: "Chemistry trick", query: "What are some visual tricks to memorize organic chemistry reactions?" }
  ];

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isLoading) return;

    userSentMessageRef.current = true;

    if (!customText) {
      setInputText("");
    }

    const newUserMessage = {
      id: "msg_" + Date.now(),
      role: "user" as const,
      content: textToSend,
      timestamp: new Date().toISOString(),
      senderName: user?.displayName || "Student"
    };

    // 1. Write student's message to Firestore immediately
    const sessionRef = doc(db, "chatbot_sessions", sessionId);
    try {
      const docSnap = await getDoc(sessionRef);
      if (!docSnap.exists()) {
        await setDoc(sessionRef, {
          userId: user?.uid || "guest",
          userEmail: user?.email || "guest_student@nucleus.edu",
          userDisplayName: user?.displayName || "Guest Student",
          teacherJoined: false,
          unreadByAdmin: true,
          unreadByUser: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [
            {
              id: "msg_welcome",
              role: "assistant" as const,
              content: "Hello! I am **Highly Targeted Mentorship Ai**, your smart physics & entrance advisor.\n\nHow can I support your study session or mentor queries today?",
              timestamp: new Date().toISOString(),
              senderName: "Highly Targeted Mentorship Ai"
            },
            newUserMessage
          ]
        });
      } else {
        await updateDoc(sessionRef, {
          messages: arrayUnion(newUserMessage),
          unreadByAdmin: true,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Failed to sync user message to Firestore:", err);
    }

    // 2. If a teacher has joined the room in real-time, skip the AI chatbot response
    if (teacherJoined) {
      console.log("Teacher is active inside this chat. Skipping AI reply.");
      return;
    }

    // 3. Fallback to active AI completion and store result
    setIsLoading(true);

    try {
      // Build complete context of history
      const historyContext = messages.map(msg => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content
      }));
      historyContext.push({ role: "user", content: textToSend });

      // Build precise local date and time string
      const localTime = new Date().toLocaleString();

      const response = await fetch("/api/chatbot/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: historyContext,
          userEmail: user?.email || "anonymous_student",
          localTime: localTime
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to make chat completion");
      }

      const responseData = await response.json();
      
      const newBotMessage = {
        id: "msg_" + (Date.now() + 1),
        role: "assistant" as const,
        content: responseData.response || "No response received.",
        timestamp: new Date().toISOString(),
        senderName: "Highly Targeted Mentorship Ai"
      };

      await updateDoc(sessionRef, {
        messages: arrayUnion(newBotMessage),
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("AI chatbot query handling error:", err);
      const friendlyMessage = {
        id: "msg_err_" + Date.now(),
        role: "assistant" as const,
        content: `I am happy to assist you! I can answer standard curriculum questions across Physics, Chemistry, Maths, and Biology, or outline optimized JEE/NEET study sequences.

Please type in your question, formula, or topic, and let's solve it step-by-step together!`,
        timestamp: new Date().toISOString(),
        senderName: "Highly Targeted Mentorship Ai"
      };

      await updateDoc(sessionRef, {
        messages: arrayUnion(friendlyMessage),
        updatedAt: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const clearChatHistory = () => {
    if (window.confirm("Are you sure you want to clear your conversation history?")) {
      setMessages([
        {
          id: "msg_welcome_" + Date.now(),
          role: "assistant",
          content: "Chat history cleared. How else can I help you learn today?",
          timestamp: new Date()
        }
      ]);
    }
  };

  return (
    <div className={isOpen ? "fixed inset-0 z-[100] font-sans bg-zinc-950" : "fixed bottom-6 right-6 z-50 font-sans select-none"}>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            id="chatbot-trigger-bubble"
            onClick={() => setIsOpen(true)}
            initial={{ scale: 0, rotate: -45, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, rotate: 45, opacity: 0 }}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-[#E5D2A5] to-[#f5e6c4] text-[#070709] shadow-xl hover:shadow-[#E5D2A5]/10 cursor-pointer border border-[#E5D2A5]/30 group overflow-hidden"
          >
            {settings?.chatbotIconUrl ? (
              <img 
                src={settings.chatbotIconUrl} 
                alt="AI Assistant" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <MessageSquare className="w-6 h-6 transition-transform group-hover:scale-110" />
            )}
            {!isEnabled && isAdminOrSuperAdmin && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 border border-zinc-950 flex items-center justify-center text-[7px] text-white font-bold">
                !
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="chatbot-chat-window"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full flex flex-col bg-zinc-950 text-white select-text overflow-hidden"
          >
            {/* Header / Top bar with Back Button */}
            <div className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-white/10 text-white shadow-md">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-all cursor-pointer border border-white/5 text-xs font-semibold uppercase tracking-wider"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <div className="flex items-center gap-3">
                  <div className="bg-[#070709] w-9 h-9 rounded-xl flex items-center justify-center border border-white/10 overflow-hidden">
                    {settings?.chatbotIconUrl ? (
                      <img 
                        src={settings.chatbotIconUrl} 
                        alt="AI Icon" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Sparkles className="w-5 h-5 text-[#E5D2A5]" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-black flex items-center gap-1.5 tracking-wide text-[#E5D2A5]">
                      <span>NUCLEUS AI ADVISOR</span>
                    </h4>
                    <span className="text-[10px] text-white/50 font-bold tracking-wider leading-none mt-0.5 block uppercase">Ultimate IIT & Medical Mentorship Hub</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close AI Assistant"
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Offline Admin Alert Panel */}
            {!isEnabled && isAdminOrSuperAdmin && (
              <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-2.5 text-xs text-rose-300 flex items-center gap-2 justify-center">
                <span>⚠️ AI Assistant is active for administrators only. To allow other students, save a valid API key in Admin Settings.</span>
              </div>
            )}

            {/* Main Chat Area - Centered Max Width for High-Class Editorial Layout */}
            <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col justify-between overflow-hidden relative">
              
              {/* Messages Body */}
              <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto chatbot-scrollbar px-6 py-6 space-y-6 select-text scroll-smooth overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {messages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div className={`flex items-start gap-3 max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                        
                        {/* Message Avatar */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-white/10 bg-zinc-900">
                          {isUser ? (
                            <div className="w-full h-full bg-[#E5D2A5]/20 flex items-center justify-center text-xs font-bold text-[#E5D2A5]">
                              {user?.email?.slice(0, 2).toUpperCase() || "US"}
                            </div>
                          ) : (
                            settings?.chatbotIconUrl ? (
                              <img 
                                src={settings.chatbotIconUrl} 
                                alt="AI Avatar" 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Sparkles className="w-4 h-4 text-[#E5D2A5]" />
                            )
                          )}
                        </div>

                        {/* Content Card */}
                        <div
                          className={`rounded-2xl px-5 py-3.5 text-sm select-text leading-relaxed shadow-lg ${
                            isUser
                              ? "bg-[#E5D2A5] text-zinc-950 font-semibold rounded-tr-none"
                              : "bg-zinc-900/90 border border-white/5 text-zinc-100 rounded-tl-none"
                          }`}
                        >
                          {isUser ? (
                            <div className="whitespace-pre-wrap select-text">{msg.content}</div>
                          ) : (
                            <div className="markdown-body select-text text-zinc-200">
                              <Markdown>{msg.content}</Markdown>
                            </div>
                          )}
                          <span className={`text-[9px] mt-2 block text-right select-none opacity-40 font-mono ${isUser ? "text-zinc-950" : "text-zinc-500"}`}>
                            {msg.timestamp.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-3 max-w-[85%]">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-white/15 bg-zinc-900">
                        {settings?.chatbotIconUrl ? (
                          <img 
                            src={settings.chatbotIconUrl} 
                            alt="AI Avatar" 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Sparkles className="w-4 h-4 text-[#E5D2A5]" />
                        )}
                      </div>
                      <div className="bg-zinc-900 border border-white/5 rounded-2xl rounded-tl-none px-5 py-3.5 text-sm">
                        <div className="flex items-center gap-1.5 py-1">
                          <span className="w-2 h-2 rounded-full bg-[#E5D2A5] animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 rounded-full bg-[#E5D2A5] animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 rounded-full bg-[#E5D2A5] animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestions & Quick Prompts banner inside Fullscreen Panel */}
              {messages.length <= 2 && (
                <div className="px-6 py-4 border-t border-white/5 bg-zinc-900/50">
                  <span className="text-xs text-white/50 block mb-2 font-bold uppercase tracking-wider">⚡ Highly Targeted Mentorship Ai</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {quickStudySuggestions.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => handleSendMessage(s.query)}
                        className="px-4 py-3 text-xs bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 hover:border-white/10 rounded-xl transition-all cursor-pointer text-left flex items-start justify-between group"
                      >
                        <span className="line-clamp-1">{s.label}</span>
                        <Sparkles className="w-3.5 h-3.5 text-[#E5D2A5] opacity-30 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* In-chat Controls and input positioned inside centered panel */}
              <div className="p-4 border-t border-white/10 bg-zinc-900/40 flex items-center gap-3 backdrop-blur-md rounded-b-2xl">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask any JEE/NEET equations, cellular structures, physical systems formulas, or coaching advice..."
                  disabled={isLoading}
                  className="flex-1 px-5 py-3.5 text-sm bg-zinc-950 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#E5D2A5] disabled:opacity-50"
                  autoFocus
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isLoading}
                  className="p-4 rounded-xl bg-[#E5D2A5] text-zinc-950 hover:bg-[#f4ecd8] disabled:opacity-50 transition-all cursor-pointer shadow-lg active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
