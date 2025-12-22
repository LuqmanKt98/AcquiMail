/**
 * Firebase Cloud Function to automatically fetch emails from IMAP
 * and sync them to Firebase Realtime Database in real-time.
 */

import { setGlobalOptions } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.database();

// Define secrets for secure credential storage
const smtpUser = defineSecret("SMTP_USER");
const smtpPassword = defineSecret("SMTP_PASSWORD");

// Set global options
setGlobalOptions({ maxInstances: 10, region: "europe-west1" });

// Interface for email data
interface EmailData {
  senderName: string;
  senderEmail: string;
  subject: string;
  body: string;
  receivedAt: string;
  read: boolean;
}



/**
 * Scheduled function that runs every minute to fetch new emails
 * from IMAP and sync them to Firebase Realtime Database.
 */
export const syncEmailsFromImap = onSchedule(
  {
    schedule: "every 1 minutes",
    secrets: [smtpUser, smtpPassword],
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async () => {
    console.log("Starting email sync from IMAP...");

    const user = smtpUser.value();
    const pass = smtpPassword.value();

    if (!user || !pass) {
      console.error("Missing SMTP credentials in secrets");
      return;
    }

    try {
      // Get list of email addresses we've sent to (from drafts)
      const draftsSnapshot = await db.ref("drafts").once("value");
      const sentToEmails: string[] = [];

      if (draftsSnapshot.exists()) {
        draftsSnapshot.forEach((child) => {
          const draft = child.val();
          if (draft.leadEmail) {
            sentToEmails.push(draft.leadEmail.toLowerCase());
          }
        });
      }

      // Get unique emails
      const uniqueSentToEmails = [...new Set(sentToEmails)];
      console.log("Filtering for replies from:", uniqueSentToEmails);

      // Get existing emails to avoid duplicates
      const existingEmailsSnapshot = await db.ref("emails").once("value");
      const existingEmails: Map<string, boolean> = new Map();

      if (existingEmailsSnapshot.exists()) {
        existingEmailsSnapshot.forEach((child) => {
          const email = child.val();
          const emailId = email.senderEmail + "_" +
            email.subject + "_" + email.receivedAt;
          const key = emailId;
          existingEmails.set(key, true);
        });
      }

      // Get deleted emails to filter them out
      const deletedSnapshot = await db.ref("deletedEmails").once("value");
      const deletedEmails: Set<string> = new Set();

      if (deletedSnapshot.exists()) {
        deletedSnapshot.forEach((child) => {
          const data = child.val();
          deletedEmails.add(
            `${data.senderEmail}_${data.subject}_${data.receivedAt}`
          );
        });
      }

      // Connect to IMAP
      const client = new ImapFlow({
        host: "imap.gmail.com",
        port: 993,
        secure: true,
        auth: { user, pass },
        logger: false,
      });

      await client.connect();
      const lock = await client.getMailboxLock("INBOX");

      try {
        const status = await client.status("INBOX", { messages: true });
        const total = status.messages || 0;
        // Fetch last 20 emails for efficiency
        const range = total > 0 ? `${Math.max(1, total - 19)}:*` : "1";

        console.log(`Fetching emails from range: ${range}`);

        const newEmails: EmailData[] = [];

        for await (const msg of client.fetch(range, {
          envelope: true,
          source: true,
        })) {
          // Skip if no source available
          if (!msg.source) continue;

          const parsed = await simpleParser(msg.source as Buffer);
          const from = parsed.from?.value[0];
          const fromEmail = from?.address || "";
          const fromName = from?.name || fromEmail;

          // Only include emails from people we've sent to (replies)
          const isReply = uniqueSentToEmails.length === 0 ||
            uniqueSentToEmails.includes(fromEmail.toLowerCase());

          if (isReply) {
            const emailData: EmailData = {
              senderName: fromName,
              senderEmail: fromEmail,
              subject: parsed.subject || "(No Subject)",
              body: (parsed.text || parsed.html || "") as string,
              receivedAt: parsed.date?.toISOString() ||
                new Date().toISOString(),
              read: false,
            };

            // Check for duplicates and deleted emails
            const emailKey =
              `${emailData.senderEmail}_${emailData.subject}_` +
              `${emailData.receivedAt}`;

            if (!existingEmails.has(emailKey) && !deletedEmails.has(emailKey)) {
              newEmails.push(emailData);
            }
          }
        }

        lock.release();
        await client.logout();

        // Add new emails to Firebase Realtime Database
        if (newEmails.length > 0) {
          console.log(`Adding ${newEmails.length} new email(s) to database`);

          for (const email of newEmails) {
            const newRef = db.ref("emails").push();
            await newRef.set(email);
            console.log(
              "Added email: " + email.subject +
              " from " + email.senderEmail
            );
          }
        } else {
          console.log("No new emails to add");
        }
      } catch (error) {
        lock.release();
        await client.logout();
        throw error;
      }
    } catch (error) {
      console.error("Error syncing emails:", error);
    }
  }
);
