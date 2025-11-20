import { db } from "./db";
import nodemailer from "nodemailer";

/**
 * Insert email into DB outbox table.
 */
export function queueEmail(toEmail: string, subject: string, body: string) {
  const now = new Date().toISOString();
  db.prepare("INSERT INTO emailOutbox (toEmail,subject,body,createdAt) VALUES (?,?,?,?)")
    .run(toEmail, subject, body, now);
}

/**
 * Try to send email immediately using SMTP settings in environment.
 * Always queues the email in emailOutbox as well.
 */
export async function sendEmail(toEmail: string, subject: string, body: string) {
  // persist in DB first
  queueEmail(toEmail, subject, body);

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) {
    console.log("[email] SMTP not configured, queued only:", { toEmail, subject });
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: toEmail,
      subject,
      text: body,
    });

    const now = new Date().toISOString();
    db.prepare("UPDATE emailOutbox SET sentAt=? WHERE toEmail=? AND subject=? AND body=? AND sentAt IS NULL")
      .run(now, toEmail, subject, body);

    console.log("[email] Sent:", { toEmail, subject });
  } catch (err) {
    console.error("[email] Error sending email:", err);
  }
}
