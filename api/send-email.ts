import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, html, smtpConfig, attachments } = req.body;

    if (!to || !subject || !html || !smtpConfig) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate SMTP config
    if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.user || !smtpConfig.pass) {
      console.error('Invalid SMTP config:', {
        hasHost: !!smtpConfig.host,
        hasPort: !!smtpConfig.port,
        hasUser: !!smtpConfig.user,
        hasPass: !!smtpConfig.pass
      });
      return res.status(400).json({ error: 'Invalid SMTP configuration' });
    }

    console.log('Sending email:', { to, subject, attachmentCount: attachments?.length || 0 });

    // Create transporter with provided SMTP config
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: parseInt(smtpConfig.port),
      secure: smtpConfig.port === '465',
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
    });

    // Prepare attachments if provided
    const emailAttachments = attachments?.map((att: any) => ({
      filename: att.filename,
      content: att.content, // base64 string
      encoding: 'base64',
      contentType: att.contentType
    })) || [];

    console.log('Prepared attachments:', emailAttachments.length);

    // Send email
    await transporter.sendMail({
      from: smtpConfig.fromEmail,
      to,
      subject,
      html,
      attachments: emailAttachments,
    });

    console.log('Email sent successfully to:', to);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return res.status(500).json({
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

