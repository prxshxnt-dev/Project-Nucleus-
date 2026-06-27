import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, X, Send, Sparkles, BookOpen, Clock, 
  Trash2, ArrowLeft, Paperclip, Check, ChevronRight, 
  User, PlusCircle, HelpCircle, AlertCircle, FileText, 
  CheckCircle, Flame, MessageCircle, BarChart, Image as ImageIcon,
  CheckSquare, MessageSquareCode
} from "lucide-react";
import { useLocation } from "react-router-dom";
import Markdown from "react-markdown";
import { useSettingsStore } from "../store/settingsStore";
import { useAuthStore } from "../store/authStore";
import { 
  doc, getDoc, setDoc, updateDoc, arrayUnion, onSnapshot, 
  collection, query, where, orderBy, addDoc 
} from "firebase/firestore";
import { db } from "../lib/firebase";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "teacher" | "system";
  content: string;
  timestamp: Date;
  senderName?: string;
  attachmentUrl?: string;
}

interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "student" | "teacher" | "system";
  content: string;
  attachmentUrl?: string;
  timestamp: string;
}

interface SupportTicket {
  id: string; // Document ID
  ticketId: string; // e.g., NUC-TKT-1234
  studentId: string;
  studentName: string;
  studentEmail: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  title: string;
  question: string;
  attachmentUrl?: string;
  status: "pending" | "in_progress" | "resolved" | "closed";
  assignedTeacherId: string | null;
  assignedTeacherName: string | null;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

const QnaBotLogo: React.FC<{ className?: string }> = ({ className = "w-7 h-7" }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="30" height="24" rx="8" fill="#18181B" stroke="#E5D2A5" strokeWidth="2.5" />
    <path d="M12 30L6 36V30H12Z" fill="#18181B" stroke="#E5D2A5" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M15 13C15 11.5 16.2 10.5 18 10.5C19.8 10.5 21 11.5 21 13C21 14.8 19.3 15.6 18.5 16.5C17.7 17.4 17.7 18.2 17.7 19.5" stroke="#E5D2A5" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="17.7" cy="23.5" r="1.5" fill="#E5D2A5" />
    <rect x="22" y="18" width="22" height="20" rx="6" fill="#E5D2A5" stroke="#18181B" strokeWidth="2" />
    <path d="M30 18L30 15M36 18L36 15" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
    <circle cx="28" cy="26" r="1.5" fill="#18181B" />
    <circle cx="38" cy="26" r="1.5" fill="#18181B" />
    <path d="M31 31C32 32 34 32 35 31" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const AIAssistantBot: React.FC = () => {
  const { settings } = useSettingsStore();
  const { user } = useAuthStore();
  const location = useLocation();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<"ai_tutor" | "teacher_tickets">("ai_tutor");
  
  // AI Tutor state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [sessionId, setSessionId] = useState("");
  const [ocrImage, setOcrImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [ocrImagePreview, setOcrImagePreview] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<{ [msgId: string]: "yes" | "no" }>({});
  
  // Teacher support / Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [ticketInputText, setTicketInputText] = useState("");
  const [ticketImage, setTicketImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [ticketImagePreview, setTicketImagePreview] = useState<string | null>(null);
  const [sendingTicketMsg, setSendingTicketMsg] = useState(false);
  
  // Ticket Creation Form Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formClassId, setFormClassId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formChapterId, setFormChapterId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formQuestion, setFormQuestion] = useState("");
  const [formImage, setFormImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Firestore DB options loaded dynamically
  const [classList, setClassList] = useState<any[]>([]);
  const [subjectList, setSubjectList] = useState<any[]>([]);
  const [chapterList, setChapterList] = useState<any[]>([]);
  const [isTeacherChatEnabled, setIsTeacherChatEnabled] = useState(true);

  const finalClassList = classList.length > 0 ? classList : [
    { id: "class_10", name: "Class 10" },
    { id: "class_11", name: "Class 11" },
    { id: "class_12", name: "Class 12" }
  ];

  const finalSubjectList = subjectList.length > 0 ? subjectList : [
    { id: "sub_physics", name: "Physics" },
    { id: "sub_chemistry", name: "Chemistry" },
    { id: "sub_maths", name: "Mathematics" }
  ];

  const finalChapterList = chapterList.length > 0 ? chapterList : [
    // Physics chapters
    { id: "chap_mechanics", name: "Classical Mechanics", subjectId: "sub_physics" },
    { id: "chap_electrodynamics", name: "Electrodynamics", subjectId: "sub_physics" },
    { id: "chap_optics", name: "Optics & Atoms", subjectId: "sub_physics" },
    // Chemistry chapters
    { id: "chap_organic", name: "Organic Chemistry", subjectId: "sub_chemistry" },
    { id: "chap_inorganic", name: "Inorganic Chemistry", subjectId: "sub_chemistry" },
    { id: "chap_physical", name: "Physical Chemistry", subjectId: "sub_chemistry" },
    // Mathematics chapters
    { id: "chap_calculus", name: "Calculus", subjectId: "sub_maths" },
    { id: "chap_algebra", name: "Algebra", subjectId: "sub_maths" },
    { id: "chap_coordinate", name: "Coordinate Geometry", subjectId: "sub_maths" },
  ];

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const ticketScrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ticketFileInputRef = useRef<HTMLInputElement>(null);
  const formFileInputRef = useRef<HTMLInputElement>(null);
  const userSentMessageRef = useRef(false);
  const prevPathRef = useRef(location.pathname);

  // Check from backend if chatbot is loaded and key is set
  const checkStatus = async () => {
    try {
      const res = await fetch("/api/chatbot/status");
      if (res.ok) {
        const data = await res.json();
        setIsEnabled(data.enabled || !!settings?.chatbotEnabled);
      }
    } catch (e) {
      console.error("Failed to fetch chatbot status:", e);
      setIsEnabled(!!settings?.chatbotEnabled);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Sync Global Settings (including Teacher Chat enablement)
  useEffect(() => {
    const unsubGlobal = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.teacherChatEnabled !== undefined) {
          setIsTeacherChatEnabled(d.teacherChatEnabled);
        }
      }
    });
    return () => unsubGlobal();
  }, []);

  // Sync Categories from database
  useEffect(() => {
    if (!isOpen && !isFormOpen) return;
    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      setClassList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubSubjects = onSnapshot(collection(db, "subjects"), (snap) => {
      setSubjectList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubChapters = onSnapshot(collection(db, "chapters"), (snap) => {
      setChapterList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubClasses();
      unsubSubjects();
      unsubChapters();
    };
  }, [isOpen, isFormOpen]);

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

  // Sync AI Chat Messages in real-time
  useEffect(() => {
    if (!sessionId || !isOpen) return;

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
            senderName: m.senderName || "",
            attachmentUrl: m.attachmentUrl || ""
          }));
          setMessages(formatted);
        }
        if (data.unreadByUser) {
          updateDoc(doc(db, "chatbot_sessions", sessionId), { unreadByUser: false }).catch(err => console.error(err));
        }
      }
    });

    return () => unsub();
  }, [sessionId, isOpen]);

  // Sync Student's Support Tickets in real-time
  useEffect(() => {
    if (!user || !isOpen) return;

    const q = query(
      collection(db, "support_tickets"),
      where("studentId", "==", user.uid)
    );

    const unsubTickets = onSnapshot(q, (snapshot) => {
      const list: SupportTicket[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as SupportTicket);
      });
      // Sort by creation time descending
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTickets(list);
    });

    return () => unsubTickets();
  }, [user, isOpen]);

  // Sync Currently Selected Support Ticket Chat
  useEffect(() => {
    if (!selectedTicketId) {
      setActiveTicket(null);
      return;
    }

    const unsubTicket = onSnapshot(doc(db, "support_tickets", selectedTicketId), (snapshot) => {
      if (snapshot.exists()) {
        setActiveTicket({ id: snapshot.id, ...snapshot.data() } as SupportTicket);
      }
    });

    return () => unsubTicket();
  }, [selectedTicketId]);

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
                content: "Hello! I am **Nucleus AI Advisor**, your premium learning companion & entrance exam mentor.\n\nHow can I support your study session or help you solve interactive problems today?",
                timestamp: new Date().toISOString(),
                senderName: "Nucleus AI Advisor"
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

  // Passive Smooth Scroll-To-Bottom logic
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (userSentMessageRef.current) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      userSentMessageRef.current = false;
    } else {
      const threshold = 160;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
      if (isNearBottom) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const container = ticketScrollContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [activeTicket?.messages]);

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
            content: "Hello! I am **Nucleus AI Advisor**, your premium learning companion & entrance exam mentor.\n\nHow can I support your study session or help you solve interactive problems today?",
            timestamp: new Date().toISOString(),
            senderName: "Nucleus AI Advisor"
          }
        ]
      });
      setMessages([
        {
          id: "msg_welcome_" + Date.now(),
          role: "assistant",
          content: "Hello! I am **Nucleus AI Advisor**, your premium learning companion & entrance exam mentor.\n\nHow can I support your study session or help you solve interactive problems today?",
          timestamp: new Date(),
          senderName: "Nucleus AI Advisor"
        }
      ]);
    } catch (err) {
      console.error("Failed to reset chatbot session:", err);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: "ocr" | "ticket" | "form") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Only image files are supported for OCR and uploads.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const rawBase64 = (reader.result as string).split(",")[1];
      const previewUrl = reader.result as string;

      if (target === "ocr") {
        setOcrImage({ mimeType: file.type, data: rawBase64 });
        setOcrImagePreview(previewUrl);
      } else if (target === "ticket") {
        setTicketImage({ mimeType: file.type, data: rawBase64 });
        setTicketImagePreview(previewUrl);
      } else if (target === "form") {
        setFormImage({ mimeType: file.type, data: rawBase64 });
        setFormImagePreview(previewUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend && !ocrImage) return;

    userSentMessageRef.current = true;
    setInputText("");

    const imagePayloadToSend = ocrImage;
    const imagePreviewToClear = ocrImagePreview;

    setOcrImage(null);
    setOcrImagePreview(null);

    const newUserMessage: ChatMessage = {
      id: "msg_" + Date.now(),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
      senderName: user?.displayName || "Student",
      attachmentUrl: imagePreviewToClear || undefined
    };

    // 1. Write student's message to Firestore immediately
    const sessionRef = doc(db, "chatbot_sessions", sessionId);
    try {
      const docSnap = await getDoc(sessionRef);
      const serializedMsg = {
        ...newUserMessage,
        timestamp: newUserMessage.timestamp.toISOString()
      };

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
              role: "assistant",
              content: "Hello! I am **Nucleus AI Advisor**, your premium learning companion.\n\nHow can I help you today?",
              timestamp: new Date().toISOString(),
              senderName: "Nucleus AI Advisor"
            },
            serializedMsg
          ]
        });
      } else {
        await updateDoc(sessionRef, {
          messages: arrayUnion(serializedMsg),
          unreadByAdmin: true,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Failed to sync user message to Firestore:", err);
    }

    setIsLoading(true);

    try {
      // Build complete context of history
      const historyContext = messages.map(msg => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content
      }));
      historyContext.push({ role: "user", content: textToSend });

      const response = await fetch("/api/chatbot/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: historyContext,
          userEmail: user?.email || "anonymous_student",
          localTime: new Date().toLocaleString(),
          image: imagePayloadToSend ? {
            mimeType: imagePayloadToSend.mimeType,
            data: imagePayloadToSend.data
          } : undefined
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
        senderName: "Nucleus AI Advisor"
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
        content: `I'm not completely sure, but based on the available information, here's the best explanation: I encountered an error connecting to my AI core. Let's make sure the connection is solid or please try typing your query again!`,
        timestamp: new Date().toISOString(),
        senderName: "Nucleus AI Advisor"
      };

      await updateDoc(sessionRef, {
        messages: arrayUnion(friendlyMessage),
        updatedAt: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (msgId: string, helpful: "yes" | "no") => {
    setFeedbackGiven(prev => ({ ...prev, [msgId]: helpful }));

    // Send a system log to Firestore session if desired
    const sessionRef = doc(db, "chatbot_sessions", sessionId);
    try {
      await updateDoc(sessionRef, {
        [`feedback.${msgId}`]: helpful,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Error logging feedback:", e);
    }

    if (helpful === "no") {
      // Find associated query to pre-fill
      const msgIndex = messages.findIndex(m => m.id === msgId);
      let queryToPrefill = "";
      if (msgIndex > 0) {
        queryToPrefill = messages[msgIndex - 1].content;
      }
      
      // Auto-trigger Escalation Modal with pre-filled doubt
      handleOpenTicketForm(queryToPrefill);
    }
  };

  const handleOpenTicketForm = (prefilledQuery?: string) => {
    if (!user) {
      alert("Please log in to chat with a real teacher.");
      return;
    }
    setFormName(user.displayName || "Student");
    setFormEmail(user.email || "");
    setFormQuestion(prefilledQuery || "");
    setFormTitle(prefilledQuery ? `Doubt on: ${prefilledQuery.slice(0, 35)}...` : "");
    setIsFormOpen(true);
  };

  const handleCreateSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmittingTicket(true);
    try {
      const ticketNum = Math.floor(1000 + Math.random() * 9000);
      const generatedTicketId = `NUC-TKT-${ticketNum}`;

      const selectedClassObj = finalClassList.find(c => c.id === formClassId);
      const selectedSubjObj = finalSubjectList.find(s => s.id === formSubjectId);
      const selectedChapObj = finalChapterList.find(c => c.id === formChapterId);

      const ticketPayload: Omit<SupportTicket, "id"> = {
        ticketId: generatedTicketId,
        studentId: user.uid,
        studentName: formName,
        studentEmail: formEmail,
        classId: formClassId,
        className: selectedClassObj ? selectedClassObj.name : "Unspecified Class",
        subjectId: formSubjectId,
        subjectName: selectedSubjObj ? selectedSubjObj.name : "Unspecified Subject",
        chapterId: formChapterId,
        chapterName: selectedChapObj ? selectedChapObj.name : "General Topic",
        title: formTitle || "Academic Doubt Help",
        question: formQuestion,
        attachmentUrl: formImagePreview || undefined,
        status: "pending",
        assignedTeacherId: null,
        assignedTeacherName: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: "msg_init_" + Date.now(),
            senderId: "system",
            senderName: "Nucleus Helpdesk",
            senderRole: "system",
            content: `Ticket ${generatedTicketId} has been created successfully. An expert teacher specialized in **${selectedSubjObj ? selectedSubjObj.name : "General"}** will join you shortly to clear this doubt.`,
            timestamp: new Date().toISOString()
          },
          {
            id: "msg_student_init_" + Date.now(),
            senderId: user.uid,
            senderName: formName,
            senderRole: "student",
            content: `**Doubt Topic**: ${formQuestion}`,
            attachmentUrl: formImagePreview || undefined,
            timestamp: new Date().toISOString()
          }
        ]
      };

      const docRef = await addDoc(collection(db, "support_tickets"), ticketPayload);
      setIsFormOpen(false);
      
      // Clear form
      setFormClassId("");
      setFormSubjectId("");
      setFormChapterId("");
      setFormTitle("");
      setFormQuestion("");
      setFormImage(null);
      setFormImagePreview(null);

      // Select this ticket and switch to tickets list
      setSelectedTicketId(docRef.id);
      setActiveTab("teacher_tickets");
    } catch (err: any) {
      console.error("Failed to create support ticket:", err);
      alert("Error submitting doubt request: " + err.message);
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleSendTicketMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || (!ticketInputText.trim() && !ticketImagePreview)) return;

    setSendingTicketMsg(true);
    try {
      const newMessage: TicketMessage = {
        id: "msg_tkt_" + Date.now(),
        senderId: user?.uid || "guest_student",
        senderName: user?.displayName || "Student",
        senderRole: "student",
        content: ticketInputText.trim(),
        attachmentUrl: ticketImagePreview || undefined,
        timestamp: new Date().toISOString()
      };

      const ticketRef = doc(db, "support_tickets", selectedTicketId);
      await updateDoc(ticketRef, {
        messages: arrayUnion(newMessage),
        status: activeTicket?.status === "pending" ? "pending" : "in_progress",
        updatedAt: new Date().toISOString()
      });

      setTicketInputText("");
      setTicketImage(null);
      setTicketImagePreview(null);
    } catch (err) {
      console.error("Failed to send ticket message:", err);
    } finally {
      setSendingTicketMsg(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicketId) return;
    if (window.confirm("Mark this doubt as Resolved? This will notify your teacher.")) {
      try {
        const ticketRef = doc(db, "support_tickets", selectedTicketId);
        
        const systemMsg: TicketMessage = {
          id: "msg_sys_resolved_" + Date.now(),
          senderId: "system",
          senderName: "Nucleus Helpdesk",
          senderRole: "system",
          content: "✅ Student marked this ticket as **Resolved**. Thank you for using Nucleus faculty support!",
          timestamp: new Date().toISOString()
        };

        await updateDoc(ticketRef, {
          status: "resolved",
          messages: arrayUnion(systemMsg),
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const clearOcrImage = () => {
    setOcrImage(null);
    setOcrImagePreview(null);
  };

  // Drag and drop image handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please drop an image file.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setOcrImage({ mimeType: file.type, data: (reader.result as string).split(",")[1] });
        setOcrImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const quickStudySuggestions = [
    { label: "Photoelectric theory", query: "Explain Albert Einstein's photoelectric effect equation clearly." },
    { label: "Sin(x)/x Limit", query: "How do I solve the limit of sin(x)/x when x approaches 0?" },
    { label: "JEE/NEET timing", query: "Can you design a balanced everyday study timetable for Physics?" },
    { label: "Chemistry trick", query: "What are some visual tricks to memorize organic chemistry reactions?" }
  ];

  const isAdminOrSuperAdmin = user?.role === "admin" || user?.role === "superadmin";
  const shouldRenderBot = isEnabled || isAdminOrSuperAdmin;

  if (checkingStatus) return null;
  if (!shouldRenderBot) return null;

  return (
    <div className={isOpen ? "fixed inset-0 z-[100] font-sans bg-zinc-950" : "fixed bottom-28 right-6 z-50 font-sans select-none md:bottom-[104px] md:right-8"}>
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
              <QnaBotLogo className="w-7 h-7 text-zinc-900 transition-transform group-hover:scale-110" />
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
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* Header / Top bar with Tab Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 bg-zinc-900 border-b border-white/10 text-white shadow-md gap-3">
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
                      <QnaBotLogo className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-black flex items-center gap-1.5 tracking-wide text-[#E5D2A5]">
                      <span>NUCLEUS AI TUTOR</span>
                    </h4>
                    <span className="text-[10px] text-white/50 font-bold tracking-wider leading-none mt-0.5 block uppercase">Ultimate IIT & Medical Mentorship Hub</span>
                  </div>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 shrink-0 self-start sm:self-auto">
                <button
                  onClick={() => setActiveTab("ai_tutor")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "ai_tutor"
                      ? "bg-[#E5D2A5] text-zinc-950 font-bold"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Tutor</span>
                </button>
                {isTeacherChatEnabled && (
                  <button
                    onClick={() => setActiveTab("teacher_tickets")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "teacher_tickets"
                        ? "bg-[#E5D2A5] text-zinc-950 font-bold"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Teacher Support</span>
                    {tickets.some(t => t.status === "in_progress") && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Offline Admin Alert Panel */}
            {!isEnabled && isAdminOrSuperAdmin && (
              <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-2 py-2 text-[11px] text-rose-300 flex items-center gap-2 justify-center">
                <span>⚠️ AI Assistant is active for administrators only. Save a valid API key in Admin Settings to unlock for students.</span>
              </div>
            )}

            {/* MAIN WORKSPACE VIEW */}
            <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col justify-between overflow-hidden relative">

              {/* TAB 1: AI TUTOR */}
              {activeTab === "ai_tutor" && (
                <div className="flex-1 flex flex-col justify-between overflow-hidden">
                  
                  {/* Messages list */}
                  <div 
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto chatbot-scrollbar px-6 py-6 space-y-6 select-text scroll-smooth bg-[#FAF8F5] overscroll-contain"
                  >
                    {messages.map((msg, idx) => {
                      const isUser = msg.role === "user";
                      return (
                        <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                          <div className={`flex items-start gap-3 max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                            
                            {/* Avatar */}
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
                                  <QnaBotLogo className="w-5 h-5" />
                                )
                              )}
                            </div>

                            {/* Text Bubble */}
                            <div className="flex flex-col gap-1">
                              <div
                                className={`rounded-2xl px-5 py-3.5 text-sm select-text leading-relaxed shadow-lg ${
                                  isUser
                                    ? "bg-[#E5D2A5] text-zinc-950 font-semibold rounded-tr-none"
                                    : "bg-zinc-900/90 border border-white/5 text-zinc-100 rounded-tl-none"
                                }`}
                              >
                                {msg.attachmentUrl && (
                                  <div className="mb-3 max-w-sm rounded-xl overflow-hidden border border-white/10">
                                    <img src={msg.attachmentUrl} alt="OCR Upload" className="w-full h-auto object-contain max-h-48" />
                                  </div>
                                )}
                                {isUser ? (
                                  <div className="whitespace-pre-wrap select-text">{msg.content}</div>
                                ) : (
                                  <div className="markdown-body select-text text-zinc-200">
                                    <Markdown>{msg.content}</Markdown>
                                  </div>
                                )}
                                <span className={`text-[9px] mt-2 block text-right select-none opacity-40 font-mono ${isUser ? "text-zinc-950" : "text-zinc-500"}`}>
                                  {msg.timestamp instanceof Date ? msg.timestamp.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : new Date(msg.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                </span>
                              </div>

                              {/* HELP QUESTION FEEDBACK LOOP - ONLY SHOW ON BOT MESSAGES */}
                              {!isUser && msg.id !== "msg_welcome" && (
                                <div className="flex items-center gap-3 mt-1.5 px-2 text-xs">
                                  <span className="text-zinc-400">Did this solve your doubt?</span>
                                  <button
                                    onClick={() => handleFeedback(msg.id, "yes")}
                                    className={`px-2 py-1 rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                                      feedbackGiven[msg.id] === "yes"
                                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                                        : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10"
                                    }`}
                                    disabled={!!feedbackGiven[msg.id]}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Yes</span>
                                  </button>
                                  <button
                                    onClick={() => handleFeedback(msg.id, "no")}
                                    className={`px-2 py-1 rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                                      feedbackGiven[msg.id] === "no"
                                        ? "bg-rose-500/20 text-rose-400 border-rose-500/30 font-semibold"
                                        : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10"
                                    }`}
                                    disabled={!!feedbackGiven[msg.id]}
                                  >
                                    <MessageSquareCode className="w-3.5 h-3.5" />
                                    <span>No, Ask Teacher</span>
                                  </button>
                                </div>
                              )}
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
                              <QnaBotLogo className="w-5 h-5" />
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

                  {/* Quick Prompts Suggestions */}
                  {messages.length <= 2 && (
                    <div className="px-6 py-4 border-t border-white/5 bg-zinc-900/50 shrink-0">
                      <span className="text-xs text-white/50 block mb-2 font-bold uppercase tracking-wider">⚡ Quick Study Prompts</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {quickStudySuggestions.map((s) => (
                          <button
                            key={s.label}
                            onClick={() => handleSendMessage(s.query)}
                            className="px-4 py-2.5 text-xs bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 hover:border-white/10 rounded-xl transition-all cursor-pointer text-left flex items-start justify-between group"
                          >
                            <span className="line-clamp-1">{s.label}</span>
                            <Sparkles className="w-3.5 h-3.5 text-[#E5D2A5] opacity-30 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* OCR Drag overlay hint */}
                  {ocrImagePreview && (
                    <div className="px-6 py-3 bg-zinc-900 border-t border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 relative shrink-0">
                          <img src={ocrImagePreview} alt="OCR Preview" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-zinc-300 block">Multimodal Image Selected</span>
                          <span className="text-[10px] text-zinc-500">AI will perform OCR & solve step-by-step.</span>
                        </div>
                      </div>
                      <button 
                        onClick={clearOcrImage} 
                        className="p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Input controls */}
                  <div className="p-4 border-t border-white/10 bg-zinc-900/40 flex items-center gap-3 backdrop-blur-md shrink-0">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload homework/textbook picture for OCR solving"
                      className="p-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 transition-all cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 text-[#E5D2A5]" />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={(e) => handleImageFileChange(e, "ocr")} 
                      accept="image/*" 
                      className="hidden" 
                    />

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Ask any IIT-JEE/NEET equations, formulas, biology doubts, or upload textbook pictures..."
                      disabled={isLoading}
                      className="flex-1 px-5 py-3.5 text-sm bg-zinc-950 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#E5D2A5] disabled:opacity-50"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={(!inputText.trim() && !ocrImage) || isLoading}
                      className="p-4 rounded-xl bg-[#E5D2A5] text-zinc-950 hover:bg-[#f4ecd8] disabled:opacity-50 transition-all cursor-pointer shadow-lg active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              )}

              {/* TAB 2: TEACHER SUPPORT */}
              {activeTab === "teacher_tickets" && (
                <div className="flex-1 flex flex-col justify-between overflow-hidden">
                  
                  {/* IF A SPECIFIC TICKET IS SELECTED */}
                  {selectedTicketId && activeTicket ? (
                    <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#FAF8F5]">
                      
                      {/* Ticket Header */}
                      <div className="px-6 py-3 bg-zinc-900 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setSelectedTicketId(null)}
                            className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold bg-[#E5D2A5]/10 text-[#E5D2A5] px-1.5 py-0.5 rounded border border-[#E5D2A5]/20">
                                {activeTicket.ticketId}
                              </span>
                              <h5 className="text-sm font-bold text-white line-clamp-1">{activeTicket.title}</h5>
                            </div>
                            <span className="text-[10px] text-zinc-400 block mt-0.5">
                              Subject: <strong>{activeTicket.subjectName}</strong> &bull; Chapter: <strong>{activeTicket.chapterName}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Status controls / Assigned teacher */}
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded ${
                            activeTicket.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                            activeTicket.status === "in_progress" ? "bg-blue-500/20 text-blue-400 animate-pulse" :
                            activeTicket.status === "resolved" ? "bg-green-500/20 text-green-400" :
                            "bg-zinc-500/20 text-zinc-400"
                          }`}>
                            {activeTicket.status}
                          </span>
                          
                          {activeTicket.status !== "resolved" && activeTicket.status !== "closed" && (
                            <button
                              onClick={handleResolveTicket}
                              className="px-2.5 py-1 rounded-lg bg-green-500 text-zinc-950 hover:bg-green-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Resolve</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Ticket Assigned Mentor Card */}
                      <div className="px-6 py-2 bg-zinc-900/40 border-b border-white/5 flex items-center justify-between text-xs text-zinc-300">
                        <span>Assigned Faculty:</span>
                        <span className="font-semibold text-[#E5D2A5]">
                          {activeTicket.assignedTeacherName || "Awaiting Faculty Assignment..."}
                        </span>
                      </div>

                      {/* Ticket Chat Messages Body */}
                      <div 
                        ref={ticketScrollContainerRef}
                        className="flex-1 overflow-y-auto px-6 py-6 space-y-6 select-text chatbot-scrollbar overscroll-contain"
                      >
                        {activeTicket.messages.map((msg) => {
                          const isSys = msg.senderRole === "system";
                          const isStudent = msg.senderRole === "student";
                          
                          if (isSys) {
                            return (
                              <div key={msg.id} className="flex justify-center">
                                <div className="px-4 py-2 rounded-xl bg-zinc-900/50 border border-white/5 text-zinc-400 text-xs font-semibold max-w-lg text-center flex items-center gap-2">
                                  <AlertCircle className="w-3.5 h-3.5 text-[#E5D2A5]" />
                                  <span>{msg.content}</span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={msg.id} className={`flex ${isStudent ? "justify-end" : "justify-start"}`}>
                              <div className={`flex items-start gap-3 max-w-[85%] ${isStudent ? "flex-row-reverse" : "flex-row"}`}>
                                
                                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-white/10 bg-zinc-900">
                                  {isStudent ? (
                                    <div className="w-full h-full bg-[#E5D2A5]/20 flex items-center justify-center text-xs font-bold text-[#E5D2A5]">
                                      ST
                                    </div>
                                  ) : (
                                    <div className="w-full h-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
                                      TR
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] text-zinc-500 px-1">
                                    {msg.senderName} ({msg.senderRole})
                                  </span>
                                  <div
                                    className={`rounded-2xl px-5 py-3 text-sm select-text leading-relaxed shadow-md ${
                                      isStudent
                                        ? "bg-[#E5D2A5] text-zinc-950 font-semibold rounded-tr-none"
                                        : "bg-zinc-900 text-zinc-100 border border-white/5 rounded-tl-none"
                                    }`}
                                  >
                                    {msg.attachmentUrl && (
                                      <div className="mb-3 max-w-sm rounded-xl overflow-hidden border border-white/10">
                                        <img src={msg.attachmentUrl} alt="Attached Doubt" className="w-full h-auto object-contain max-h-48" />
                                      </div>
                                    )}
                                    <div className="whitespace-pre-wrap select-text">{msg.content}</div>
                                    <span className={`text-[8px] mt-1.5 block text-right select-none opacity-40 font-mono ${isStudent ? "text-zinc-950" : "text-zinc-500"}`}>
                                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                    </span>
                                  </div>
                                </div>

                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Ticket Upload attachment banner */}
                      {ticketImagePreview && (
                        <div className="px-6 py-2 bg-zinc-900 border-t border-white/10 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 relative shrink-0">
                              <img src={ticketImagePreview} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-xs font-semibold text-zinc-300">File attached to query response</span>
                          </div>
                          <button 
                            onClick={() => { setTicketImage(null); setTicketImagePreview(null); }} 
                            className="p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Ticket Send Controls */}
                      <form onSubmit={handleSendTicketMessage} className="p-4 border-t border-white/10 bg-zinc-900/40 flex items-center gap-3 backdrop-blur-md">
                        <button
                          type="button"
                          onClick={() => ticketFileInputRef.current?.click()}
                          title="Attach additional image or workbook photograph"
                          className="p-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 transition-all cursor-pointer"
                        >
                          <Paperclip className="w-4 h-4 text-[#E5D2A5]" />
                        </button>
                        <input 
                          type="file" 
                          ref={ticketFileInputRef} 
                          onChange={(e) => handleImageFileChange(e, "ticket")} 
                          accept="image/*" 
                          className="hidden" 
                        />

                        <input
                          type="text"
                          value={ticketInputText}
                          onChange={(e) => setTicketInputText(e.target.value)}
                          placeholder={
                            activeTicket.status === "resolved" || activeTicket.status === "closed"
                              ? "This doubt is resolved. Reopen by typing a message..."
                              : "Reply to your expert teacher..."
                          }
                          className="flex-1 px-5 py-3.5 text-sm bg-zinc-950 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#E5D2A5]"
                        />
                        <button
                          type="submit"
                          disabled={(!ticketInputText.trim() && !ticketImagePreview) || sendingTicketMsg}
                          className="p-4 rounded-xl bg-[#E5D2A5] text-zinc-950 hover:bg-[#f4ecd8] disabled:opacity-50 transition-all cursor-pointer shadow-lg"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>

                    </div>
                  ) : (
                    /* TICKETS DIRECTORY INDEX */
                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-[#FAF8F5] select-text">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xl font-bold text-zinc-900">Academic Doubt Support</h4>
                          <p className="text-xs text-zinc-500 mt-1">Chat live with senior faculty & medical/IIT experts from Nucleus Coaching classes.</p>
                        </div>
                        <button
                          onClick={() => handleOpenTicketForm()}
                          className="px-4 py-2.5 rounded-xl bg-[var(--primary-custom,#4F46E5)] text-white hover:bg-[var(--primary-custom,#4F46E5)]/90 text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-500/10 cursor-pointer"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>Submit Doubt</span>
                        </button>
                      </div>

                      {tickets.length === 0 ? (
                        <div className="border border-zinc-200/60 p-12 rounded-2xl bg-white text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
                          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                            <HelpCircle className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="font-bold text-zinc-800 text-sm block">No Active Support Tickets</span>
                            <span className="text-xs text-zinc-500 block mt-1">If the AI Tutor cannot solve a specific JEE/NEET doubt, you can connect directly with expert teachers.</span>
                          </div>
                          <button
                            onClick={() => handleOpenTicketForm()}
                            className="px-4 py-2 rounded-xl bg-zinc-900 text-[#E5D2A5] border border-[#E5D2A5]/30 hover:bg-zinc-850 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Create First Support Request
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {tickets.map((t) => (
                            <div
                              key={t.id}
                              onClick={() => setSelectedTicketId(t.id)}
                              className="p-4 rounded-xl border border-zinc-200/80 bg-white hover:border-[#E5D2A5] hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold bg-[#E5D2A5]/20 text-[#A68F58] px-2 py-0.5 rounded border border-[#E5D2A5]/40">
                                    {t.ticketId}
                                  </span>
                                  <h5 className="font-bold text-zinc-800 text-sm line-clamp-1">{t.title}</h5>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                                  <span>Subject: <strong>{t.subjectName}</strong></span>
                                  <span>&bull;</span>
                                  <span>Chapter: <strong>{t.chapterName}</strong></span>
                                  <span>&bull;</span>
                                  <span>Class: <strong>{t.className}</strong></span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                                  t.status === "pending" ? "bg-yellow-100 text-yellow-800 border border-yellow-200" :
                                  t.status === "in_progress" ? "bg-blue-100 text-blue-800 border border-blue-200 animate-pulse" :
                                  t.status === "resolved" ? "bg-green-100 text-green-800 border border-green-200" :
                                  "bg-zinc-100 text-zinc-800 border border-zinc-200"
                                }`}>
                                  {t.status}
                                </span>
                                <ChevronRight className="w-4 h-4 text-zinc-400 hidden sm:block" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  )}

                </div>
              )}

            </div>

            {/* DOUBT ESCALATION CREATION FORM OVERLAY / MODAL */}
            <AnimatePresence>
              {isFormOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
                  >
                    <button
                      onClick={() => setIsFormOpen(false)}
                      className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                      <MessageCircle className="w-5 h-5 text-[#E5D2A5]" />
                      <span>Ask Expert Teacher</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mb-6 border-b border-white/10 pb-4">
                      Submit your doubt and one of our expert faculty members will respond with detailed guidance.
                    </p>

                    <form onSubmit={handleCreateSupportTicket} className="space-y-4 text-zinc-200">
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] uppercase font-mono tracking-wide text-zinc-400 font-bold">Your Name</label>
                          <input
                            type="text"
                            required
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5] text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] uppercase font-mono tracking-wide text-zinc-400 font-bold">Email Address</label>
                          <input
                            type="email"
                            required
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5] text-xs"
                          />
                        </div>
                      </div>

                      {/* Class, Subject, Chapter */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] uppercase font-mono tracking-wide text-zinc-400 font-bold">Class / Batch</label>
                          <select
                            required
                            value={formClassId}
                            onChange={(e) => setFormClassId(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5] text-xs"
                          >
                            <option value="" className="bg-zinc-900 text-white">Select</option>
                            {finalClassList.map(c => <option key={c.id} value={c.id} className="bg-zinc-900 text-white">{c.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] uppercase font-mono tracking-wide text-zinc-400 font-bold">Subject</label>
                          <select
                            required
                            value={formSubjectId}
                            onChange={(e) => setFormSubjectId(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5] text-xs"
                          >
                            <option value="" className="bg-zinc-900 text-white">Select</option>
                            {finalSubjectList.map(s => <option key={s.id} value={s.id} className="bg-zinc-900 text-white">{s.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] uppercase font-mono tracking-wide text-zinc-400 font-bold">Chapter</label>
                          <select
                            required
                            value={formChapterId}
                            onChange={(e) => setFormChapterId(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5] text-xs"
                          >
                            <option value="" className="bg-zinc-900 text-white">Select</option>
                            {finalChapterList
                              .filter(c => !formSubjectId || c.subjectId === formSubjectId)
                              .map(c => <option key={c.id} value={c.id} className="bg-zinc-900 text-white">{c.name}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] uppercase font-mono tracking-wide text-zinc-400 font-bold">Doubt Title</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Struggle with Coulomb's force vector numericals"
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5] text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] uppercase font-mono tracking-wide text-zinc-400 font-bold">Detailed Question</label>
                        <textarea
                          required
                          rows={4}
                          placeholder="Please paste or describe your numerical, scientific equation, or doubt context here..."
                          value={formQuestion}
                          onChange={(e) => setFormQuestion(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5] text-xs resize-none"
                        />
                      </div>

                      {/* Form Image upload */}
                      <div className="space-y-2">
                        <label className="block text-[10px] uppercase font-mono tracking-wide text-zinc-400 font-bold">Attach Image (Optional)</label>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => formFileInputRef.current?.click()}
                            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 flex items-center gap-1.5 cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-[#E5D2A5]" />
                            <span>Select Image</span>
                          </button>
                          <input 
                            type="file" 
                            ref={formFileInputRef} 
                            onChange={(e) => handleImageFileChange(e, "form")} 
                            accept="image/*" 
                            className="hidden" 
                          />
                          {formImagePreview && (
                            <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10">
                              <div className="w-6 h-6 rounded overflow-hidden relative border border-white/10 shrink-0">
                                <img src={formImagePreview} alt="Uploaded attachment" className="w-full h-full object-cover" />
                              </div>
                              <span className="text-[10px] text-zinc-400 max-w-[100px] truncate">Image Attached</span>
                              <button 
                                type="button" 
                                onClick={() => { setFormImage(null); setFormImagePreview(null); }}
                                className="p-1 rounded bg-white/10 text-zinc-400 hover:text-white"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submittingTicket}
                        className="w-full py-3 mt-4 rounded-xl bg-[#E5D2A5] text-zinc-950 hover:bg-[#f4ecd8] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                      >
                        {submittingTicket ? (
                          <>
                            <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                            <span>Submitting Doubt...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Submit Doubt to Expert Teacher</span>
                          </>
                        )}
                      </button>

                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
