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
      const role = user.email === 'meinkxun@gmail.com' ? 'superadmin' : 'guest';
      const planId = user.email === 'meinkxun@gmail.com' ? 'premium' : 'free';
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
      // If user exists and is the superadmin email, but doesn't have the role, upgrade them
      if (user.email === 'meinkxun@gmail.com' && userSnap.data().role !== 'superadmin') {
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
      alert('Sign-in popup was closed or cancelled. If you are viewing this inside the AI Studio preview, please click the "Open in new tab" button (arrow icon) in the top right to sign in properly.');
    } else if (error.code === 'auth/popup-blocked') {
      alert('Popup blocked by browser. Please allow popups or open the app in a new tab.');
    } else {
      alert(`Failed to sign in: ${error.message}`);
    }
  }
};

export const logout = async () => {
  try {
    const isConfirmed = window.confirm("Are you sure you want to log out? Any unsaved learning flow might be completed.");
    if (!isConfirmed) return;
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out', error);
  }
};

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'users', 'ping_connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: the client is offline.");
    } else {
      console.debug("Firestore connection check diagnostic information:", error);
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

