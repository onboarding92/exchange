import nodemailer from "nodemailer";

export type SendEmailOptions = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT
  ? parseInt(process.env.SMTP_PORT, 10)
  : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || "no-reply@bitchange.money";
const SMTP_SECURE =
  process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465";

const EMAIL_ENABLED =
  !!SMTP_HOST && !!SMTP_USER && !!SMTP_PASS && !!SMTP_FROM;

let transporter: nodemailer.Transporter | null = null;

if (EMAIL_ENABLED) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  transporter
    .verify()
    .then(() => {
      console.log("[email] SMTP connection verified");
    })
    .catch((err) => {
      console.error("[email] SMTP verification failed:", err);
    });
} else {
  console.log(
    "[email] SMTP not configured. Emails are disabled. Set SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM to enable."
  );
}

export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  if (!EMAIL_ENABLED || !transporter) {
    console.log(
      "[email] Skipping sendEmail because SMTP is not configured.",
      { to: opts.to, subject: opts.subject }
    );
    return false;
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return true;
  } catch (err) {
    console.error("[email] Failed to send email:", err, {
      to: opts.to,
      subject: opts.subject,
    });
    return false;
  }
}

// ---- Helpers for specific events ----

export async function sendWelcomeEmail(to: string) {
  const subject = "Welcome to BitChange Exchange";
  const text = `Welcome to BitChange!

Your account has been created successfully.

If this signup was not made by you, please contact support immediately.

BitChange Team`;

  const html = `
    <h2>Welcome to <strong>BitChange</strong> 👋</h2>
    <p>Your account has been created successfully.</p>
    <p>If this signup was not made by you, please contact support immediately.</p>
    <p>Best regards,<br/>BitChange Team</p>
  `;

  return sendEmail({ to, subject, text, html });
}

export async function sendSupportReplyEmail(params: {
  to: string;
  ticketId: number;
  subject: string;
  replySnippet: string;
}) {
  const subject = `New reply on your support ticket #${params.ticketId}`;
  const text = `Hello,

Our support team has replied to your ticket #${params.ticketId}:

"${params.replySnippet}"

Please log in to your BitChange account to view the full conversation.

BitChange Support Team`;

  const html = `
    <h2>New reply from <strong>BitChange Support</strong></h2>
    <p>Your ticket <strong>#${params.ticketId}</strong> has a new reply:</p>
    <blockquote>${escapeHtml(params.replySnippet)}</blockquote>
    <p>Please log in to your BitChange account to view the full conversation.</p>
    <p>Best regards,<br/>BitChange Support Team</p>
  `;

  return sendEmail({
    to: params.to,
    subject,
    text,
    html,
  });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


export async function sendLoginAlertEmail(params: {
  to: string;
  ip: string;
  userAgent: string;
  createdAt: string;
}) {
  const subject = "New login to your BitChange account";
  const text = `Hello,

A new login to your BitChange account was detected.

IP address: ${params.ip}
Device / Browser: ${params.userAgent}
Time: ${params.createdAt}

If this was you, you can ignore this message.
If you do not recognize this login, please change your password immediately and contact support.

BitChange Security Team`;

  const html = `
    <h2>New login detected</h2>
    <p>A new login to your <strong>BitChange</strong> account was detected.</p>
    <ul>
      <li><strong>IP address:</strong> ${escapeHtml(params.ip)}</li>
      <li><strong>Device / Browser:</strong> ${escapeHtml(params.userAgent)}</li>
      <li><strong>Time:</strong> ${escapeHtml(params.createdAt)}</li>
    </ul>
    <p>If this was you, you can ignore this message.</p>
    <p>If you do not recognize this login, please change your password immediately and contact support.</p>
    <p>Best regards,<br/>BitChange Security Team</p>
  `;

  return sendEmail({
    to: params.to,
    subject,
    text,
    html,
  });
}
