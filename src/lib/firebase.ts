import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { useAuthStore } from '../store/authStore';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out', error);
  }
};
