import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate Firebase configuration
const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_APP_ID',
];

const missingVars = requiredEnvVars.filter(
    (varName) => !import.meta.env[varName]
);

if (missingVars.length > 0) {
    console.error('❌ Firebase Configuration Error: Missing environment variables:', missingVars);
    console.error('📝 Please copy .env.example to .env and add your Firebase credentials');
    console.error('🔗 Get credentials from: https://console.firebase.google.com/');
}

// Initialize Firebase (will use undefined values if not configured, but won't crash immediately)
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const isFirebaseConfigured = missingVars.length === 0;

