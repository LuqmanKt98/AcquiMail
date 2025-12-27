// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// These values can be public as they're meant for client-side apps
// Security is handled by Firebase Security Rules
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC0yXsVxgF7eekrIUPvUF8XWsg2Me25hLU",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "acquimail-44077.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "acquimail-44077",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "acquimail-44077.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "608685088990",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:608685088990:web:237d06ff4ab3094cfd624f",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-RPK7DQ992Z",
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://acquimail-44077-default-rtdb.europe-west1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (kept for backwards compatibility during migration)
export const db = getFirestore(app);

// Initialize Realtime Database
export const realtimeDb = getDatabase(app);

// Initialize Storage
export const storage = getStorage(app);

// Initialize Authentication
export const auth = getAuth(app);

export default app;
