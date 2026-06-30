import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInWithCredential } from 'firebase/auth';
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

export const syncUserWithFirestore = async (user: any) => {
  // Check if user exists in Firestore
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    // Create new user profile
    const adminEmails = ['meinkxun@gmail.com', 'nucleuscc2026@gmail.com'];
    const isSuperadmin = user.email ? adminEmails.includes(user.email.toLowerCase().trim()) : false;
    const role = isSuperadmin ? 'superadmin' : 'guest';
    const planId = isSuperadmin ? 'premium' : 'free';
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName || 'Student',
      role: role,
      planId: planId,
      classGroup: 'all',
      unlockedMaterials: [],
      photoURL: user.photoURL || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    // If user exists and is a superadmin email, but doesn't have the role, upgrade them
    const adminEmails = ['meinkxun@gmail.com', 'nucleuscc2026@gmail.com'];
    const isSuperadmin = user.email ? adminEmails.includes(user.email.toLowerCase().trim()) : false;
    if (isSuperadmin && userSnap.data().role !== 'superadmin') {
      await updateDoc(userRef, {
        role: 'superadmin',
        planId: 'premium',
        classGroup: 'all',
        unlockedMaterials: [],
        updatedAt: serverTimestamp(),
      });
    }
  }
};

export const signInWithGoogleToken = async (idToken: string) => {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  await syncUserWithFirestore(result.user);
  return result.user;
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserWithFirestore(result.user);
  } catch (error: any) {
    console.error('Error signing in with Google', error);
    if (error.code === 'auth/cancelled-popup-request') {
      alert('Sign-in popup was closed or cancelled. If you are viewing this inside the AI Studio preview, please click the "Open in new tab" button (arrow icon) in the top right of the preview header to sign in properly.');
    } else if (error.code === 'auth/popup-blocked') {
      alert('Popup blocked by browser. Please allow popups or open the app in a new tab.');
    } else if (error.code === 'auth/network-request-failed' || error.message?.includes('network-request-failed')) {
      alert('Google Sign-In connection was blocked by your browser inside the AI Studio sandbox iframe (due to third-party cookie/iframe block limits).\n\nTo log in successfully:\n1. Click the "Open in new tab" button (the upper-right corner icon inside the top navigation/preview controller bar).\n2. Attempt the sign-in again from the newly opened browser tab.');
    } else {
      alert(`Failed to sign in: ${error.message}`);
    }
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

