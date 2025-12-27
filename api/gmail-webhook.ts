import type { VercelRequest, VercelResponse } from '@vercel/node';

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

        // Trigger notification to all connected clients via Firebase REST API
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
 * Trigger email sync by writing to Firebase using REST API
 * All connected clients will see this and sync
 */
async function triggerEmailSync(historyId: string) {
    try {
        const databaseURL = process.env.VITE_FIREBASE_DATABASE_URL;

        if (!databaseURL) {
            console.error('❌ VITE_FIREBASE_DATABASE_URL not set');
            return;
        }

        // Use Firebase REST API to write data (no SDK needed!)
        const response = await fetch(`${databaseURL}/emailSyncTrigger.json`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                historyId,
                timestamp: Date.now(),
                source: 'gmail-push-notification'
            })
        });

        if (!response.ok) {
            throw new Error(`Firebase REST API error: ${response.status} ${response.statusText}`);
        }

        console.log('✅ Email sync triggered via Firebase REST API');
    } catch (error) {
        console.error('❌ Error triggering sync:', error);
        // Don't throw - we already got the notification, just log the error
    }
}
