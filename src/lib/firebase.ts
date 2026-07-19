import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  signInWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore,
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp, 
  getDocFromServer,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { useAuthStore } from '../store/authStore';

const app = initializeApp(firebaseConfig);

let firestoreInstance: any;
const dbId = firebaseConfig.firestoreDatabaseId;

const initAttempts = [
  // Attempt 1: Custom DB + Long Polling + Persistent Local Cache (Ideal setup for our custom db inside iframes)
  () => initializeFirestore(app, {
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  }, dbId),

  // Attempt 2: Custom DB + Long Polling only (If persistent cache is blocked by browser/iframe policy)
  () => initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, dbId),

  // Attempt 3: Custom DB + standard getFirestore (Standard fallback for custom db)
  () => getFirestore(app, dbId),

  // Attempt 4: Default DB + Long Polling + Persistent Local Cache (If custom DB doesn't exist, try default DB)
  () => initializeFirestore(app, {
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  }),

  // Attempt 5: Default DB + Long Polling only
  () => initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }),

  // Attempt 6: Default DB standard getFirestore (Absolute baseline)
  () => getFirestore(app)
];

for (let i = 0; i < initAttempts.length; i++) {
  try {
    firestoreInstance = initAttempts[i]();
    if (firestoreInstance) {
      console.log(`Firestore successfully initialized on Attempt ${i + 1}`);
      break;
    }
  } catch (err) {
    console.warn(`Firestore initialization Attempt ${i + 1} failed:`, err);
  }
}

if (!firestoreInstance) {
  try {
    firestoreInstance = getFirestore(app);
  } catch (criticalErr) {
    console.error("All Firestore initialization attempts failed!", criticalErr);
  }
}

export const db = firestoreInstance;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Global Debug Registry for Super Admins
export interface DebugRegistryType {
  lastAuthError: any | null;
  lastFirestoreError: any | null;
  failedRequestsCount: number;
  failedRequestsList: string[];
}

export const debugRegistry: DebugRegistryType = {
  lastAuthError: null,
  lastFirestoreError: null,
  failedRequestsCount: 0,
  failedRequestsList: []
};

// Detailed auth error logger matching requirement 11, 12, 13, 14
export function logDetailedAuthError(error: any, context: string, details?: any) {
  const currentUser = auth.currentUser;
  const errCode = error?.code || error?.name || 'N/A';
  const errMsg = error?.message || String(error);
  const stack = error?.stack || 'N/A';
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'Server';
  
  console.error(`[DETAILED AUTH ERROR] Context: ${context}`, {
    firebaseErrorCode: errCode,
    firebaseErrorMessage: errMsg,
    stackTrace: stack,
    currentUser: currentUser ? { uid: currentUser.uid, email: currentUser.email } : null,
    currentDomain,
    authState: currentUser ? 'signed_in' : 'signed_out',
    firestoreStatus: db ? 'initialized' : 'not_initialized',
    writeStatus: details?.writeStatus || 'unknown',
    collectionName: details?.collectionName || 'N/A',
    documentId: details?.documentId || 'N/A',
    ...details
  });
}

// Retry handler for Firestore writes matching Requirement 16
const retryFirestoreWrite = async (fn: () => Promise<void>, maxRetries = 3, delayMs = 1000) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      await fn();
      return;
    } catch (err) {
      attempt++;
      console.warn(`Firestore write attempt ${attempt} failed. Retrying...`, err);
      if (attempt >= maxRetries) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
};

export const syncUserWithFirestore = async (user: any, additionalData?: any) => {
  const writeOp = async () => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    const adminEmails = ['meinkxun@gmail.com', 'nucleuscc2026@gmail.com'];
    const isSuperadmin = user.email ? adminEmails.includes(user.email.toLowerCase().trim()) : false;
    const role = isSuperadmin ? 'superadmin' : (additionalData?.role || 'student');
    const planId = isSuperadmin ? 'premium' : (additionalData?.planId || 'free');

    const userDataToSet = {
      email: user.email,
      displayName: additionalData?.displayName || user.displayName || 'Student',
      fullName: additionalData?.displayName || user.displayName || 'Student',
      role: role,
      planId: planId,
      classGroup: additionalData?.classGroup || '11',
      selectedClass: additionalData?.classGroup || '11',
      provider: additionalData?.provider || 'google',
      emailVerified: true,
      unlockedMaterials: [],
      photoURL: user.photoURL || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...additionalData
    };

    if (!userSnap.exists()) {
      await setDoc(userRef, userDataToSet);
    } else {
      // Keep admin roles up to date
      if (isSuperadmin && userSnap.data().role !== 'superadmin') {
        await updateDoc(userRef, {
          role: 'superadmin',
          planId: 'premium',
          updatedAt: serverTimestamp(),
        });
      }
    }

    // Verify document exists immediately after writing matching requirement 1
    const verifySnap = await getDoc(userRef);
    if (!verifySnap.exists()) {
      throw new Error("Verification failed: User document was not successfully written to Firestore.");
    }
  };

  try {
    await retryFirestoreWrite(writeOp, 3, 1000);
  } catch (err: any) {
    debugRegistry.lastFirestoreError = err;
    debugRegistry.failedRequestsCount++;
    debugRegistry.failedRequestsList.push(`firestore_sync_user_${user.uid}`);
    logDetailedAuthError(err, 'syncUserWithFirestore', {
      writeStatus: 'failed',
      collectionName: 'users',
      documentId: user.uid
    });
    throw err;
  }
};

export const signInWithGoogleToken = async (idToken: string) => {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    await syncUserWithFirestore(result.user);
    return result.user;
  } catch (err: any) {
    debugRegistry.lastAuthError = err;
    debugRegistry.failedRequestsCount++;
    debugRegistry.failedRequestsList.push("gsi_token_auth");
    logDetailedAuthError(err, "signInWithGoogleToken");
    throw err;
  }
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserWithFirestore(result.user);
    return result.user;
  } catch (error: any) {
    debugRegistry.lastAuthError = error;
    debugRegistry.failedRequestsCount++;
    debugRegistry.failedRequestsList.push("gsi_popup_auth");
    logDetailedAuthError(error, "signInWithGoogle");
    
    if (error.code === 'auth/cancelled-popup-request') {
      alert('Sign-in popup was closed or cancelled. If you are viewing this inside the AI Studio preview, please click the "Open in new tab" button (arrow icon) in the top right of the preview header to sign in properly.');
    } else if (error.code === 'auth/popup-blocked') {
      alert('Popup blocked by browser. Please allow popups or open the app in a new tab.');
    } else if (error.code === 'auth/network-request-failed' || error.message?.includes('network-request-failed')) {
      alert('Google Sign-In connection was blocked by your browser inside the AI Studio sandbox iframe (due to third-party cookie/iframe block limits).\n\nTo log in successfully:\n1. Click the "Open in new tab" button (the upper-right corner icon inside the top navigation/preview controller bar).\n2. Attempt the sign-in again from the newly opened browser tab.');
    } else {
      alert(`Failed to sign in: ${error.message}`);
    }
    throw error;
  }
};

export const logout = async () => {
  try {
    // Purge custom Email OTP session tokens
    localStorage.removeItem("currentUser");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("isLoggedIn");

    // Instantly update client-side auth state to null to eliminate any delays
    useAuthStore.getState().setUser(null);
    useAuthStore.getState().setLoading(false);
    
    // Perform Firebase signOut asynchronously
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out', error);
  }
};

async function testConnection() {
  // Wait 1.5s for initial connection handshake to establish
  await new Promise((resolve) => setTimeout(resolve, 1500));
  
  let attempts = 3;
  while (attempts > 0) {
    try {
      await getDocFromServer(doc(db, 'users', 'ping_connection'));
      console.log("Firestore connection check: Connected successfully.");
      return;
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        attempts--;
        if (attempts === 0) {
          console.error("Please check your Firebase configuration: the client is offline.");
        } else {
          // Wait 2 seconds before retrying
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } else {
        console.debug("Firestore connection check diagnostic information:", error);
        return;
      }
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Client-side Email/Password registration conforming exactly to requirements
export const signUpWithEmailAndPassword = async (email: string, password: string, name: string, phone: string, classGroup: string) => {
  let userCredential: any = null;
  try {
    // Step 1 & 2: Authenticate user and wait for completion
    userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Step 5: Update display name
    await updateProfile(user, { displayName: name });

    // Step 3, 4, 6, 7: Create, verify, set role and store metadata in Firestore
    await syncUserWithFirestore(user, {
      displayName: name,
      phone: phone,
      classGroup: classGroup,
      provider: 'password',
      role: 'student',
      planId: 'free'
    });

    // Also notify backend to update its custom credentials and users tables
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: email.toLowerCase().trim(),
          name: name.trim(),
          phone: phone.trim(),
          password,
          idToken: 'direct',
          classGroup
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.warn("[BACKEND SYNC WARNING] Registration sync warning:", data.error);
      } else {
        localStorage.setItem('accessToken', data.token);
      }
    } catch (backendErr) {
      console.warn("[BACKEND SYNC FAILED] Could not register user on custom backend, ignoring since Firestore is written successfully:", backendErr);
    }

    return user;
  } catch (error: any) {
    debugRegistry.lastAuthError = error;
    debugRegistry.failedRequestsCount++;
    debugRegistry.failedRequestsList.push("email_password_signup");
    logDetailedAuthError(error, "signUpWithEmailAndPassword", {
      writeStatus: userCredential ? 'complete' : 'unstarted',
      collectionName: 'users',
      documentId: userCredential?.user?.uid || 'N/A'
    });
    throw error;
  }
};

// Client-side Email/Password login keeping standard Auth & Firestore in sync
export const loginWithEmailAndPassword = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if Firestore profile exists; if not, automatically create it matching Requirement 25
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      console.warn("[LOGIN AUTO-PROFILE CREATE] User exists in Firebase Auth but document is missing in Firestore. Creating profile now.");
      await syncUserWithFirestore(user, {
        displayName: user.displayName || email.split('@')[0],
        provider: 'password',
        role: 'student',
        planId: 'free'
      });
    }

    // Call backend login to receive JWT session token
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok && data.token) {
        localStorage.setItem('accessToken', data.token);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUser', JSON.stringify(data.user));
      }
    } catch (backendErr) {
      console.warn("[BACKEND LOGIN WARNING] Could not retrieve session token from custom backend:", backendErr);
    }

    return user;
  } catch (error: any) {
    debugRegistry.lastAuthError = error;
    debugRegistry.failedRequestsCount++;
    debugRegistry.failedRequestsList.push("email_password_login");
    logDetailedAuthError(error, "loginWithEmailAndPassword");
    throw error;
  }
};

