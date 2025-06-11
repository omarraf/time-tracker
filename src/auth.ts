import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, signInWithPopup, GoogleAuthProvider  } from "firebase/auth"
import { auth } from "./firebase";

export const signUp = (email: string, password:string) => {
    return createUserWithEmailAndPassword(auth, email, password);
};

export const signIn = (email: string, password:string) => {
    return signInWithEmailAndPassword(auth, email, password);
};

export const signOutUser = () => {
    return signOut(auth)
};

export const googleSignIn = () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
}