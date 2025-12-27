import { getAccessToken } from './authService';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

interface EmailAttachment {
    filename: string;
    content?: string; // base64
    contentType: string;
    path?: string;
}

interface SendEmailParams {
    to: string;
    subject: string;
    html: string;
    attachments?: EmailAttachment[];
}

interface FetchedEmail {
    senderName: string;
    senderEmail: string;
    subject: string;
    body: string;
    receivedAt: string;
    read: boolean;
    id: string;
    messageId: string; // Gmail message ID
    threadId: string;
    inReplyTo?: string; // Message-ID this is replying to
}

/**
 * Create RFC 2822 formatted email message with proper attachment handling
 */
const createMimeMessage = (params: SendEmailParams): string => {
    const { to, subject, html, attachments = [] } = params;

    const boundary = '----=_Part_' + Math.random().toString(36).substr(2, 9);
    const hasAttachments = attachments.length > 0;

    let message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
    ];

    if (hasAttachments) {
        message.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    } else {
        message.push('Content-Type: text/html; charset=UTF-8');
    }

    message.push('');

    if (hasAttachments) {
        // Add HTML body part
        message.push(
            `--${boundary}`,
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: 7bit',
            '',
            html,
            ''
        );

        // Add attachments
        attachments.forEach(att => {
            if (att.content) {
                message.push(
                    `--${boundary}`,
                    `Content-Type: ${att.contentType}`,
                    `Content-Disposition: attachment; filename="${att.filename}"`,
                    'Content-Transfer-Encoding: base64',
                    '',
                    att.content,
                    ''
                );
            }
        });

        message.push(`--${boundary}--`);
    } else {
        message.push(html);
    }

    return message.join('\r\n');
};

/**
 * Send email using Gmail API with full attachment support
 * Returns the Gmail message ID and thread ID for tracking replies
 */
export const sendEmail = async (params: SendEmailParams): Promise<{ messageId: string; threadId: string }> => {
    const accessToken = getAccessToken();

    if (!accessToken) {
        throw new Error('Not authenticated. Please sign in again.');
    }

    try {
        const mimeMessage = createMimeMessage(params);
        const encodedMessage = btoa(unescape(encodeURIComponent(mimeMessage)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const response = await fetch(`${GMAIL_API_BASE}/messages/send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                raw: encodedMessage,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to send email');
        }

        const result = await response.json();
        console.log('Email sent successfully via Gmail API', result);

        return {
            messageId: result.id,
            threadId: result.threadId
        };
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

/**
 * Fetch emails from Gmail - ONLY replies to emails we sent
 * @param sentMessageIds - Array of Gmail message IDs we've sent (to filter replies)
 * @param deletedEmailIds - Array of email IDs to exclude
 */
export const fetchEmails = async (
    sentMessageIds: string[] = [],
    deletedEmailIds: string[] = []
): Promise<FetchedEmail[]> => {
    const accessToken = getAccessToken();

    if (!accessToken) {
        throw new Error('Not authenticated. Please sign in again.');
    }

    try {
        // Build query to only get emails that are replies
        // We look for emails in threads where we've sent messages
        let query = 'in:inbox -from:me'; // Inbox, not from me (replies only)

        // If we have sent message IDs, we can be more specific
        // But Gmail API doesn't directly support "replies to specific messages"
        // So we'll fetch and filter on the client side

        // List messages
        const listResponse = await fetch(
            `${GMAIL_API_BASE}/messages?q=${encodeURIComponent(query)}&maxResults=50`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        if (!listResponse.ok) {
            if (listResponse.status === 401) {
                throw new Error('Gmail access expired or unauthorized. Please sign out and sign in again to refresh permissions.');
            }
            throw new Error('Failed to fetch email list');
        }

        const listData = await listResponse.json();
        const messages = listData.messages || [];

        // CRITICAL: If we haven't sent any emails from this app yet, don't fetch anything
        // Only fetch replies to emails WE sent from this app
        if (sentMessageIds.length === 0) {
            console.log('⚠️ No emails sent from this app yet. Inbox will remain empty until you send your first email.');
            return []; // Return empty array - we only want replies to OUR emails
        }

        console.log(`📋 Processing ${messages.length} potential emails, filtering for replies to ${sentMessageIds.length} sent messages...`);

        // Fetch full details for each message
        const emails: FetchedEmail[] = [];
        for (const msg of messages) {
            // Skip if this email was deleted
            if (deletedEmailIds.includes(msg.id)) {
                continue;
            }

            const detailResponse = await fetch(
                `${GMAIL_API_BASE}/messages/${msg.id}?format=full`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                }
            );

            if (detailResponse.ok) {
                const detail = await detailResponse.json();
                const headers = detail.payload.headers;

                const from = headers.find((h: any) => h.name === 'From')?.value || '';
                const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
                const date = headers.find((h: any) => h.name === 'Date')?.value || '';
                const messageId = headers.find((h: any) => h.name === 'Message-ID')?.value || '';
                const inReplyTo = headers.find((h: any) => h.name === 'In-Reply-To')?.value || '';
                const references = headers.find((h: any) => h.name === 'References')?.value || '';

                // Filter: Only include if this is a reply to an email we sent from this app
                // Check if this email is in a thread where we sent a message
                let isReplyToOurEmail = false;

                const threadResponse = await fetch(
                    `${GMAIL_API_BASE}/threads/${detail.threadId}?format=metadata`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                        },
                    }
                );

                if (threadResponse.ok) {
                    const threadData = await threadResponse.json();
                    const threadMessages = threadData.messages || [];

                    // Check if any message in the thread is one WE sent from this app
                    isReplyToOurEmail = threadMessages.some((tm: any) =>
                        sentMessageIds.includes(tm.id)
                    );
                }

                if (!isReplyToOurEmail) {
                    console.log(`⏭️  Skipping email "${subject}" - not a reply to an email sent from this app`);
                    continue; // Skip this email, not a reply to us
                }

                // Extract email address and name from "Name <email>" format
                const emailMatch = from.match(/<(.+?)>/);
                const senderEmail = emailMatch ? emailMatch[1] : from;
                const senderName = emailMatch ? from.replace(/<.+?>/, '').trim().replace(/"/g, '') : from;

                // Get email body
                let body = '';
                if (detail.payload.parts) {
                    const textPart = detail.payload.parts.find((p: any) =>
                        p.mimeType === 'text/plain' || p.mimeType === 'text/html'
                    );
                    if (textPart?.body?.data) {
                        body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                    }
                } else if (detail.payload.body?.data) {
                    body = atob(detail.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                }

                // Check if email is read
                const isRead = !detail.labelIds?.includes('UNREAD');

                emails.push({
                    id: detail.id,
                    messageId,
                    threadId: detail.threadId,
                    inReplyTo,
                    senderName,
                    senderEmail,
                    subject,
                    body,
                    receivedAt: new Date(date || detail.internalDate).toISOString(),
                    read: isRead,
                });
            }
        }

        return emails;
    } catch (error) {
        console.error('Error fetching emails:', error);
        throw error;
    }
};

/**
 * Mark email as read
 */
export const markEmailAsRead = async (messageId: string): Promise<void> => {
    const accessToken = getAccessToken();

    if (!accessToken) {
        throw new Error('Not authenticated. Please sign in again.');
    }

    try {
        await fetch(`${GMAIL_API_BASE}/messages/${messageId}/modify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                removeLabelIds: ['UNREAD'],
            }),
        });
    } catch (error) {
        console.error('Error marking email as read:', error);
    }
};

/**
 * Delete email from Gmail (move to trash)
 */
export const deleteEmail = async (messageId: string): Promise<void> => {
    const accessToken = getAccessToken();

    if (!accessToken) {
        throw new Error('Not authenticated. Please sign in again.');
    }

    try {
        await fetch(`${GMAIL_API_BASE}/messages/${messageId}/trash`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
    } catch (error) {
        console.error('Error deleting email:', error);
        throw error;
    }
};

/**
 * Watch for new emails using Gmail push notifications
 * This requires Pub/Sub setup in Google Cloud
 */
export const setupPushNotifications = async (topicName: string): Promise<void> => {
    const accessToken = getAccessToken();

    if (!accessToken) {
        throw new Error('Not authenticated. Please sign in again.');
    }

    try {
        const response = await fetch(`${GMAIL_API_BASE}/watch`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                topicName: topicName,
                labelIds: ['INBOX'],
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Push notification setup failed:', error);
        } else {
            const result = await response.json();
            console.log('Push notifications enabled:', result);
        }
    } catch (error) {
        console.error('Error setting up push notifications:', error);
    }
};
