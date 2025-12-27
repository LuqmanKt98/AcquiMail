import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged as firebaseOnAuthStateChanged,
    User
} from 'firebase/auth';
import { auth } from '../lib/firebase';

// Configure Google provider with Gmail API scopes
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.modify');

/**
 * Sign in with Google OAuth
 * Requests Gmail API scopes for reading and sending emails
 */
export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);

        // Get the OAuth access token
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential?.accessToken;

        // Store access token for Gmail API calls
        if (accessToken) {
            localStorage.setItem('gmail_access_token', accessToken);
        }

        return {
            user: result.user,
            accessToken
        };
    } catch (error) {
        console.error('Error signing in with Google:', error);
        throw error;
    }
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
    try {
        // Clear stored tokens
        localStorage.removeItem('gmail_access_token');
        await firebaseSignOut(auth);
    } catch (error) {
        console.error('Error signing out:', error);
        throw error;
    }
};

/**
 * Listen to authentication state changes
 */
export const onAuthStateChanged = (callback: (user: User | null) => void) => {
    return firebaseOnAuthStateChanged(auth, callback);
};

/**
 * Get the current access token for Gmail API
 */
export const getAccessToken = (): string | null => {
    const token = localStorage.getItem('gmail_access_token');
    if (!token) {
        console.error('⚠️ No Gmail access token found. Please sign out and sign in again.');
    }
    return token;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
    return auth.currentUser !== null;
};
