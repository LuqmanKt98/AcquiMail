import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, html, smtpConfig: requestSmtpConfig, attachments } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields (to, subject, html)' });
    }

    // Use environment variables first, fallback to request body
    const smtpConfig = {
      host: process.env.SMTP_HOST || requestSmtpConfig?.host,
      port: process.env.SMTP_PORT || requestSmtpConfig?.port,
      user: process.env.SMTP_USER || requestSmtpConfig?.user,
      pass: process.env.SMTP_PASSWORD || requestSmtpConfig?.pass,
      fromEmail: process.env.SMTP_USER || requestSmtpConfig?.fromEmail // Often the 'user' is also the 'from' email
    };

    // Validate SMTP config with detailed error messages
    const missingFields = [];
    if (!smtpConfig.host) missingFields.push('SMTP_HOST');
    if (!smtpConfig.port) missingFields.push('SMTP_PORT');
    if (!smtpConfig.user) missingFields.push('SMTP_USER');
    if (!smtpConfig.pass) missingFields.push('SMTP_PASSWORD');

    if (missingFields.length > 0) {
      console.error('Invalid SMTP config - missing env variables:', missingFields);
      return res.status(400).json({
        error: 'Invalid SMTP configuration',
        details: `Missing environment variables: ${missingFields.join(', ')}. Please configure SMTP settings.`
      });
    }

    console.log('Sending email:', {
      to,
      subject,
      from: smtpConfig.fromEmail,
      attachmentCount: attachments?.length || 0
    });

    // Create transporter with SMTP config from environment
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: parseInt(smtpConfig.port as string), // Ensure port is a number
      secure: smtpConfig.port === '465', // Use SSL if port is 465
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
    });

    // Prepare attachments if provided
    const emailAttachments = attachments?.map((att: any) => {
      if (att.content) {
        return {
          filename: att.filename,
          content: att.content, // base64 string
          encoding: 'base64',
          contentType: att.contentType
        };
      } else if (att.path) {
        return {
          filename: att.filename,
          path: att.path, // URL to file
          contentType: att.contentType
        };
      }
      return null;
    }).filter(Boolean) || [];

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
