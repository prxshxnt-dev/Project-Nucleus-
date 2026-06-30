import React, { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc,
  deleteDoc, 
  onSnapshot, 
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar,
  Legend
} from "recharts";
import { 
  CreditCard, 
  TrendingUp, 
  Coins, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  ArrowUpRight, 
  Search, 
  Filter, 
  Eye, 
  RefreshCw, 
  FileText, 
  Check, 
  Trash2, 
  Lock, 
  Unlock, 
  Settings, 
  Grid, 
  Tag, 
  Sparkles, 
  Percent, 
  Briefcase, 
  ShieldAlert, 
  Download, 
  Send, 
  History, 
  DollarSign, 
  Plus, 
  Bell, 
  Clipboard,
  Info
} from "lucide-react";

// Types
interface TransactionItem {
  id: string;
  orderId?: string;
  userId?: string;
  email: string;
  displayName?: string;
  batchName: string;
  amountPaid: number;
  paymentMethod?: string; // UPI, Card, Net Banking etc.
  gateway?: string; // Razorpay, PhonePe etc.
  status: "pending" | "completed" | "approved" | "failed" | "rejected" | "refunded";
  purchaseDate?: any; // Timestamp
  utr?: string;
  screenshotUrl?: string;
  userNotes?: string;
  internalNotes?: string;
  refundAmount?: number;
  refundReason?: string;
  refundDate?: any;
}

interface CouponItem {
  id: string;
  code: string;
  discountPercent?: number;
  fixedDiscount?: number;
  maxDiscount?: number;
  minOrderValue?: number;
  expiryDate?: string;
  usageLimit?: number;
  usageCount?: number;
  status: "active" | "disabled";
  applicableBatches?: string; // "All" or comma separated
}

interface OfferItem {
  id: string;
  title: string;
  type: "Festival Offer" | "Limited Time Offer" | "Flash Sale" | "Combo Offer" | "Early Bird Offer" | "Student Discount";
  discountPercent: number;
  startDate?: string;
  endDate?: string;
  bannerUrl?: string;
  description?: string;
  status: "active" | "inactive";
}

interface AuditLog {
  id: string;
  adminName: string;
  adminEmail: string;
  action: string;
  timestamp: any;
  ipAddress?: string;
}

export function AdminPaymentsManagement({ 
  initialSubTab, 
  onSubTabChange 
}: { 
  initialSubTab?: string; 
  onSubTabChange?: (tab: any) => void;
}) {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.email === "meinkxun@gmail.com";

  // Navigation Sub-tabs
  const [subTab, setSubTab] = useState<
    "dashboard" | "pricing" | "gateway" | "transactions" | "manual" | "refunds" | "coupons" | "offers" | "taxes" | "invoices" | "notifications" | "logs"
  >((initialSubTab as any) || "dashboard");

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab as any);
    }
  }, [initialSubTab]);

  const handleSetSubTab = (newTab: any) => {
    setSubTab(newTab);
    if (onSubTabChange) {
      onSubTabChange(newTab);
    }
  };

  // Pricing & plans customization states (loaded from settings/global)
  const [priceNotes, setPriceNotes] = useState(99);
  const [priceLectures, setPriceLectures] = useState(499);
  const [pricePremium, setPricePremium] = useState(999);
  const [classPrices, setClassPrices] = useState<any>({});
  const [upiId, setUpiId] = useState("");
  const [upiQrCode, setUpiQrCode] = useState("");

  const [pricingCard1Badge, setPricingCard1Badge] = useState("Essential Revision");
  const [pricingCard1Title, setPricingCard1Title] = useState("High Grade Notes");
  const [pricingCard1Desc, setPricingCard1Desc] = useState("Step-by-step PDF summaries built for immediate exam revision cycles.");
  const [pricingCard1Features, setPricingCard1Features] = useState("Complete Curated Study PDFs, Handwritten Board Materials, Quick Formula Sheets & Decals");

  const [pricingCard2Badge, setPricingCard2Badge] = useState("Full Video Stream");
  const [pricingCard2Title, setPricingCard2Title] = useState("Lectures Package");
  const [pricingCard2Desc, setPricingCard2Desc] = useState("Deeper conceptual lectures featuring interactive workspace guides.");
  const [pricingCard2Features, setPricingCard2Features] = useState("All Chapter Study Notes Included, High-Def Classroom Videos, Peer Doubt Forum Assistance");

  const [pricingCard3Badge, setPricingCard3Badge] = useState("All Inclusive Elite");
  const [pricingCard3Title, setPricingCard3Title] = useState("Elite Premium");
  const [pricingCard3Desc, setPricingCard3Desc] = useState("1-on-1 personalized mentorship with video courses and study guides.");
  const [pricingCard3Features, setPricingCard3Features] = useState("Comprehensive Study Notes & Videos, Weekly 1-on-1 Mentor Meetup, Personalized Study Calendar");

  // State collections
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Editable configurations states
  const [gatewayConfig, setGatewayConfig] = useState({
    activeGateway: "Razorpay",
    razorpay: { enabled: true, name: "Razorpay Live", pubKey: "rzp_live_8u3K2l1f9", secKey: "sec_rzp_9jD81f9s81", webhook: "wh_rzp_8f912j", env: "Production", currency: "INR" },
    phonepe: { enabled: false, name: "PhonePe PG", pubKey: "merchant_ph_77192", secKey: "sec_ph_291j31k92s", webhook: "wh_ph_2911s", env: "Sandbox", currency: "INR" },
    cashfree: { enabled: false, name: "Cashfree Sandbox", pubKey: "cf_test_291931", secKey: "sec_cf_02919k12", webhook: "wh_cf_91823k", env: "Sandbox", currency: "INR" },
    stripe: { enabled: false, name: "Stripe Connect", pubKey: "pk_live_51N8f921js", secKey: "sk_live_902j8f912s", webhook: "wh_st_912182", env: "Sandbox", currency: "USD" },
    paypal: { enabled: false, name: "PayPal Direct", pubKey: "client_pp_29193", secKey: "secret_pp_20193189", webhook: "wh_pp_819203", env: "Sandbox", currency: "USD" },
    successUrl: "https://nucleuscoaching.com/payment/success",
    failureUrl: "https://nucleuscoaching.com/payment/failed",
    cancelUrl: "https://nucleuscoaching.com/payment/cancel"
  });

  const [paymentMethods, setPaymentMethods] = useState({
    upi: true,
    creditCard: true,
    debitCard: true,
    netBanking: true,
    wallet: true,
    emi: false
  });

  const [upiSettings, setUpiSettings] = useState({
    upiId: "nucleuscoaching@ybl",
    merchantName: "NUCLEUS EDUCATION COACHING",
    qrCodeImage: "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?w=400",
    instructions: "Scan the QR code using any UPI app (PhonePe, GooglePay, Paytm, etc.). Enter the exact batch price and enter the transaction UTR number below for manual approval.",
    successMsg: "Thank you! Your payment is submitted. Our superadmin team will verify the UTR reference and unlock your batch course within 10-15 minutes.",
    failureMsg: "Transaction submission failed. If money was debited from your bank account, please contact support@nucleuscoaching.com immediately."
  });

  const [invoiceConfig, setInvoiceConfig] = useState({
    businessName: "Nucleus Coaching Academy Pvt Ltd",
    businessAddress: "402, Elite Heights, Sector 11, Dwarka, New Delhi - 110075",
    gstNumber: "07AAACN0291D1ZX",
    logoUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60",
    prefix: "NUC-2026-",
    footer: "This is a computer-generated invoice receipt. No physical signature is required.",
    termsAndConditions: "1. Fees once paid are non-refundable after 7 days of enrollment.\n2. One subscription is valid only for one registered student device.\n3. Tax is calculated as per GST norms laid down by Ministry of Finance, Govt of India."
  });

  const [taxConfig, setTaxConfig] = useState({
    gstPercent: 18,
    taxName: "Integrated GST (IGST)",
    inclusive: true,
    taxExemptBatches: ""
  });

  const [notificationConfig, setNotificationConfig] = useState({
    successSubject: "🎉 Course Batch Unlocked: Welcome to {BATCH_NAME}!",
    successBody: "Hi {STUDENT_NAME},\n\nWe have successfully received your payment of ₹{AMOUNT}. Your transaction reference {TRANSACTION_ID} is approved!\n\nAccess is unlocked inside your student dashboard. Head over to classes and materials to start learning!\n\nCheers,\nNucleus IIT-JEE & NEET Team",
    failedSubject: "⚠️ Payment Action Required: Nucleus Coaching",
    failedBody: "Hi {STUDENT_NAME},\n\nYour transaction submission for batch {BATCH_NAME} was marked failed or rejected.\n\nUTR Provided: {TRANSACTION_ID}\nAmount: ₹{AMOUNT}\n\nIf money was debited from your bank, please write to us with the payment screenshot at support@nucleuscoaching.com.",
    refundSubject: "💸 Refund Completed: Nucleus Coaching Academy",
    refundBody: "Hi {STUDENT_NAME},\n\nWe have successfully processed a refund of ₹{AMOUNT} back to your original source account.\n\nTransaction ID: {TRANSACTION_ID}\nRefund Reason: {REFUND_REASON}\n\nIt may take 5-7 business days to reflect in your bank account."
  });

  // Filters state
  const [filterQuery, setFilterQuery] = useState("");
  const [filterBatch, setFilterBatch] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterMethod, setFilterMethod] = useState("All");
  const [filterGateway, setFilterGateway] = useState("All");

  // Selected entities for detail modals
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [isVerifyingTx, setIsVerifyingTx] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState<TransactionItem | null>(null);

  // New coupon form state
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountPercent: 15,
    fixedDiscount: 0,
    maxDiscount: 500,
    minOrderValue: 1000,
    expiryDate: "2026-12-31",
    usageLimit: 100,
    applicableBatches: "All"
  });

  // New offer form state
  const [newOffer, setNewOffer] = useState({
    title: "",
    type: "Festival Offer" as any,
    discountPercent: 20,
    startDate: "2026-07-01",
    endDate: "2026-07-07",
    description: ""
  });

  // Verification actions state
  const [verificationNotes, setVerificationNotes] = useState("");
  const [refundPercent, setRefundPercent] = useState(100);
  const [refundReasonText, setRefundReasonText] = useState("");

  // Load and subscribe Firestore collections
  useEffect(() => {
    setLoading(true);

    // 1. Config configs (Singletons)
    const unsubGlobal = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setPriceNotes(d.priceNotes || 99);
        setPriceLectures(d.priceLectures || 499);
        setPricePremium(d.pricePremium || 999);
        setClassPrices(d.classPrices || {});
        setUpiId(d.upiId || "");
        setUpiQrCode(d.upiQrCode || "");

        setPricingCard1Badge(d.pricingCard1Badge || "Essential Revision");
        setPricingCard1Title(d.pricingCard1Title || "High Grade Notes");
        setPricingCard1Desc(d.pricingCard1Desc || "Step-by-step PDF summaries built for immediate exam revision cycles.");
        setPricingCard1Features(d.pricingCard1Features || "Complete Curated Study PDFs, Handwritten Board Materials, Quick Formula Sheets & Decals");

        setPricingCard2Badge(d.pricingCard2Badge || "Full Video Stream");
        setPricingCard2Title(d.pricingCard2Title || "Lectures Package");
        setPricingCard2Desc(d.pricingCard2Desc || "Deeper conceptual lectures featuring interactive workspace guides.");
        setPricingCard2Features(d.pricingCard2Features || "All Chapter Study Notes Included, High-Def Classroom Videos, Peer Doubt Forum Assistance");

        setPricingCard3Badge(d.pricingCard3Badge || "All Inclusive Elite");
        setPricingCard3Title(d.pricingCard3Title || "Elite Premium");
        setPricingCard3Desc(d.pricingCard3Desc || "1-on-1 personalized mentorship with video courses and study guides.");
        setPricingCard3Features(d.pricingCard3Features || "Comprehensive Study Notes & Videos, Weekly 1-on-1 Mentor Meetup, Personalized Study Calendar");
      }
    });

    const unsubConfig = onSnapshot(doc(db, "settings", "payment_gateway_config"), (snap) => {
      if (snap.exists()) setGatewayConfig(snap.data() as any);
    });
    const unsubMethods = onSnapshot(doc(db, "settings", "payment_methods_config"), (snap) => {
      if (snap.exists()) setPaymentMethods(snap.data() as any);
    });
    const unsubUpi = onSnapshot(doc(db, "settings", "upi_config"), (snap) => {
      if (snap.exists()) setUpiSettings(snap.data() as any);
    });
    const unsubInvoice = onSnapshot(doc(db, "settings", "invoice_config"), (snap) => {
      if (snap.exists()) setInvoiceConfig(snap.data() as any);
    });
    const unsubTax = onSnapshot(doc(db, "settings", "tax_config"), (snap) => {
      if (snap.exists()) setTaxConfig(snap.data() as any);
    });
    const unsubNotif = onSnapshot(doc(db, "settings", "notifications_config"), (snap) => {
      if (snap.exists()) setNotificationConfig(snap.data() as any);
    });

    // 2. Transactions list
    const unsubTx = onSnapshot(collection(db, "purchases"), (snap) => {
      const list = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          orderId: data.orderId || `ORD-${doc.id.substring(0, 6).toUpperCase()}`,
          userId: data.userId || "",
          email: data.email || "student@nucleus.com",
          displayName: data.displayName || data.email?.split("@")[0] || "Student",
          batchName: data.batchName || "Champions Program",
          amountPaid: data.amountPaid !== undefined ? Number(data.amountPaid) : (data.amount || 0),
          paymentMethod: data.paymentMethod || data.method || "UPI Scan",
          gateway: data.gateway || "PhonePe Merchant",
          status: data.status || "pending",
          purchaseDate: data.purchaseDate || data.createdAt || null,
          utr: data.utr || "N/A",
          screenshotUrl: data.screenshotUrl || "",
          userNotes: data.userNotes || "",
          internalNotes: data.internalNotes || "",
          refundAmount: data.refundAmount || 0,
          refundReason: data.refundReason || "",
          refundDate: data.refundDate || null
        } as TransactionItem;
      });
      // Sort newest first
      list.sort((a, b) => {
        const timeA = a.purchaseDate?.seconds || 0;
        const timeB = b.purchaseDate?.seconds || 0;
        return timeB - timeA;
      });
      setTransactions(list);
    });

    // 3. Coupons
    const unsubCoupons = onSnapshot(collection(db, "coupons"), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as CouponItem);
      setCoupons(list);
    });

    // 4. Offers
    const unsubOffers = onSnapshot(collection(db, "offers"), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as OfferItem);
      setOffers(list);
    });

    // 5. Audit logs
    const unsubLogs = onSnapshot(collection(db, "payment_logs"), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as AuditLog);
      list.sort((a, b) => {
        const tA = a.timestamp?.seconds || 0;
        const tB = b.timestamp?.seconds || 0;
        return tB - tA;
      });
      setAuditLogs(list);
      setLoading(false);
    });

    return () => {
      unsubGlobal();
      unsubConfig();
      unsubMethods();
      unsubUpi();
      unsubInvoice();
      unsubTax();
      unsubNotif();
      unsubTx();
      unsubCoupons();
      unsubOffers();
      unsubLogs();
    };
  }, []);

  // Log action Helper
  const logAuditAction = async (actionText: string) => {
    try {
      await addDoc(collection(db, "payment_logs"), {
        adminName: user?.displayName || "Admin User",
        adminEmail: user?.email || "admin@nucleus.com",
        action: actionText,
        timestamp: serverTimestamp(),
        ipAddress: "127.0.0.1" // Fallback local sandbox
      });
    } catch (err) {
      console.error("Failed to log audit event:", err);
    }
  };

  // Safe Saves checking Superadmin
  const handleSaveConfig = async (docId: string, data: any, friendlyName: string) => {
    if (!isSuperAdmin) {
      alert("⚠️ ACCESS DENIED: Only the Super Admin (meinkxun@gmail.com) can modify payment gateway parameters or credentials!");
      return;
    }
    try {
      await setDoc(doc(db, "settings", docId), data, { merge: true });
      await logAuditAction(`Modified Settings Configuration: ${friendlyName}`);
      alert(`✨ ${friendlyName} updated successfully!`);
    } catch (err: any) {
      alert(`❌ Failed to save ${friendlyName}: ` + err.message);
    }
  };

  const handleSavePricingSettings = async () => {
    try {
      await setDoc(doc(db, "settings", "global"), {
        priceNotes: Number(priceNotes),
        priceLectures: Number(priceLectures),
        pricePremium: Number(pricePremium),
        classPrices,
        upiId,
        upiQrCode,
        pricingCard1Badge,
        pricingCard1Title,
        pricingCard1Desc,
        pricingCard1Features,
        pricingCard2Badge,
        pricingCard2Title,
        pricingCard2Desc,
        pricingCard2Features,
        pricingCard3Badge,
        pricingCard3Title,
        pricingCard3Desc,
        pricingCard3Features,
      }, { merge: true });
      await logAuditAction("Modified Plan Pricing & UPI configurations");
      alert("✨ Plan prices & marketing configurations updated successfully!");
    } catch (err: any) {
      alert("❌ Failed to save pricing configurations: " + err.message);
    }
  };

  // Transaction quick status updater
  const updateTransactionStatus = async (txId: string, newStatus: "pending" | "completed" | "approved" | "failed" | "rejected" | "refunded", extraFields = {}) => {
    if (!isSuperAdmin && (newStatus === "refunded" || newStatus === "rejected")) {
      alert("⚠️ Access Denied: Only the Super Admin (meinkxun@gmail.com) can issue refunds or reject payments.");
      return;
    }
    try {
      await updateDoc(doc(db, "purchases", txId), {
        status: newStatus,
        ...extraFields,
        updatedAt: serverTimestamp()
      });
      await logAuditAction(`Updated Transaction ${txId} status to '${newStatus}'`);
      alert(`✨ Transaction updated to: ${newStatus}`);
    } catch (err: any) {
      alert("❌ Failed to update status: " + err.message);
    }
  };

  // Coupon Manager Actions
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code.trim()) return alert("Enter Coupon Code");
    try {
      const codeUpper = newCoupon.code.toUpperCase().trim();
      await addDoc(collection(db, "coupons"), {
        ...newCoupon,
        code: codeUpper,
        usageCount: 0,
        status: "active",
        createdAt: serverTimestamp()
      });
      await logAuditAction(`Created new discount coupon: "${codeUpper}"`);
      setNewCoupon({
        code: "",
        discountPercent: 15,
        fixedDiscount: 0,
        maxDiscount: 500,
        minOrderValue: 1000,
        expiryDate: "2026-12-31",
        usageLimit: 100,
        applicableBatches: "All"
      });
      alert(`✨ Coupon "${codeUpper}" deployed successfully!`);
    } catch (e: any) {
      alert("Failed to add coupon: " + e.message);
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Delete coupon "${code}"?`)) return;
    try {
      await deleteDoc(doc(db, "coupons", id));
      await logAuditAction(`Deleted discount coupon: "${code}"`);
      alert(`Deleted coupon "${code}"`);
    } catch (e: any) {
      alert("Delete failed: " + e.message);
    }
  };

  const toggleCouponStatus = async (id: string, code: string, currentStatus: "active" | "disabled") => {
    const nextStatus = currentStatus === "active" ? "disabled" : "active";
    try {
      await updateDoc(doc(db, "coupons", id), { status: nextStatus });
      await logAuditAction(`Toggled Coupon "${code}" to status: ${nextStatus}`);
    } catch (e: any) {
      alert("Toggle failed: " + e.message);
    }
  };

  // Offer Actions
  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOffer.title.trim()) return alert("Enter Offer Title");
    try {
      await addDoc(collection(db, "offers"), {
        ...newOffer,
        status: "active",
        createdAt: serverTimestamp()
      });
      await logAuditAction(`Created promotional offer: "${newOffer.title}"`);
      setNewOffer({
        title: "",
        type: "Festival Offer",
        discountPercent: 20,
        startDate: "2026-07-01",
        endDate: "2026-07-07",
        description: ""
      });
      alert(`Promotional Offer "${newOffer.title}" created!`);
    } catch (err: any) {
      alert("Failed to create offer: " + err.message);
    }
  };

  const handleDeleteOffer = async (id: string, title: string) => {
    if (!confirm(`Delete offer "${title}"?`)) return;
    try {
      await deleteDoc(doc(db, "offers", id));
      await logAuditAction(`Deleted promotional offer: "${title}"`);
      alert(`Deleted "${title}"`);
    } catch (err: any) {
      alert("Failed: " + err.message);
    }
  };

  // Transaction delete (Super Admin only)
  const handleDeleteTx = async (txId: string) => {
    if (!isSuperAdmin) {
      alert("⚠️ ACCESS DENIED: Only Super Admin (meinkxun@gmail.com) is allowed to permanently delete transaction logs!");
      return;
    }
    if (!confirm("Are you sure you want to permanently delete this transaction record? This is irreversible and will remove access logs.")) return;
    try {
      await deleteDoc(doc(db, "purchases", txId));
      await logAuditAction(`Permanently deleted transaction record: ${txId}`);
      alert("Record deleted successfully.");
      setSelectedTx(null);
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  };

  // Simulated Refund approval/rejection
  const handleRefundAction = async (txId: string, approve: boolean) => {
    if (!isSuperAdmin) {
      alert("⚠️ Access Denied: Only the Super Admin (meinkxun@gmail.com) can approve or reject refunds.");
      return;
    }
    try {
      const calculatedAmt = Math.round((selectedTx?.amountPaid || 0) * (refundPercent / 100));
      if (approve) {
        await updateTransactionStatus(txId, "refunded", {
          refundAmount: calculatedAmt,
          refundReason: refundReasonText || "Customer Request",
          refundDate: serverTimestamp()
        });
        alert(`✨ Refund of ₹${calculatedAmt} successfully authorized!`);
      } else {
        await updateTransactionStatus(txId, "completed", {
          internalNotes: `${selectedTx?.internalNotes || ""}\n[System] Refund request of ${refundPercent}% rejected: ${refundReasonText}`
        });
        alert("Refund request declined.");
      }
      setRefundReasonText("");
      setSelectedTx(null);
    } catch (e: any) {
      alert("Failed refund process: " + e.message);
    }
  };

  // Dashboard calculations
  const stats = useMemo(() => {
    let totalRev = 0;
    let todayRev = 0;
    let monthRev = 0;
    let successCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let refundedCount = 0;
    const batchCounts: Record<string, number> = {};

    const now = new Date();
    const todayStr = now.toDateString();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    transactions.forEach(t => {
      const isSuccess = t.status === "completed" || t.status === "approved";
      const amt = t.amountPaid || 0;
      
      if (isSuccess) {
        totalRev += amt;
        successCount++;

        // Calculate top batches
        batchCounts[t.batchName] = (batchCounts[t.batchName] || 0) + 1;

        // Check date
        if (t.purchaseDate) {
          const tDate = new Date(t.purchaseDate.seconds * 1000);
          if (tDate.toDateString() === todayStr) {
            todayRev += amt;
          }
          if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
            monthRev += amt;
          }
        }
      } else if (t.status === "pending") {
        pendingCount++;
      } else if (t.status === "failed" || t.status === "rejected") {
        failedCount++;
      } else if (t.status === "refunded") {
        refundedCount++;
      }
    });

    // Find top selling batch
    let topBatch = "No batch sold yet";
    let maxSales = 0;
    Object.entries(batchCounts).forEach(([batch, count]) => {
      if (count > maxSales) {
        maxSales = count;
        topBatch = batch;
      }
    });

    const totalTx = transactions.length;
    const aov = successCount > 0 ? Math.round(totalRev / successCount) : 0;

    return {
      totalRev,
      todayRev,
      monthRev,
      totalTx,
      successCount,
      pendingCount,
      failedCount,
      refundedCount,
      totalPurchased: successCount + refundedCount,
      aov,
      topBatch
    };
  }, [transactions]);

  // Chart data for revenue trend (past 7 days)
  const revenueChartData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    // Initialize past 7 days with zero
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      dataMap[dayName] = 0;
    }

    transactions.forEach(t => {
      if ((t.status === "completed" || t.status === "approved") && t.purchaseDate) {
        const tDate = new Date(t.purchaseDate.seconds * 1000);
        const diffTime = Math.abs(new Date().getTime() - tDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          const dayName = days[tDate.getDay()];
          dataMap[dayName] = (dataMap[dayName] || 0) + t.amountPaid;
        }
      }
    });

    return Object.entries(dataMap).map(([day, revenue]) => ({ day, revenue }));
  }, [transactions]);

  // Chart data for gateway breakdown
  const gatewayChartData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.status === "completed" || t.status === "approved") {
        const gw = t.gateway || "Other";
        map[gw] = (map[gw] || 0) + t.amountPaid;
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.email.toLowerCase().includes(filterQuery.toLowerCase()) ||
                            (t.displayName && t.displayName.toLowerCase().includes(filterQuery.toLowerCase())) ||
                            t.id.toLowerCase().includes(filterQuery.toLowerCase()) ||
                            (t.utr && t.utr.toLowerCase().includes(filterQuery.toLowerCase())) ||
                            t.batchName.toLowerCase().includes(filterQuery.toLowerCase());
      
      const matchesBatch = filterBatch === "All" || t.batchName === filterBatch;
      const matchesStatus = filterStatus === "All" || t.status === filterStatus;
      const matchesMethod = filterMethod === "All" || t.paymentMethod === filterMethod;
      const matchesGateway = filterGateway === "All" || t.gateway === filterGateway;

      return matchesSearch && matchesBatch && matchesStatus && matchesMethod && matchesGateway;
    });
  }, [transactions, filterQuery, filterBatch, filterStatus, filterMethod, filterGateway]);

  // Unique batches for filtering dropdown
  const uniqueBatches = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => set.add(t.batchName));
    return Array.from(set);
  }, [transactions]);

  // Download printable invoice receipt
  const triggerReceiptPrint = (tx: TransactionItem) => {
    const baseAmount = Math.round(tx.amountPaid / (1 + (taxConfig.gstPercent / 100)));
    const gstAmount = tx.amountPaid - baseAmount;

    const invoiceWindow = window.open("", "_blank");
    if (!invoiceWindow) return alert("Please allow popups to download/print the invoice.");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice Receipt - ${tx.orderId || tx.id}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #222; margin: 0; padding: 40px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eaeaea; padding-bottom: 20px; margin-bottom: 30px; }
          .logo-box { max-width: 150px; }
          .business-info { text-align: right; font-size: 12px; line-height: 1.5; color: #555; }
          .invoice-title { font-size: 24px; font-weight: bold; margin: 0; color: #111; }
          .bill-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; font-size: 13px; }
          .bill-card { background: #fafafa; border: 1px solid #eee; padding: 15px; rounded: 8px; }
          .bill-title { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #777; margin-bottom: 8px; }
          .table { w-full; width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 13px; }
          .table th { background: #f5f5f5; border-bottom: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold; }
          .table td { border-bottom: 1px solid #eee; padding: 12px; }
          .totals { margin-left: auto; width: 300px; font-size: 13px; line-height: 1.8; }
          .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
          .totals-bold { font-weight: bold; font-size: 15px; border-top: 1px solid #ddd; padding-top: 8px; margin-top: 8px; }
          .footer { text-align: center; border-top: 1px solid #eee; padding-top: 20px; font-size: 11px; color: #888; margin-top: 60px; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="invoice-title">RECEIPT INVOICE</div>
            <div style="font-size: 12px; color: #777; margin-top: 5px;">Invoice Number: ${invoiceConfig.prefix}${tx.orderId || tx.id.substring(0,6)}</div>
            <div style="font-size: 12px; color: #777;">Date: ${tx.purchaseDate ? new Date(tx.purchaseDate.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString()}</div>
          </div>
          <div class="business-info">
            <strong style="font-size:14px; color:#111;">${invoiceConfig.businessName}</strong><br/>
            ${invoiceConfig.businessAddress}<br/>
            GSTIN: <strong>${invoiceConfig.gstNumber}</strong>
          </div>
        </div>

        <div class="bill-grid">
          <div class="bill-card">
            <div class="bill-title">Billed To</div>
            <strong>${tx.displayName || "Registered Student"}</strong><br/>
            Email: ${tx.email}<br/>
            UID: ${tx.userId || "N/A"}<br/>
            Status: PAIED / APPROVED
          </div>
          <div class="bill-card">
            <div class="bill-title">Payment Info</div>
            Gateway: <strong>${tx.gateway || "Direct Transfer"}</strong><br/>
            Payment Method: ${tx.paymentMethod || "UPI"}<br/>
            Transaction UTR/ID: <span style="font-family:monospace;">${tx.utr || "N/A"}</span><br/>
            Order Reference: ${tx.orderId || tx.id}
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Item / Course Batch Description</th>
              <th style="text-align: right;">Base Fee</th>
              <th style="text-align: right;">GST (${taxConfig.gstPercent}%)</th>
              <th style="text-align: right;">Total Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>${tx.batchName}</strong><br/>
                <span style="font-size: 11px; color:#888;">Complete premium coaching program access.</span>
              </td>
              <td style="text-align: right;">₹${baseAmount}</td>
              <td style="text-align: right;">₹${gstAmount}</td>
              <td style="text-align: right; font-weight:bold;">₹${tx.amountPaid}</td>
            </tr>
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>₹${baseAmount}</span>
          </div>
          <div class="totals-row">
            <span>Tax Amount (${taxConfig.taxName}):</span>
            <span>₹${gstAmount}</span>
          </div>
          <div class="totals-row totals-bold">
            <span>Amount Paid:</span>
            <span>₹${tx.amountPaid}</span>
          </div>
        </div>

        <div style="margin-top:40px; font-size:12px; border: 1px solid #f0f0f0; padding:15px; background:#fcfcfc; border-radius:6px;">
          <div style="font-weight:bold; margin-bottom: 5px; color:#555;">Terms & Academic Guidelines:</div>
          <p style="white-space: pre-line; margin:0; color:#666; line-height:1.5;">${invoiceConfig.termsAndConditions}</p>
        </div>

        <div class="footer">
          ${invoiceConfig.footer}
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    invoiceWindow.document.write(htmlContent);
    invoiceWindow.document.close();
  };

  return (
    <div className="w-full bg-zinc-950 text-white min-h-[700px] font-sans pb-12">
      {/* Top Section */}
      <div className="border-b border-white/5 pb-5 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2 font-display">
            <span>💳</span> Payments & Financial Headquarters
          </h2>
          <p className="text-sm text-white/50 mt-1">
            Superadmin central suite for transaction verification, gateway configuration, coupons, invoice customizers, and manual receipts.
          </p>
        </div>
        {!isSuperAdmin && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-2 flex items-center gap-2 max-w-sm text-left">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <span className="text-[10px] text-red-400 font-bold leading-tight">
              READ-ONLY MODE: You are logged in as a normal admin. Only the Superadmin (meinkxun@gmail.com) can change settings or process funds.
            </span>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-4 mb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-white/5">
        {[
          { id: "dashboard", label: "📈 Live Dashboard", icon: TrendingUp },
          { id: "pricing", label: "🏷️ Pricing & Plans", icon: Coins },
          { id: "gateway", label: "⚙️ Gateway Settings", icon: Settings },
          { id: "transactions", label: "📋 Transactions Log", icon: Grid },
          { id: "manual", label: "📸 Manual Receipts", icon: Clipboard },
          { id: "refunds", label: "💸 Refund Manager", icon: History },
          { id: "coupons", label: "🏷️ Coupons", icon: Tag },
          { id: "offers", label: "⚡ Offers", icon: Sparkles },
          { id: "taxes", label: "🏦 Taxes & business", icon: Briefcase },
          { id: "invoices", label: "📄 Invoice Style", icon: FileText },
          { id: "notifications", label: "🔔 Alerts", icon: Bell },
          { id: "logs", label: "📜 Audit Trail", icon: Info },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleSetSubTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                subTab === tab.id
                  ? "bg-primary text-zinc-950 font-black shadow-lg"
                  : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
          <span className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs text-white/40 font-mono">Syncing financial records from Firestore secure nodes...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* PRICING & PLANS MODULE */}
          {subTab === "pricing" && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="border border-white/5 bg-white/[0.01] p-5 rounded-3xl space-y-1">
                <h3 className="text-sm font-black uppercase text-indigo-400 tracking-wider">Pricing & Plans Configuration</h3>
                <p className="text-xs text-white/50">
                  Configure default study plan pricing, customize landing page card copy checklists, configure class-specific custom prices, and set up your manual UPI parameters.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-white/80 tracking-wider border-b border-white/5 pb-2">Base Pricing Plan Rates</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-white/60 mb-1.5">Notes Plan Price (₹)</label>
                      <input
                        type="number"
                        value={priceNotes}
                        onChange={(e) => setPriceNotes(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-white/60 mb-1.5">Lectures Plan Price (₹)</label>
                      <input
                        type="number"
                        value={priceLectures}
                        onChange={(e) => setPriceLectures(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-white/60 mb-1.5">Premium Plan Price (₹)</label>
                      <input
                        type="number"
                        value={pricePremium}
                        onChange={(e) => setPricePremium(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-white/80 tracking-wider border-b border-white/5 pb-2">Direct UPI Payment Setup</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-white/60 mb-1.5">UPI ID (For Payments)</label>
                      <input
                        type="text"
                        placeholder="e.g. john@upi"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-white/60 mb-1.5">Custom UPI QR Code Image URL (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. https://domain.com/my-qr.jpg (leave blank to auto-generate)"
                        value={upiQrCode}
                        onChange={(e) => setUpiQrCode(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-white/40 italic">
                    Note: If custom QR URL is left blank, the app will automatically generate an offline static visual QR from your registered UPI address.
                  </p>
                </div>
              </div>

              {/* Pricing Cards Content Customizer */}
              <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-5">
                <div>
                  <h4 className="text-xs font-black uppercase text-white/80 tracking-wider">Customize Pricing Cards Content & Texts</h4>
                  <p className="text-[10px] text-white/50 mt-1">
                    Fine-tune the marketing badge, title, overview descriptions, and comma-separated checklists shown on the landing page cards.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Card 1 */}
                  <div className="p-4 rounded-2xl border border-white/5 bg-black/20 space-y-3">
                    <div className="text-xs font-bold text-indigo-400 border-b border-white/5 pb-1">
                      Notes Plan Card Config
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/50 mb-1">Badge Title</label>
                      <input
                        type="text"
                        value={pricingCard1Badge}
                        onChange={(e) => setPricingCard1Badge(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/50 mb-1">Card Header Title</label>
                      <input
                        type="text"
                        value={pricingCard1Title}
                        onChange={(e) => setPricingCard1Title(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/50 mb-1">Description / Subtitle Info</label>
                      <textarea
                        value={pricingCard1Desc}
                        onChange={(e) => setPricingCard1Desc(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-1.5 text-xs font-sans rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-primary resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/50 mb-1">Checklist Features (Comma-Separated)</label>
                      <input
                        type="text"
                        value={pricingCard1Features}
                        onChange={(e) => setPricingCard1Features(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-primary"
                        placeholder="Feature 1, Feature 2"
                      />
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="p-4 rounded-2xl border border-white/5 bg-black/20 space-y-3">
                    <div className="text-xs font-bold text-indigo-400 border-b border-white/5 pb-1">
                      Lectures Plan Card Config
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/50 mb-1">Badge Title</label>
                      <input
                        type="text"
                        value={pricingCard2Badge}
                        onChange={(e) => setPricingCard2Badge(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/50 mb-1">Card Header Title</label>
                      <input
                        type="text"
                        value={pricingCard2Title}
                        onChange={(e) => setPricingCard2Title(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/50 mb-1">Description / Subtitle Info</label>
                      <textarea
                        value={pricingCard2Desc}
                        onChange={(e) => setPricingCard2Desc(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-1.5 text-xs font-sans rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-primary resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/50 mb-1">Checklist Features (Comma-Separated)</label>
                      <input
                        type="text"
                        value={pricingCard2Features}
                        onChange={(e) => setPricingCard2Features(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-primary"
                        placeholder="Feature 1, Feature 2"
                      />
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="p-4 rounded-2xl border border-white/5 bg-black/20 space-y-3">
                    <div className="text-xs font-bold text-indigo-400 border-b border-white/5 pb-1">
                      Elite Premium Card Config
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/50 mb-1">Badge Title</label>
                      <input
                        type="text"
                        value={pricingCard3Badge}
                        onChange={(e) => setPricingCard3Badge(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/50 mb-1">Card Header Title</label>
                      <input
                        type="text"
                        value={pricingCard3Title}
                        onChange={(e) => setPricingCard3Title(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/50 mb-1">Description / Subtitle Info</label>
                      <textarea
                        value={pricingCard3Desc}
                        onChange={(e) => setPricingCard3Desc(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-1.5 text-xs font-sans rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-primary resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/50 mb-1">Checklist Features (Comma-Separated)</label>
                      <input
                        type="text"
                        value={pricingCard3Features}
                        onChange={(e) => setPricingCard3Features(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-primary"
                        placeholder="Feature 1, Feature 2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Class Specific Prices */}
              <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-4">
                <h4 className="text-xs font-black uppercase text-white/80 tracking-wider">Class-Specific Custom Prices</h4>
                <p className="text-[10px] text-white/50 mt-1">
                  Specify overrides for individual classes. Left blank, the system automatically falls back to default base rates.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {["6", "7", "8", "9", "10", "11", "12", "dropper"].map((cls) => (
                    <div key={cls} className="p-3 rounded-2xl border border-white/5 bg-black/20 space-y-2">
                      <span className="text-xs font-bold text-white capitalize block border-b border-white/5 pb-1">Class {cls} Price</span>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/50 w-12 text-right">Notes:</span>
                          <input
                            type="number"
                            placeholder="Default"
                            value={classPrices[cls]?.notes || ""}
                            onChange={(e) =>
                              setClassPrices((p: any) => ({
                                ...p,
                                [cls]: {
                                  ...p[cls],
                                  notes: e.target.value ? Number(e.target.value) : undefined,
                                },
                              }))
                            }
                            className="flex-1 px-2 py-1 text-xs rounded bg-black/40 border border-white/10 text-white focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/50 w-12 text-right">Lectures:</span>
                          <input
                            type="number"
                            placeholder="Default"
                            value={classPrices[cls]?.lectures || ""}
                            onChange={(e) =>
                              setClassPrices((p: any) => ({
                                ...p,
                                [cls]: {
                                  ...p[cls],
                                  lectures: e.target.value ? Number(e.target.value) : undefined,
                                },
                              }))
                            }
                            className="flex-1 px-2 py-1 text-xs rounded bg-black/40 border border-white/10 text-white focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/50 w-12 text-right">Premium:</span>
                          <input
                            type="number"
                            placeholder="Default"
                            value={classPrices[cls]?.premium || ""}
                            onChange={(e) =>
                              setClassPrices((p: any) => ({
                                ...p,
                                [cls]: {
                                  ...p[cls],
                                  premium: e.target.value ? Number(e.target.value) : undefined,
                                },
                              }))
                            }
                            className="flex-1 px-2 py-1 text-xs rounded bg-black/40 border border-white/10 text-white focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action save button */}
              <button
                type="button"
                onClick={handleSavePricingSettings}
                className="px-8 py-3.5 rounded-full bg-primary hover:brightness-110 text-zinc-950 font-black uppercase text-xs tracking-widest transition-all w-full cursor-pointer shadow-lg hover:shadow-primary/25"
              >
                Save Pricing & Plans Configurations
              </button>
            </div>
          )}

          {/* 1. DASHBOARD MODULE */}
          {subTab === "dashboard" && (
            <div className="space-y-6 animate-fade-in text-left">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-3xl relative overflow-hidden">
                  <span className="text-[9px] uppercase font-bold text-white/40">Total Revenue</span>
                  <div className="text-2xl font-mono font-black text-emerald-400 mt-1">₹{stats.totalRev.toLocaleString()}</div>
                  <div className="absolute right-3 bottom-3 p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Coins className="w-4 h-4" />
                  </div>
                </div>
                <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-3xl relative overflow-hidden">
                  <span className="text-[9px] uppercase font-bold text-white/40">Today's Sales</span>
                  <div className="text-2xl font-mono font-black text-primary mt-1">₹{stats.todayRev.toLocaleString()}</div>
                  <div className="absolute right-3 bottom-3 p-1 rounded-lg bg-primary/10 text-primary">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-3xl relative overflow-hidden">
                  <span className="text-[9px] uppercase font-bold text-white/40">This Month</span>
                  <div className="text-2xl font-mono font-black text-white mt-1 font-sans">₹{stats.monthRev.toLocaleString()}</div>
                  <div className="absolute right-3 bottom-3 p-1 rounded-lg bg-white/10 text-white">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-3xl relative overflow-hidden">
                  <span className="text-[9px] uppercase font-bold text-white/40">Average Order (AOV)</span>
                  <div className="text-2xl font-mono font-black text-indigo-400 mt-1">₹{stats.aov.toLocaleString()}</div>
                  <div className="absolute right-3 bottom-3 p-1 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Status Breakdown Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-zinc-900/20 border border-white/5 p-3 rounded-2xl">
                  <span className="text-[8px] uppercase tracking-wider text-white/50 block font-bold">Total Logs</span>
                  <span className="text-base font-bold font-mono mt-0.5 block text-white">{stats.totalTx}</span>
                </div>
                <div className="bg-zinc-900/20 border border-white/5 p-3 rounded-2xl">
                  <span className="text-[8px] uppercase tracking-wider text-emerald-400 block font-bold">Successful</span>
                  <span className="text-base font-bold font-mono mt-0.5 block text-emerald-400">{stats.successCount}</span>
                </div>
                <div className="bg-zinc-900/20 border border-white/5 p-3 rounded-2xl">
                  <span className="text-[8px] uppercase tracking-wider text-amber-400 block font-bold">Pending Review</span>
                  <span className="text-base font-bold font-mono mt-0.5 block text-amber-400">{stats.pendingCount}</span>
                </div>
                <div className="bg-zinc-900/20 border border-white/5 p-3 rounded-2xl">
                  <span className="text-[8px] uppercase tracking-wider text-red-400 block font-bold">Failed / Rejected</span>
                  <span className="text-base font-bold font-mono mt-0.5 block text-red-400">{stats.failedCount}</span>
                </div>
                <div className="bg-zinc-900/20 border border-white/5 p-3 rounded-2xl">
                  <span className="text-[8px] uppercase tracking-wider text-purple-400 block font-bold">Refunded Logs</span>
                  <span className="text-base font-bold font-mono mt-0.5 block text-purple-400">{stats.refundedCount}</span>
                </div>
              </div>

              {/* Charts Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 7-Day Revenue Trend Line Graph */}
                <div className="lg:col-span-2 bg-zinc-900/40 border border-white/10 p-5 rounded-3xl">
                  <h3 className="text-xs uppercase font-black text-white/80 tracking-widest mb-4">
                    7-Day Sales Volume Trend
                  </h3>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="day" stroke="#71717a" fontSize={10} tickLine={false} />
                        <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46" }} />
                        <Area type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gateway pie breakdown */}
                <div className="bg-zinc-900/40 border border-white/10 p-5 rounded-3xl flex flex-col justify-between">
                  <h3 className="text-xs uppercase font-black text-white/80 tracking-widest mb-2">
                    Gateway Share
                  </h3>
                  <div className="h-[180px] w-full flex items-center justify-center">
                    {gatewayChartData.length === 0 ? (
                      <span className="text-xs text-white/40">No sales logged</span>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={gatewayChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {gatewayChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `₹${value}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="space-y-1.5 pt-3 border-t border-white/5">
                    <div className="text-[10px] uppercase font-bold text-white/40 mb-1">Top Selling Batch:</div>
                    <div className="text-xs font-black text-primary line-clamp-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                      {stats.topBatch}
                    </div>
                  </div>
                </div>

              </div>

              {/* Recent Transactions list (Last 5) */}
              <div className="bg-zinc-900/40 border border-white/10 rounded-3xl overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-white/80">
                    Latest Activity Feed
                  </h3>
                  <button 
                    onClick={() => setSubTab("transactions")}
                    className="text-[10px] uppercase tracking-wider font-bold text-primary hover:underline cursor-pointer"
                  >
                    View All Logs →
                  </button>
                </div>
                <div className="divide-y divide-white/5">
                  {transactions.slice(0, 5).map(tx => (
                    <div key={tx.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/[0.01] transition-all">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{tx.displayName || tx.email}</span>
                          <span className="text-[9px] text-white/40 font-mono">({tx.email})</span>
                        </div>
                        <div className="text-[10px] text-white/50 flex items-center gap-1.5">
                          <span className="font-bold text-white/70">{tx.batchName}</span>
                          <span>•</span>
                          <span>{tx.paymentMethod || "UPI"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="text-sm font-black font-mono text-emerald-400">₹{tx.amountPaid}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono font-bold border ${
                          tx.status === "completed" || tx.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : tx.status === "pending"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <p className="p-8 text-center text-xs text-white/40 font-mono">No payment operations registered yet.</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* 2. GATEWAY SETTINGS */}
          {subTab === "gateway" && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="border border-white/5 bg-white/[0.01] p-5 rounded-3xl space-y-1">
                <h3 className="text-sm font-black uppercase text-primary tracking-wider">Configure Gateway Processors</h3>
                <p className="text-xs text-white/50">
                  Enable, disable, and configure merchant keys for payment gateways. Only the active payment gateway is loaded during checkout.
                </p>
              </div>

              {/* Toggles grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Active Choice Card */}
                <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 space-y-4">
                  <h4 className="text-xs font-black uppercase text-white/80 tracking-wider">Active Ingress Router</h4>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/40 mb-1.5">Select Primary Payment Gateway</label>
                    <select
                      value={gatewayConfig.activeGateway}
                      disabled={!isSuperAdmin}
                      onChange={(e) => {
                        const next = { ...gatewayConfig, activeGateway: e.target.value };
                        setGatewayConfig(next);
                        handleSaveConfig("payment_gateway_config", next, "Active Payment Gateway");
                      }}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-sans text-white focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50"
                    >
                      <option value="Razorpay">Razorpay (Active)</option>
                      <option value="PhonePe">PhonePe Merchant</option>
                      <option value="Cashfree">Cashfree Core</option>
                      <option value="Stripe">Stripe Connect (Future)</option>
                      <option value="PayPal">PayPal Standard (Future)</option>
                    </select>
                  </div>
                  <div className="p-3.5 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] text-white/70 leading-relaxed">
                      By modifying the select value, you instantly pivot the app checkout system. The student client is generated instantly with the updated gateway SDK configuration.
                    </p>
                  </div>

                  {/* Payment Methods Checkboxes */}
                  <div className="pt-4 border-t border-white/5 space-y-3">
                    <h4 className="text-xs font-black uppercase text-white/80 tracking-wider">Allowed Payment Forms</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(paymentMethods).map(([key, enabled]) => (
                        <label key={key} className="flex items-center gap-2.5 bg-black/40 border border-white/5 hover:border-white/10 rounded-xl p-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabled}
                            disabled={!isSuperAdmin}
                            onChange={(e) => {
                              const next = { ...paymentMethods, [key]: e.target.checked };
                              setPaymentMethods(next);
                              handleSaveConfig("payment_methods_config", next, "Allowed Payment Forms");
                            }}
                            className="rounded accent-primary text-black"
                          />
                          <span className="text-xs uppercase font-black text-white/70">{key.replace(/([A-Z])/g, ' $1')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Gateway Detail Config Form */}
                <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 space-y-4">
                  <h4 className="text-xs font-black uppercase text-white/80 tracking-wider flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Key Properties Setup: {gatewayConfig.activeGateway}
                  </h4>

                  {/* Dynamic selected config */}
                  {(() => {
                    const activeKey = gatewayConfig.activeGateway.toLowerCase() as "razorpay" | "phonepe" | "cashfree" | "stripe" | "paypal";
                    const config = gatewayConfig[activeKey];
                    if (!config) return null;

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase font-bold text-white/50">Gateway Activation Status</label>
                          <button
                            onClick={() => {
                              const next = {
                                ...gatewayConfig,
                                [activeKey]: { ...config, enabled: !config.enabled }
                              };
                              setGatewayConfig(next);
                              handleSaveConfig("payment_gateway_config", next, `${gatewayConfig.activeGateway} Status`);
                            }}
                            disabled={!isSuperAdmin}
                            className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg cursor-pointer ${
                              config.enabled ? "bg-emerald-500 text-black" : "bg-white/5 text-white/40"
                            }`}
                          >
                            {config.enabled ? "Enabled" : "Disabled"}
                          </button>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-white/40 mb-1.5">Merchant Name</label>
                          <input
                            type="text"
                            value={config.name}
                            disabled={!isSuperAdmin}
                            onChange={(e) => {
                              setGatewayConfig({
                                ...gatewayConfig,
                                [activeKey]: { ...config, name: e.target.value }
                              });
                            }}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-white/40 mb-1.5">Public Key (Client ID)</label>
                            <input
                              type="text"
                              value={config.pubKey}
                              disabled={!isSuperAdmin}
                              onChange={(e) => {
                                setGatewayConfig({
                                  ...gatewayConfig,
                                  [activeKey]: { ...config, pubKey: e.target.value }
                                });
                              }}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-white/40 mb-1.5">Secret Token (Hidden)</label>
                            <input
                              type={isSuperAdmin ? "text" : "password"}
                              value={isSuperAdmin ? config.secKey : "••••••••••••"}
                              disabled={!isSuperAdmin}
                              onChange={(e) => {
                                setGatewayConfig({
                                  ...gatewayConfig,
                                  [activeKey]: { ...config, secKey: e.target.value }
                                });
                              }}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-white/40 mb-1.5">Webhook End Secret</label>
                            <input
                              type="text"
                              value={config.webhook}
                              disabled={!isSuperAdmin}
                              onChange={(e) => {
                                setGatewayConfig({
                                  ...gatewayConfig,
                                  [activeKey]: { ...config, webhook: e.target.value }
                                });
                              }}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-white/40 mb-1.5">Gateway Environment</label>
                            <select
                              value={config.env}
                              disabled={!isSuperAdmin}
                              onChange={(e) => {
                                setGatewayConfig({
                                  ...gatewayConfig,
                                  [activeKey]: { ...config, env: e.target.value }
                                });
                              }}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white cursor-pointer"
                            >
                              <option value="Sandbox">Sandbox (Test Mode)</option>
                              <option value="Production">Production (Live Mode)</option>
                            </select>
                          </div>
                        </div>

                        {/* URLs */}
                        <div className="space-y-2.5 pt-3 border-t border-white/5">
                          <h5 className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Redirection Endpoint Handlers</h5>
                          <div>
                            <label className="block text-[9px] text-white/40 mb-1">Success Callback URL</label>
                            <input
                              type="url"
                              value={gatewayConfig.successUrl}
                              disabled={!isSuperAdmin}
                              onChange={(e) => setGatewayConfig({ ...gatewayConfig, successUrl: e.target.value })}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-white font-mono"
                            />
                          </div>
                        </div>

                        {isSuperAdmin && (
                          <button
                            onClick={() => handleSaveConfig("payment_gateway_config", gatewayConfig, `${gatewayConfig.activeGateway} Parameters`)}
                            className="w-full py-2.5 bg-primary text-zinc-950 font-black uppercase text-[10px] rounded-xl hover:scale-[1.01] transition-all cursor-pointer"
                          >
                            Save {gatewayConfig.activeGateway} Config
                          </button>
                        )}
                      </div>
                    );
                  })()}

                </div>

              </div>
            </div>
          )}

          {/* 3. TRANSACTIONS LOG */}
          {subTab === "transactions" && (
            <div className="space-y-6 animate-fade-in text-left">
              {/* Filters Block */}
              <div className="bg-zinc-900/40 border border-white/10 p-5 rounded-3xl space-y-4">
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                  <h3 className="text-xs uppercase font-black tracking-widest text-white/80">
                    Search & Operations Filter
                  </h3>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      placeholder="Search email, name, UTR, batch..."
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-primary text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-white/40 mb-1">Target Batch</label>
                    <select
                      value={filterBatch}
                      onChange={(e) => setFilterBatch(e.target.value)}
                      className="w-full bg-black border border-white/5 rounded-lg p-2 text-xs cursor-pointer text-white"
                    >
                      <option value="All">All Batches</option>
                      {uniqueBatches.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-white/40 mb-1">Payment Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full bg-black border border-white/5 rounded-lg p-2 text-xs cursor-pointer text-white"
                    >
                      <option value="All">All Statuses</option>
                      <option value="completed">Completed / Active</option>
                      <option value="approved">Approved</option>
                      <option value="pending">Pending Review</option>
                      <option value="failed">Failed</option>
                      <option value="rejected">Rejected</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-white/40 mb-1">Payment Method</label>
                    <select
                      value={filterMethod}
                      onChange={(e) => setFilterMethod(e.target.value)}
                      className="w-full bg-black border border-white/5 rounded-lg p-2 text-xs cursor-pointer text-white"
                    >
                      <option value="All">All Methods</option>
                      <option value="UPI Scan">UPI QR / Manual</option>
                      <option value="UPI Direct">UPI Direct App</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Net Banking">Net Banking</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-white/40 mb-1">Gateway</label>
                    <select
                      value={filterGateway}
                      onChange={(e) => setFilterGateway(e.target.value)}
                      className="w-full bg-black border border-white/5 rounded-lg p-2 text-xs cursor-pointer text-white"
                    >
                      <option value="All">All Gateways</option>
                      <option value="Razorpay">Razorpay</option>
                      <option value="PhonePe">PhonePe Merchant</option>
                      <option value="Cashfree">Cashfree Core</option>
                      <option value="Stripe">Stripe Connect</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Transactions list */}
              <div className="bg-zinc-900/40 border border-white/10 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-white/40 font-black border-b border-white/5 uppercase text-[8px] tracking-wider">
                        <th className="p-4">Transaction Details</th>
                        <th className="p-4">Student & Batch</th>
                        <th className="p-4 text-right">Amount</th>
                        <th className="p-4">UTR / Method / GW</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-center">Receipt</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {filteredTransactions.map(tx => {
                        return (
                          <tr key={tx.id} className="hover:bg-white/[0.01] transition-all">
                            <td className="p-4">
                              <div className="font-bold text-white text-[11px] font-mono">{tx.orderId || tx.id.substring(0, 8)}</div>
                              <div className="text-[9px] text-white/30 font-mono mt-0.5">ID: {tx.id}</div>
                            </td>
                            <td className="p-4">
                              <div className="font-sans font-black text-white">{tx.displayName || tx.email}</div>
                              <div className="text-[10px] text-white/40 font-mono mt-0.5">{tx.batchName}</div>
                            </td>
                            <td className="p-4 text-right font-black text-emerald-400">
                              ₹{tx.amountPaid}
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-white font-mono text-[11px]">{tx.utr || "N/A"}</div>
                              <div className="text-[9px] text-white/40 font-sans mt-0.5">{tx.paymentMethod} • {tx.gateway}</div>
                            </td>
                            <td className="p-4 text-white/50">
                              {tx.purchaseDate ? new Date(tx.purchaseDate.seconds * 1000).toLocaleString() : "N/A"}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold border ${
                                tx.status === "completed" || tx.status === "approved"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : tx.status === "pending"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : tx.status === "refunded"
                                  ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                  : "bg-red-500/10 text-red-500 border-red-500/20"
                              }`}>
                                {tx.status}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {(tx.status === "completed" || tx.status === "approved") ? (
                                <button
                                  onClick={() => triggerReceiptPrint(tx)}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold"
                                >
                                  <Download className="w-3.5 h-3.5" /> PDF
                                </button>
                              ) : (
                                <span className="text-[10px] text-white/20 select-none">-</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedTx(tx);
                                    setVerificationNotes(tx.internalNotes || "");
                                  }}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
                                  title="View Transaction Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {isSuperAdmin && (
                                  <button
                                    onClick={() => handleDeleteTx(tx.id)}
                                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-black transition-all cursor-pointer"
                                    title="Delete Transaction Permanently"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredTransactions.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-12 text-center text-xs text-white/40 font-mono">
                            No matching financial records discovered.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. MANUAL RECEIPTS VERIFICATION */}
          {subTab === "manual" && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="border border-white/5 bg-white/[0.01] p-5 rounded-3xl space-y-1">
                <h3 className="text-sm font-black uppercase text-amber-400 tracking-wider">Manual Receipts Queue</h3>
                <p className="text-xs text-white/50">
                  When automatic API processing fails, students upload screenshots & transaction UTRs. Review them below to unlock batch folders instantly.
                </p>
              </div>

              {/* Grid of Manual Submissions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {transactions.filter(t => t.screenshotUrl || t.status === "pending").map(tx => {
                  return (
                    <div key={tx.id} className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-mono text-white/40 block">Student Identity</span>
                            <h4 className="text-xs font-black text-white font-sans">{tx.displayName || tx.email}</h4>
                            <span className="text-[9px] text-white/50 font-mono">{tx.email}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            tx.status === "pending" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}>
                            {tx.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 bg-black/30 p-2.5 rounded-2xl border border-white/5 text-[10px]">
                          <div>
                            <span className="text-white/40">Amount Submitted:</span>
                            <div className="font-bold text-emerald-400 mt-0.5">₹{tx.amountPaid}</div>
                          </div>
                          <div>
                            <span className="text-white/40">UTR / Ref Number:</span>
                            <div className="font-bold text-white mt-0.5 select-all">{tx.utr || "N/A"}</div>
                          </div>
                        </div>

                        {tx.userNotes && (
                          <div className="text-[10px] text-white/60 bg-white/5 p-2 rounded-xl border border-white/5">
                            <strong className="text-white">Student Note: </strong>{tx.userNotes}
                          </div>
                        )}

                        {tx.screenshotUrl ? (
                          <div className="space-y-1.5">
                            <span className="text-[9px] uppercase font-bold text-white/40">Uploaded Receipt Image</span>
                            <a href={tx.screenshotUrl} target="_blank" rel="noreferrer" className="block relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 group cursor-pointer bg-black">
                              <img src={tx.screenshotUrl} alt="receipt" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                <span className="text-[10px] font-black uppercase text-white bg-zinc-950 px-3 py-1.5 rounded-xl border border-white/10">View Image Fullscreen ↗</span>
                              </div>
                            </a>
                          </div>
                        ) : (
                          <div className="p-4 text-center text-white/20 text-[10px] border border-dashed border-white/10 rounded-2xl">
                            No screenshot image uploaded by student.
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-white/5 space-y-2.5">
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateTransactionStatus(tx.id, "approved")}
                            disabled={!isSuperAdmin}
                            className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-black font-black uppercase text-[10px] tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve Payment
                          </button>
                          <button
                            onClick={() => updateTransactionStatus(tx.id, "rejected")}
                            disabled={!isSuperAdmin}
                            className="flex-1 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 text-red-500 font-black uppercase text-[10px] tracking-wider border border-red-500/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedTx(tx);
                            setVerificationNotes(tx.internalNotes || "");
                          }}
                          className="w-full text-center text-[10px] uppercase tracking-wider font-bold text-white/40 hover:text-white py-1 cursor-pointer"
                        >
                          View Details & Add Internal Notes
                        </button>
                      </div>
                    </div>
                  );
                })}
                {transactions.filter(t => t.screenshotUrl || t.status === "pending").length === 0 && (
                  <p className="col-span-2 text-center py-16 text-xs text-white/40 font-mono">All student manual receipt reviews are fully cleared.</p>
                )}
              </div>
            </div>
          )}

          {/* 5. REFUND MANAGER */}
          {subTab === "refunds" && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="border border-white/5 bg-white/[0.01] p-5 rounded-3xl space-y-1">
                <h3 className="text-sm font-black uppercase text-purple-400 tracking-wider">Authorize & Process Refunds</h3>
                <p className="text-xs text-white/50">
                  Search active transaction logs to authorize partial or full refunds. Access to batch folders is automatically restricted if refunded.
                </p>
              </div>

              <div className="bg-zinc-900/40 border border-white/10 rounded-3xl overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h4 className="text-xs font-black uppercase text-white/80 tracking-wider">Refund History and Queue</h4>
                </div>
                <div className="divide-y divide-white/5">
                  {transactions.filter(t => t.status === "refunded" || t.refundAmount).map(tx => (
                    <div key={tx.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs text-white">{tx.displayName || tx.email}</strong>
                          <span className="text-[10px] text-white/40">({tx.email})</span>
                        </div>
                        <p className="text-[11px] text-white/50 mt-1">
                          Ref batch: <span className="text-white/70 font-bold">{tx.batchName}</span> • Original paid: ₹{tx.amountPaid}
                        </p>
                        {tx.refundReason && (
                          <p className="text-[10px] text-purple-300 mt-1.5 italic bg-purple-500/5 p-2 rounded-xl border border-purple-500/10 w-fit">
                            Reason: {tx.refundReason}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-white/40 block">REFUNDED AMOUNT</span>
                        <span className="text-sm font-black text-purple-400 font-mono block mt-0.5">₹{tx.refundAmount || tx.amountPaid}</span>
                        <span className="text-[8px] font-mono text-white/30 block mt-1">Authorized by superadmin</span>
                      </div>
                    </div>
                  ))}
                  {transactions.filter(t => t.status === "refunded" || t.refundAmount).length === 0 && (
                    <p className="p-12 text-center text-xs text-white/40 font-mono">No refund authorizations found in database registers.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 6. COUPON ENGINE */}
          {subTab === "coupons" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in text-left">
              
              {/* Left Form: Add Coupon */}
              <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 h-fit">
                <h3 className="text-xs font-black uppercase text-primary tracking-wider mb-4 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-primary" /> Create New Discount Coupon
                </h3>
                <form onSubmit={handleCreateCoupon} className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Coupon Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MISSION2026"
                      value={newCoupon.code}
                      onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono placeholder-white/20 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Discount %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newCoupon.discountPercent}
                        onChange={(e) => setNewCoupon({ ...newCoupon, discountPercent: Number(e.target.value) })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Fixed Discount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={newCoupon.fixedDiscount}
                        onChange={(e) => setNewCoupon({ ...newCoupon, fixedDiscount: Number(e.target.value) })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Max Discount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={newCoupon.maxDiscount}
                        onChange={(e) => setNewCoupon({ ...newCoupon, maxDiscount: Number(e.target.value) })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Min Order Value (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={newCoupon.minOrderValue}
                        onChange={(e) => setNewCoupon({ ...newCoupon, minOrderValue: Number(e.target.value) })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Expiry Date</label>
                      <input
                        type="date"
                        value={newCoupon.expiryDate}
                        onChange={(e) => setNewCoupon({ ...newCoupon, expiryDate: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Usage Limit</label>
                      <input
                        type="number"
                        min="1"
                        value={newCoupon.usageLimit}
                        onChange={(e) => setNewCoupon({ ...newCoupon, usageLimit: Number(e.target.value) })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Applicable Batches</label>
                    <input
                      type="text"
                      placeholder="e.g. All, or specific batch name"
                      value={newCoupon.applicableBatches}
                      onChange={(e) => setNewCoupon({ ...newCoupon, applicableBatches: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!isSuperAdmin}
                    className="w-full py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-zinc-950 font-black uppercase text-[10px] rounded-xl transition-all cursor-pointer shadow-md tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <Tag className="w-4 h-4" /> Create Coupon Code
                  </button>
                </form>
              </div>

              {/* Right: Coupon grid list */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-zinc-900/20 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                  <span className="text-xs text-white/60">Active discount coupons are dynamically processed by the student checkout drawer.</span>
                  <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-[9px] font-bold font-mono rounded-full uppercase">Deployed: {coupons.length}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {coupons.map(cp => (
                    <div key={cp.id} className="bg-zinc-900/40 border border-white/10 hover:border-white/20 rounded-3xl p-5 flex flex-col justify-between space-y-3 relative overflow-hidden group">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 rounded-md px-2 py-0.5 font-mono font-bold tracking-widest uppercase">
                            {cp.code}
                          </span>
                          <div className="text-xs font-bold text-white mt-2">
                            {cp.discountPercent ? `${cp.discountPercent}% OFF` : `₹${cp.fixedDiscount} OFF`}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleCouponStatus(cp.id, cp.code, cp.status)}
                          disabled={!isSuperAdmin}
                          className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase font-bold border transition-colors ${
                            cp.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/20"
                          }`}
                        >
                          {cp.status}
                        </button>
                      </div>

                      <div className="space-y-1 text-[10px] text-white/50 border-t border-white/5 pt-2 font-mono">
                        <div>Max discount allowed: <span className="text-white font-bold">₹{cp.maxDiscount || "No limit"}</span></div>
                        <div>Min order value: <span className="text-white font-bold">₹{cp.minOrderValue || 0}</span></div>
                        <div>Expires on: <span className="text-white font-bold">{cp.expiryDate || "Lifetime"}</span></div>
                        <div>Used counter: <span className="text-primary font-black">{cp.usageCount || 0} / {cp.usageLimit || "No limit"}</span></div>
                      </div>

                      {isSuperAdmin && (
                        <button
                          onClick={() => handleDeleteCoupon(cp.id, cp.code)}
                          className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 p-2 bg-red-500/10 rounded-xl hover:bg-red-500 hover:text-black text-red-400 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {coupons.length === 0 && (
                    <div className="col-span-2 text-center p-16 border border-dashed border-white/10 rounded-3xl bg-zinc-900/10">
                      No discount coupons active. Deploy one on the left.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* 7. OFFERS */}
          {subTab === "offers" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in text-left">
              
              {/* Add Offer Form */}
              <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 h-fit">
                <h3 className="text-xs font-black uppercase text-primary tracking-wider mb-4 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-primary" /> Create Promo Offer
                </h3>
                <form onSubmit={handleCreateOffer} className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Promo Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Monsoon IITians Batch Offer"
                      value={newOffer.title}
                      onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Offer Type</label>
                      <select
                        value={newOffer.type}
                        onChange={(e) => setNewOffer({ ...newOffer, type: e.target.value as any })}
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white cursor-pointer"
                      >
                        <option value="Festival Offer">🎉 Festival Offer</option>
                        <option value="Limited Time Offer">⌛ Limited Time Offer</option>
                        <option value="Flash Sale">⚡ Flash Sale</option>
                        <option value="Combo Offer">💎 Combo Offer</option>
                        <option value="Early Bird Offer">🏆 Early Bird Offer</option>
                        <option value="Student Discount">🎓 Student Discount</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Promo Discount %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newOffer.discountPercent}
                        onChange={(e) => setNewOffer({ ...newOffer, discountPercent: Number(e.target.value) })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={newOffer.startDate}
                        onChange={(e) => setNewOffer({ ...newOffer, startDate: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">End Date</label>
                      <input
                        type="date"
                        value={newOffer.endDate}
                        onChange={(e) => setNewOffer({ ...newOffer, endDate: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Offer Subtext Description</label>
                    <textarea
                      rows={2}
                      placeholder="Special discount applicable on JEE main & NEET batches."
                      value={newOffer.description}
                      onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!isSuperAdmin}
                    className="w-full py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-zinc-950 font-black uppercase text-[10px] rounded-xl transition-all cursor-pointer tracking-wider flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-4 h-4" /> Create Promo Offer
                  </button>
                </form>
              </div>

              {/* Offer Grid list */}
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {offers.map(of => (
                    <div key={of.id} className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 flex flex-col justify-between space-y-3 relative group">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase font-bold text-primary font-mono bg-primary/10 px-2 py-0.5 border border-primary/20 rounded-md">
                            {of.type}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-black font-mono">{of.discountPercent}% OFF</span>
                        </div>
                        <h4 className="text-sm font-black text-white mt-2.5">{of.title}</h4>
                        {of.description && <p className="text-[10px] text-white/50 mt-1">{of.description}</p>}
                      </div>

                      <div className="text-[9px] font-mono text-white/40 border-t border-white/5 pt-2 flex items-center justify-between">
                        <span>Validity: {of.startDate || "Today"} - {of.endDate || "Lifetime"}</span>
                      </div>

                      {isSuperAdmin && (
                        <button
                          onClick={() => handleDeleteOffer(of.id, of.title)}
                          className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 p-2 bg-red-500/10 rounded-xl hover:bg-red-500 hover:text-black text-red-400 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {offers.length === 0 && (
                    <div className="col-span-2 text-center p-16 border border-dashed border-white/10 rounded-3xl bg-zinc-900/10">
                      No promo offers deployed on the platform catalog.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* 8. TAXES & BUSINESS DATA */}
          {subTab === "taxes" && (
            <div className="max-w-2xl bg-zinc-900/40 border border-white/10 rounded-3xl p-6 space-y-5 animate-fade-in text-left mx-auto">
              <h3 className="text-sm font-black uppercase text-primary tracking-wider flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" /> Configuration of Sales Tax & GST
              </h3>
              <p className="text-xs text-white/50">
                Setup platform tax rules for automatic invoices. Set the GST percentage and toggle inclusive or exclusive billing models.
              </p>

              <div className="space-y-4 pt-3 border-t border-white/5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Tax Label Name</label>
                    <input
                      type="text"
                      disabled={!isSuperAdmin}
                      value={taxConfig.taxName}
                      onChange={(e) => setTaxConfig({ ...taxConfig, taxName: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">GST Rate Percentage (%)</label>
                    <input
                      type="number"
                      disabled={!isSuperAdmin}
                      min="0"
                      max="100"
                      value={taxConfig.gstPercent}
                      onChange={(e) => setTaxConfig({ ...taxConfig, gstPercent: Number(e.target.value) })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-black/40 border border-white/5 rounded-2xl">
                  <div>
                    <span className="text-xs font-bold text-white block">Inclusive Billing Mode</span>
                    <span className="text-[10px] text-white/40 block mt-0.5">Calculates base price dynamically within the total paid batch fee.</span>
                  </div>
                  <button
                    onClick={() => {
                      const next = { ...taxConfig, inclusive: !taxConfig.inclusive };
                      setTaxConfig(next);
                      handleSaveConfig("tax_config", next, "Inclusive Billing Mode");
                    }}
                    disabled={!isSuperAdmin}
                    className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg cursor-pointer ${
                      taxConfig.inclusive ? "bg-emerald-500 text-black" : "bg-white/5 text-white/40"
                    }`}
                  >
                    {taxConfig.inclusive ? "Inclusive" : "Exclusive"}
                  </button>
                </div>

                {isSuperAdmin && (
                  <button
                    onClick={() => handleSaveConfig("tax_config", taxConfig, "GST tax configurations")}
                    className="w-full py-2.5 bg-primary text-zinc-950 font-black uppercase text-[10px] rounded-xl hover:scale-[1.01] transition-all cursor-pointer"
                  >
                    Save Tax & GST Rules
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 9. INVOICE CONFIG */}
          {subTab === "invoices" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in text-left">
              
              {/* Form customizer */}
              <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-black uppercase text-primary tracking-wider">Business Invoice Meta Data</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Registered Business Name</label>
                    <input
                      type="text"
                      disabled={!isSuperAdmin}
                      value={invoiceConfig.businessName}
                      onChange={(e) => setInvoiceConfig({ ...invoiceConfig, businessName: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Registered GSTIN Number</label>
                    <input
                      type="text"
                      disabled={!isSuperAdmin}
                      value={invoiceConfig.gstNumber}
                      onChange={(e) => setInvoiceConfig({ ...invoiceConfig, gstNumber: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Business Address</label>
                    <textarea
                      rows={2}
                      disabled={!isSuperAdmin}
                      value={invoiceConfig.businessAddress}
                      onChange={(e) => setInvoiceConfig({ ...invoiceConfig, businessAddress: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Invoice Prefix</label>
                      <input
                        type="text"
                        disabled={!isSuperAdmin}
                        value={invoiceConfig.prefix}
                        onChange={(e) => setInvoiceConfig({ ...invoiceConfig, prefix: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Logo URL</label>
                      <input
                        type="url"
                        disabled={!isSuperAdmin}
                        value={invoiceConfig.logoUrl}
                        onChange={(e) => setInvoiceConfig({ ...invoiceConfig, logoUrl: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">T&C Legal Text</label>
                    <textarea
                      rows={3}
                      disabled={!isSuperAdmin}
                      value={invoiceConfig.termsAndConditions}
                      onChange={(e) => setInvoiceConfig({ ...invoiceConfig, termsAndConditions: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white resize-none font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Invoice Footer</label>
                    <input
                      type="text"
                      disabled={!isSuperAdmin}
                      value={invoiceConfig.footer}
                      onChange={(e) => setInvoiceConfig({ ...invoiceConfig, footer: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  {isSuperAdmin && (
                    <button
                      onClick={() => handleSaveConfig("invoice_config", invoiceConfig, "Invoice style and rules")}
                      className="w-full py-2.5 bg-primary text-zinc-950 font-black uppercase text-[10px] rounded-xl hover:scale-[1.01] transition-all cursor-pointer"
                    >
                      Save Invoice Settings
                    </button>
                  )}
                </div>
              </div>

              {/* Preview UI Box */}
              <div className="bg-white text-zinc-900 rounded-3xl p-6 space-y-6 h-fit border border-white/10 font-sans shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-zinc-900">RECEIPT INVOICE</h4>
                    <span className="text-[10px] text-zinc-500 block font-mono mt-0.5">Invoice: {invoiceConfig.prefix}992381</span>
                  </div>
                  <div className="text-right text-[10px] text-zinc-600 leading-tight">
                    <strong className="text-zinc-900 block font-bold">{invoiceConfig.businessName}</strong>
                    {invoiceConfig.businessAddress.substring(0, 30)}...
                  </div>
                </div>

                <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-200 text-[10px] grid grid-cols-2 gap-3 leading-relaxed">
                  <div>
                    <span className="text-zinc-500 font-bold block uppercase text-[8px]">Student Details</span>
                    <strong>Rohit Sharma</strong><br/>
                    rohit@gmail.com
                  </div>
                  <div>
                    <span className="text-zinc-500 font-bold block uppercase text-[8px]">Details</span>
                    Gateway: PhonePe<br/>
                    Method: UPI QR
                  </div>
                </div>

                <div className="space-y-1.5 border-b border-zinc-200 pb-4">
                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-800">
                    <span>Champions JEE Main Batch 2026</span>
                    <span>₹2,999</span>
                  </div>
                  <p className="text-[9px] text-zinc-500">Premium IIT-JEE engineering online coaching catalog folder.</p>
                </div>

                <div className="text-right text-xs space-y-1 text-zinc-600 leading-relaxed max-w-xs ml-auto">
                  <div className="flex justify-between">
                    <span>Base Subtotal:</span>
                    <span>₹2,541</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax ({taxConfig.taxName}):</span>
                    <span>₹458</span>
                  </div>
                  <div className="flex justify-between text-zinc-900 font-black border-t border-zinc-100 pt-1.5 mt-1">
                    <span>Grand Total:</span>
                    <span>₹2,999</span>
                  </div>
                </div>

                <div className="text-[9px] text-zinc-500 leading-relaxed bg-zinc-50 p-3 border border-zinc-200 rounded-xl">
                  <strong className="text-zinc-700 font-bold block mb-0.5">Agreement Terms:</strong>
                  <p className="white-space-pre-line m-0 leading-normal">{invoiceConfig.termsAndConditions.split("\n")[0]}</p>
                </div>

                <div className="text-center text-[9px] text-zinc-400 font-bold border-t border-zinc-100 pt-3">
                  {invoiceConfig.footer}
                </div>
              </div>

            </div>
          )}

          {/* 10. NOTIFICATION CUSTOMIZER */}
          {subTab === "notifications" && (
            <div className="max-w-2xl bg-zinc-900/40 border border-white/10 rounded-3xl p-6 space-y-5 animate-fade-in text-left mx-auto">
              <h3 className="text-sm font-black uppercase text-primary tracking-wider">Configure Automated Event Communications</h3>
              <p className="text-xs text-white/50">
                Setup email and dashboard alerts when transactions change. You can use dynamic variables like <code>{`{BATCH_NAME}`}</code>, <code>{`{STUDENT_NAME}`}</code>, <code>{`{AMOUNT}`}</code>, and <code>{`{TRANSACTION_ID}`}</code>.
              </p>

              <div className="space-y-4 pt-3 border-t border-white/5">
                {/* Event 1 */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">1. Payment Approvals & Success</h4>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-white/40 mb-1">Email Subject Header</label>
                    <input
                      type="text"
                      disabled={!isSuperAdmin}
                      value={notificationConfig.successSubject}
                      onChange={(e) => setNotificationConfig({ ...notificationConfig, successSubject: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-white/40 mb-1">Alert Message Template</label>
                    <textarea
                      rows={3}
                      disabled={!isSuperAdmin}
                      value={notificationConfig.successBody}
                      onChange={(e) => setNotificationConfig({ ...notificationConfig, successBody: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white font-mono leading-relaxed resize-none"
                    />
                  </div>
                </div>

                {/* Event 2 */}
                <div className="space-y-2.5 pt-4 border-t border-white/5">
                  <h4 className="text-xs font-black text-red-400 uppercase tracking-wider">2. Payment Failures & Rejections</h4>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-white/40 mb-1">Email Subject Header</label>
                    <input
                      type="text"
                      disabled={!isSuperAdmin}
                      value={notificationConfig.failedSubject}
                      onChange={(e) => setNotificationConfig({ ...notificationConfig, failedSubject: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-white/40 mb-1">Alert Message Template</label>
                    <textarea
                      rows={3}
                      disabled={!isSuperAdmin}
                      value={notificationConfig.failedBody}
                      onChange={(e) => setNotificationConfig({ ...notificationConfig, failedBody: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white font-mono leading-relaxed resize-none"
                    />
                  </div>
                </div>

                {isSuperAdmin && (
                  <button
                    onClick={() => handleSaveConfig("notifications_config", notificationConfig, "Automated Alert Templates")}
                    className="w-full py-2.5 bg-primary text-zinc-950 font-black uppercase text-[10px] rounded-xl hover:scale-[1.01] transition-all cursor-pointer"
                  >
                    Deploy Alert Templates
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 11. AUDIT LOGS TRAIL */}
          {subTab === "logs" && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="border border-white/5 bg-white/[0.01] p-5 rounded-3xl space-y-1">
                <h3 className="text-sm font-black uppercase text-white/80 tracking-wider">Platform Security & Payment Audit Trail</h3>
                <p className="text-xs text-white/50">
                  Every change inside this secure payments panel (credential adjustments, coupon deletions, manual approved logs) is saved with administrator identity.
                </p>
              </div>

              <div className="bg-zinc-900/40 border border-white/10 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-white/40 font-bold border-b border-white/5 uppercase text-[8px] tracking-wider">
                        <th className="p-4">Administrator</th>
                        <th className="p-4">Action Event Description</th>
                        <th className="p-4">Timestamp Log</th>
                        <th className="p-4">Network Node (IP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-white/[0.01] transition-all">
                          <td className="p-4">
                            <div className="font-sans font-bold text-white">{log.adminName}</div>
                            <div className="text-[10px] text-white/40">{log.adminEmail}</div>
                          </td>
                          <td className="p-4 text-white/80 text-[11px] font-sans">
                            {log.action}
                          </td>
                          <td className="p-4 text-white/50">
                            {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : "N/A"}
                          </td>
                          <td className="p-4 text-primary font-bold">
                            {log.ipAddress || "127.0.0.1"}
                          </td>
                        </tr>
                      ))}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-12 text-center text-xs text-white/40 font-mono">
                            No modifications logged in audit index register.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TRANSACTION VIEW DETAIL MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-lg text-left shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-base font-black uppercase text-white tracking-wider flex items-center gap-1.5 mb-5 border-b border-white/5 pb-3">
              <CreditCard className="w-5 h-5 text-primary" />
              Reference Audit Panel: {selectedTx.orderId || selectedTx.id}
            </h3>

            <div className="space-y-4 text-xs">
              {/* Identity Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold block">Student User info</span>
                  <div className="font-sans font-black text-white">{selectedTx.displayName || "Student User"}</div>
                  <div className="text-[10px] text-white/50 font-mono leading-tight">{selectedTx.email}</div>
                  <div className="text-[9px] text-white/30 font-mono leading-tight">UID: {selectedTx.userId || "N/A"}</div>
                </div>
                <div className="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold block">Billed Course Batch</span>
                  <div className="font-sans font-black text-white truncate" title={selectedTx.batchName}>{selectedTx.batchName}</div>
                  <div className="text-[10px] text-emerald-400 font-bold font-mono">Fee: ₹{selectedTx.amountPaid}</div>
                  <div className="text-[9px] text-white/40">Status: <span className="font-black uppercase">{selectedTx.status}</span></div>
                </div>
              </div>

              {/* Bank Meta parameters */}
              <div className="bg-black/40 p-3.5 rounded-2xl border border-white/5 space-y-2">
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold block">Payment Parameters</span>
                <div className="grid grid-cols-2 gap-3 font-mono text-[10px]">
                  <div>Gateway: <strong className="text-white">{selectedTx.gateway || "N/A"}</strong></div>
                  <div>Method: <strong className="text-white">{selectedTx.paymentMethod || "N/A"}</strong></div>
                  <div className="col-span-2 flex items-center gap-2">
                    <span>UTR Ref ID:</span>
                    <strong className="text-primary font-bold bg-white/5 px-2 py-0.5 rounded border border-white/5 select-all">{selectedTx.utr || "N/A"}</strong>
                  </div>
                </div>
              </div>

              {/* Screenshot or Uploader notes */}
              {selectedTx.screenshotUrl && (
                <div className="space-y-2">
                  <span className="text-[9px] uppercase font-bold text-white/40 block">Manual Payment Attachment</span>
                  <a href={selectedTx.screenshotUrl} target="_blank" rel="noreferrer" className="block relative aspect-video w-48 rounded-xl overflow-hidden border border-white/10 mx-auto bg-black">
                    <img src={selectedTx.screenshotUrl} alt="receipt modal preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </a>
                </div>
              )}

              {/* Internal Notes area */}
              <div>
                <label className="block text-[9px] uppercase font-bold text-white/40 mb-1.5">Platform Internal Notes (Private to Admin)</label>
                <textarea
                  rows={2}
                  value={verificationNotes}
                  disabled={!isSuperAdmin}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Insert payment check details or verification guidelines..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white resize-none"
                />
                {isSuperAdmin && (
                  <button
                    onClick={async () => {
                      try {
                        await updateDoc(doc(db, "purchases", selectedTx.id), { internalNotes: verificationNotes });
                        alert("Private notes saved!");
                      } catch (err: any) {
                        alert("Failed: " + err.message);
                      }
                    }}
                    className="mt-1 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold uppercase rounded-lg cursor-pointer"
                  >
                    Save Notes
                  </button>
                )}
              </div>

              {/* Refund Initiation Box (Super Admin Only) */}
              {isSuperAdmin && (selectedTx.status === "completed" || selectedTx.status === "approved") && (
                <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-3.5 space-y-3">
                  <span className="text-[10px] font-black uppercase text-purple-400 block tracking-wider">Refund Trigger Console</span>
                  <div className="grid grid-cols-2 gap-3 text-[10px]">
                    <div>
                      <label className="block text-white/40 mb-1">Refund Share Percentage</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={refundPercent}
                        onChange={(e) => setRefundPercent(Number(e.target.value))}
                        className="w-full bg-black border border-white/5 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-white/40 mb-1">Reason for Refund</label>
                      <input
                        type="text"
                        placeholder="e.g. Customer requested cancel"
                        value={refundReasonText}
                        onChange={(e) => setRefundReasonText(e.target.value)}
                        className="w-full bg-black border border-white/5 rounded-lg px-2.5 py-1.5 text-white text-xs"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleRefundAction(selectedTx.id, true)}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-black font-black uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <History className="w-3.5 h-3.5" /> Authorize & Issue Refund (₹{Math.round(selectedTx.amountPaid * (refundPercent/100))})
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer text-center"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
