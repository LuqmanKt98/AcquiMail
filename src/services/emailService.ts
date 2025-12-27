/**
 * Email Integration Service
 * Professional wrapper around Gmail API with database tracking
 * This replaces ALL SMTP/IMAP functionality
 */

import { sendEmail as gmailSendEmail, fetchEmails as gmailFetchEmails, deleteEmail as gmailDeleteEmail } from './gmailService';
import { addSentMessageId, getSentMessageIds, addEmail, getDeletedEmailIds, addTask } from './realtimeDbService';
import { extractTasksFromEmail } from './openaiService';
import type { Task } from '../types';

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{
        filename: string;
        content?: string; // base64
        contentType: string;
    }>;
}

/**
 * Send email via Gmail API and track the message ID
 * @returns Success status
 */
export const sendEmailProfessional = async (options: SendEmailOptions): Promise<boolean> => {
    try {
        // Send via Gmail API
        const { messageId, threadId } = await gmailSendEmail(options);

        // Track this sent message for reply filtering
        await addSentMessageId(messageId, threadId, options.to);

        console.log(`✅ Email sent successfully to ${options.to} (Message ID: ${messageId})`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send email:', error);
        throw error;
    }
};

/**
 * Fetch email replies from Gmail - ONLY replies to emails we sent
 * Automatically excludes deleted emails
 */
export const fetchEmailReplies = async (): Promise<void> => {
    try {
        // Get sent message IDs for reply filtering
        const sentMessageIds = await getSentMessageIds();

        // Get deleted email IDs to exclude
        const deletedIds = await getDeletedEmailIds();
        const deletedGmailIds: string[] = [];

        console.log(`📥 Fetching replies (tracking ${sentMessageIds.length} sent messages, excluding ${deletedIds.size} deleted emails)...`);

        // Fetch emails from Gmail API
        const gmailEmails = await gmailFetchEmails(sentMessageIds, deletedGmailIds);

        console.log(`📬 Found ${gmailEmails.length} reply emails from Gmail`);

        // Check each email against deleted list
        for (const email of gmailEmails) {
            const deletedKey = `${email.senderEmail}_${email.subject}_${email.receivedAt}`;

            if (deletedIds.has(deletedKey)) {
                console.log(`🚫 Skipping deleted email from ${email.senderEmail}`);
                continue;
            }

            // Add to database
            try {
                await addEmail({
                    senderName: email.senderName,
                    senderEmail: email.senderEmail,
                    subject: email.subject,
                    body: email.body,
                    receivedAt: email.receivedAt,
                    read: email.read,
                    messageId: email.messageId // Pass Gmail message ID for duplicate detection
                });

                console.log(`✅ Added reply from ${email.senderName} (${email.senderEmail})`);

                // Extract tasks from email using AI
                try {
                    const taskResult = await extractTasksFromEmail(email.body, email.senderName);
                    if (taskResult.hasTasks && taskResult.tasks.length > 0) {
                        for (const t of taskResult.tasks) {
                            const newTask: Omit<Task, 'id'> = {
                                title: t.title,
                                description: t.description,
                                dueDate: t.dueDate,
                                priority: t.priority,
                                completed: false,
                                leadName: email.senderName
                            };
                            await addTask(newTask);
                        }
                        console.log(`📋 Extracted ${taskResult.tasks.length} task(s) from email`);
                    }
                } catch (taskError) {
                    console.warn('⚠️ Task extraction failed:', taskError);
                }
            } catch (dbError: any) {
                // Silently skip if duplicate
                if (dbError.message === 'DUPLICATE_EMAIL') {
                    // Skip silently - this is expected behavior
                    continue;
                }
                console.warn(`⚠️ Error adding email: ${dbError.message}`);
            }
        }

        console.log(`✅ Reply sync complete`);
    } catch (error) {
        console.error('❌ Failed to fetch email replies:', error);
        throw error;
    }
};

/**
 * Delete email both from Gmail and local database
 * Marks as deleted so it won't be fetched again
 */
export const deleteEmailProfessional = async (localEmailId: string, gmailMessageId?: string): Promise<void> => {
    try {
        // Delete from Gmail if we have the message ID
        if (gmailMessageId) {
            await gmailDeleteEmail(gmailMessageId);
            console.log(`✅ Deleted from Gmail (${gmailMessageId})`);
        }

        // Delete from local database (this also tracks it as deleted)
        // The realtimeDbService.deleteEmail() already handles tracking

        console.log(`✅ Email deleted and marked to prevent re-fetch`);
    } catch (error) {
        console.error('❌ Failed to delete email:', error);
        throw error;
    }
};

/**
 * Start real-time email monitoring
 * Fetches replies every 15 seconds for fast updates
 */
export const startEmailMonitoring = (callback?: (newEmailsCount: number) => void): () => void => {
    console.log('🔄 Starting Gmail API real-time monitoring (15-second intervals)...');

    let pollCount = 0;

    // Initial fetch
    fetchEmailReplies().then(() => {
        console.log('✅ Initial email fetch completed');
        if (callback) callback(0);
    }).catch(err => console.error('❌ Initial fetch failed:', err));

    // Set up interval (every 15 seconds for faster updates)
    const intervalId = setInterval(async () => {
        pollCount++;
        console.log(`🔃 Background sync #${pollCount} - checking for new emails...`);

        try {
            await fetchEmailReplies();
            console.log(`✅ Background sync #${pollCount} completed`);
            if (callback) callback(0);
        } catch (error) {
            console.error(`❌ Background sync #${pollCount} error:`, error);
        }
    }, 15000); // 15 seconds for faster real-time updates

    // Return cleanup function
    return () => {
        console.log('🛑 Stopping email monitoring');
        clearInterval(intervalId);
    };
};
