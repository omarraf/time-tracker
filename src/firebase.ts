import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCbd3OYYzB89oGPTa2DhpVYbRb35PKfiY4",
  authDomain: "time-ea070.firebaseapp.com",
  projectId: "time-ea070",
  storageBucket: "time-ea070.firebasestorage.app",
  messagingSenderId: "141515756799",
  appId: "1:141515756799:web:dfcb09e8c2bf326e60e8ca",
  measurementId: "G-9ZKFSNZN89"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getFirestore(app);
