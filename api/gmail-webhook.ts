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
        let notification: { emailAddress?: string; historyId?: string };

        // Handle both wrapped and no-wrapper Pub/Sub message formats
        if (req.body.message && req.body.message.data) {
            // Standard wrapped format: { message: { data: "base64..." } }
            const messageData = Buffer.from(req.body.message.data, 'base64').toString('utf-8');
            notification = JSON.parse(messageData);
            console.log('📬 Received wrapped Pub/Sub message');
        } else if (req.body.emailAddress || req.body.historyId) {
            // No-wrapper format: direct JSON body
            notification = req.body;
            console.log('📬 Received no-wrapper Pub/Sub message');
        } else {
            // Try parsing body as string (might be raw message)
            try {
                notification = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
                console.log('📬 Received raw message body');
            } catch {
                console.log('⚠️ Could not parse request body:', req.body);
                return res.status(400).json({ error: 'Bad request - invalid message format' });
            }
        }

        console.log('📬 Gmail push notification received:', {
            emailAddress: notification.emailAddress,
            historyId: notification.historyId,
            timestamp: new Date().toISOString()
        });

        // Trigger notification to all connected clients via Firebase REST API
        await triggerEmailSync(notification.historyId || 'unknown');

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
        // IMPORTANT: VITE_ prefix is NOT available in Vercel serverless functions at runtime
        // Use FIREBASE_DATABASE_URL (without VITE_ prefix) for server-side
        // Fallback to hardcoded URL to ensure it works
        const databaseURL = process.env.FIREBASE_DATABASE_URL ||
            'https://acquimail-44077-default-rtdb.europe-west1.firebasedatabase.app';

        if (!databaseURL) {
            console.error('❌ FIREBASE_DATABASE_URL not set');
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
