import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, signInWithPopup, GoogleAuthProvider  } from "firebase/auth"
import { auth, isFirebaseConfigured } from "./firebase";

export const signUp = (email: string, password: string) => {
    if (!isFirebaseConfigured || !auth) {
        throw new Error('Firebase not configured');
    }
    return createUserWithEmailAndPassword(auth, email, password);
};

export const signIn = (email: string, password: string) => {
    if (!isFirebaseConfigured || !auth) {
        throw new Error('Firebase not configured');
    }
    return signInWithEmailAndPassword(auth, email, password);
};

export const signOutUser = () => {
    if (!isFirebaseConfigured || !auth) {
        throw new Error('Firebase not configured');
    }
    return signOut(auth);
};

export const googleSignIn = () => {
    if (!isFirebaseConfigured || !auth) {
        throw new Error('Firebase not configured');
    }
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
};