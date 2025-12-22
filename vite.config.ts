import path from 'path';
import { defineConfig, loadEnv, Plugin, ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

// Custom plugin for API endpoints
function emailApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'email-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        // Handle POST /api/send-email
        if (req.url === '/api/send-email' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            (async () => {
              try {
                const data = JSON.parse(body);

                const transporter = nodemailer.createTransport({
                  host: env.SMTP_HOST || 'smtp.gmail.com',
                  port: parseInt(env.SMTP_PORT || '465'),
                  secure: env.SMTP_SECURE === 'true',
                  auth: {
                    user: env.SMTP_USER,
                    pass: env.SMTP_PASSWORD,
                  },
                });

                // Prepare attachments if provided
                const attachments = data.attachments?.map((att: any) => ({
                  filename: att.filename,
                  content: att.content, // base64 string
                  encoding: 'base64',
                  contentType: att.contentType
                })) || [];

                console.log(`[SEND-EMAIL] Sending to: ${data.to}`);
                console.log(`[SEND-EMAIL] Subject: ${data.subject}`);
                console.log(`[SEND-EMAIL] Attachments count: ${attachments.length}`);
                if (attachments.length > 0) {
                  console.log(`[SEND-EMAIL] Attachment details:`, attachments.map((a: any) => ({
                    filename: a.filename,
                    contentType: a.contentType,
                    size: a.content?.length || 0
                  })));
                }

                await transporter.sendMail({
                  from: env.SMTP_USER,
                  to: data.to,
                  subject: data.subject,
                  html: data.body.replace(/\n/g, '<br>'),
                  attachments: attachments
                });

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (error: any) {
                console.error('SMTP Error:', error);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: error.message }));
              }
            })();
          });
          return;
        }

        // Handle POST /api/fetch-emails (changed from GET to POST to accept filter data)
        if (req.url === '/api/fetch-emails' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            (async () => {
              try {
                const data = JSON.parse(body);
                const sentToEmails = data.sentToEmails || []; // List of email addresses we've sent to

                const client = new ImapFlow({
                  host: 'imap.gmail.com',
                  port: 993,
                  secure: true,
                  auth: {
                    user: env.SMTP_USER,
                    pass: env.SMTP_PASSWORD
                  },
                  logger: false
                });

                await client.connect();
                let lock = await client.getMailboxLock('INBOX');
                try {
                  const status = await client.status('INBOX', { messages: true });
                  const total = status.messages || 0;
                  const range = total > 0 ? `${Math.max(1, total - 9)}:*` : '1';

                  const messages: any[] = [];
                  if (total > 0) {
                    for await (let msg of client.fetch(range, { source: true, envelope: true })) {
                      const parsed = await simpleParser(msg.source);

                      const senderEmail = parsed.from?.value?.[0]?.address || '';

                      // FILTERING LOGIC: Only include emails that are replies to our sent emails
                      const isReply = parsed.inReplyTo || parsed.references; // Has In-Reply-To or References header
                      const isFromContactedLead = sentToEmails.includes(senderEmail.toLowerCase());

                      // Only include if it's a reply OR from someone we've contacted
                      if (!isReply && !isFromContactedLead) {
                        console.log(`Filtering out email from ${senderEmail} - not a reply and not from contacted lead`);
                        continue; // Skip this email
                      }

                      // Extract attachments
                      const attachments = parsed.attachments?.map(att => ({
                        filename: att.filename || 'unnamed',
                        contentType: att.contentType || 'application/octet-stream',
                        size: att.size || 0,
                      })) || [];

                      messages.push({
                        id: msg.uid.toString(),
                        senderName: parsed.from?.text || 'Onbekend',
                        senderEmail: senderEmail,
                        subject: parsed.subject || '(Geen onderwerp)',
                        body: parsed.text || '',
                        receivedAt: parsed.date?.toISOString() || new Date().toISOString(),
                        read: false,
                        attachments: attachments
                      });
                    }
                  }
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(messages.reverse()));
                } finally {
                  lock.release();
                }
                await client.logout();
              } catch (error: any) {
                console.error('IMAP Error:', error);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: error.message }));
              }
            })();
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isDev = mode === 'development';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/openai': {
          target: 'https://api.openai.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/openai/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const apiKey = env.VITE_OPENAI_API_KEY;
              if (apiKey) {
                proxyReq.setHeader('Authorization', `Bearer ${apiKey.trim()}`);
              }
            });
          }
        }
      }
    },
    // Only use email API plugin in development
    // In production, Vercel serverless functions handle these endpoints
    plugins: [react(), ...(isDev ? [emailApiPlugin(env)] : [])],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  };
});
