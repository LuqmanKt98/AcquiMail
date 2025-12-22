import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sentToEmails, smtpUser, smtpPassword } = req.body;

    if (!smtpUser || !smtpPassword) {
      return res.status(400).json({ error: 'Missing SMTP credentials' });
    }

    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      logger: false,
    });

    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const status = await client.status('INBOX', { messages: true });
      const total = status.messages || 0;
      const range = total > 0 ? `${Math.max(1, total - 9)}:*` : '1';

      const messages = [];
      for await (const msg of client.fetch(range, { envelope: true, source: true })) {
        const parsed = await simpleParser(msg.source);
        const from = parsed.from?.value[0];
        const fromEmail = from?.address || '';
        const fromName = from?.name || fromEmail;

        // Only include emails from people we've sent to
        if (sentToEmails && sentToEmails.includes(fromEmail)) {
          messages.push({
            id: msg.uid.toString(),
            from: fromName,
            fromEmail,
            subject: parsed.subject || '(No Subject)',
            body: parsed.text || parsed.html || '',
            date: parsed.date?.toISOString() || new Date().toISOString(),
            read: false,
          });
        }
      }

      lock.release();
      await client.logout();

      return res.status(200).json({ emails: messages });
    } catch (error) {
      lock.release();
      await client.logout();
      throw error;
    }
  } catch (error) {
    console.error('Error fetching emails:', error);
    return res.status(500).json({
      error: 'Failed to fetch emails',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

