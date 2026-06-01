import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { 
  initializeFirestore, 
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
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
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

