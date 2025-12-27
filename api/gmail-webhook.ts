import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase, ref, set } from 'firebase/database';

/**
 * Gmail Push Notification Webhook for Vercel
 * This endpoint receives notifications from Google Cloud Pub/Sub when new emails arrive
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only accept POST requests from Pub/Sub
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Parse the Pub/Sub message
        const pubsubMessage = req.body.message;

        if (!pubsubMessage) {
            console.log('⚠️ No Pub/Sub message in request body');
            return res.status(400).json({ error: 'Bad request - no message' });
        }

        // Decode the base64 message data
        const messageData = Buffer.from(pubsubMessage.data, 'base64').toString('utf-8');
        const notification = JSON.parse(messageData);

        console.log('📬 Gmail push notification received:', {
            emailAddress: notification.emailAddress,
            historyId: notification.historyId,
            timestamp: new Date().toISOString()
        });

        // Trigger notification to all connected clients
        // We'll use Firebase Realtime Database to broadcast the notification
        await triggerEmailSync(notification.historyId);

        // Respond to Pub/Sub immediately (must be within 10 seconds)
        res.status(200).json({
            success: true,
            message: 'Notification processed',
            historyId: notification.historyId
        });

    } catch (error) {
        console.error('❌ Error processing Gmail webhook:', error);

        // Still return 200 to Pub/Sub to prevent retries
        res.status(200).json({
            success: false,
            error: 'Internal processing error'
        });
    }
}

/**
 * Trigger email sync by writing to Firebase
 * All connected clients will see this and sync
 */
async function triggerEmailSync(historyId: string) {
    try {
        // Import Firebase config (you'll need to add this)
        const { initializeApp } = await import('firebase/app');
        const { getDatabase, ref, set } = await import('firebase/database');

        // Initialize Firebase with your config
        const firebaseConfig = {
            apiKey: process.env.VITE_FIREBASE_API_KEY,
            authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
            databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
            projectId: process.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.VITE_FIREBASE_APP_ID,
        };

        const app = initializeApp(firebaseConfig);
        const db = getDatabase(app);

        // Write sync trigger to Firebase
        const syncRef = ref(db, 'emailSyncTrigger');
        await set(syncRef, {
            historyId,
            timestamp: Date.now(),
            source: 'gmail-push-notification'
        });

        console.log('✅ Email sync triggered via Firebase');
    } catch (error) {
        console.error('❌ Error triggering sync:', error);
        // Don't throw - we already got the notification, just log the error
    }
}
