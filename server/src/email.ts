import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { config } from "./config";

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let cachedTransporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null =
  null;

function getTransporter():
  | nodemailer.Transporter<SMTPTransport.SentMessageInfo>
  | null {
  // Se non ho i dati SMTP, disattivo le email (ma non butto giù il server)
  const host = config.SMTP_HOST || process.env.SMTP_HOST;
  const port =
    config.SMTP_PORT ??
    (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined);
  const user = config.SMTP_USER || process.env.SMTP_USER;
  const pass = config.SMTP_PASS || process.env.SMTP_PASS;
  const secure =
    typeof config.SMTP_SECURE === "boolean"
      ? config.SMTP_SECURE
      : process.env.SMTP_SECURE === "true";

  if (!host || !port || !user || !pass) {
    // Email disabilitate in questo ambiente
    console.warn(
      "[email] SMTP not configured (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS missing). Emails will not be sent."
    );
    return null;
  }

  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: secure ?? false,
    auth: {
      user,
      pass,
    },
  });

  return cachedTransporter;
}

type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Funzione base per inviare email.
 * Se SMTP non è configurato, logga e ritorna senza lanciare errori.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(
      "[email] Email sending skipped (no SMTP config). Intended email:",
      {
        to: params.to,
        subject: params.subject,
      }
    );
    return;
  }

  const from =
    config.SMTP_FROM ||
    process.env.SMTP_FROM ||
    'BitChange <no-reply@bitchange.money>';

  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html ?? params.text,
    });
  } catch (err) {
    console.error("[email] Failed to send email:", err);
    // NON rilanciamo errore, per non rompere il flusso applicativo
  }
}

/**
 * Email di benvenuto per nuovi utenti
 */
export async function sendWelcomeEmail(to: string) {
  const subject = "Welcome to BitChange";
  const text = `Welcome to BitChange!

Your account has been created successfully.

If you did not create this account, please contact support immediately.

BitChange Team`;

  const html = `
    <h2>Welcome to BitChange 👋</h2>
    <p>Your account has been created successfully.</p>
    <p>If you did not create this account, please contact support immediately.</p>
    <p>Best regards,<br/>BitChange Team</p>
  `;

  return sendEmail({
    to,
    subject,
    text,
    html,
  });
}

/**
 * Email per risposta supporto
 */
export async function sendSupportReplyEmail(params: {
  to: string;
  ticketId: number | string;
  message: string;
}) {
  const subject = `Support reply (Ticket #${params.ticketId})`;
  const text = `Hello,

We have replied to your support ticket #${params.ticketId}:

${params.message}

If you did not open this request or need further help, please reply to this email.

BitChange Support Team`;

  const html = `
    <h2>Support reply</h2>
    <p>We have replied to your support ticket <strong>#${escapeHtml(
      String(params.ticketId)
    )}</strong>:</p>
    <p>${escapeHtml(params.message)}</p>
    <p>If you did not open this request or need further help, please reply to this email.</p>
    <p>Best regards,<br/>BitChange Support Team</p>
  `;

  return sendEmail({
    to: params.to,
    subject,
    text,
    html,
  });
}

/**
 * Alert per nuovo login (nuovo IP / device)
 */
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
      <li><strong>Device / Browser:</strong> ${escapeHtml(
        params.userAgent
      )}</li>
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

/**
 * Email: ricevuta richiesta di prelievo
 */
export async function sendWithdrawalRequestEmail(params: {
  to: string;
  asset: string;
  amount: number;
  address: string;
}) {
  const subject = "Withdrawal request received";
  const text = `Hello,

We have received your withdrawal request:

Asset: ${params.asset}
Amount: ${params.amount}
Destination address: ${params.address}

We will process this request according to our standard verification and security checks.

If you did not initiate this withdrawal, please contact support immediately.

BitChange Security Team`;

  const html = `
    <h2>Withdrawal request received</h2>
    <p>We have received a new withdrawal request from your <strong>BitChange</strong> account:</p>
    <ul>
      <li><strong>Asset:</strong> ${escapeHtml(params.asset)}</li>
      <li><strong>Amount:</strong> ${escapeHtml(String(params.amount))}</li>
      <li><strong>Destination address:</strong> ${escapeHtml(
        params.address
      )}</li>
    </ul>
    <p>We will process this request according to our standard verification and security checks.</p>
    <p>If you did not initiate this withdrawal, please change your password immediately and contact support.</p>
    <p>Best regards,<br/>BitChange Security Team</p>
  `;

  return sendEmail({
    to: params.to,
    subject,
    text,
    html,
  });
}

/**
 * Email: aggiornamento stato prelievo (approved / rejected / pending)
 */
export async function sendWithdrawalStatusEmail(params: {
  to: string;
  asset: string;
  amount: number;
  status: "approved" | "rejected" | "pending";
  txId?: string | null;
  reason?: string | null;
}) {
  const subject = `Withdrawal ${params.status}`;
  const baseText = `Hello,

Your withdrawal request has been ${params.status}.

Asset: ${params.asset}
Amount: ${params.amount}
${params.txId ? `Transaction ID: ${params.txId}\n` : ""}${
    params.reason ? `Reason: ${params.reason}\n` : ""
  }

If you do not recognize this action, please contact support immediately.

BitChange Security Team`;

  const html = `
    <h2>Withdrawal ${escapeHtml(params.status)}</h2>
    <p>Your withdrawal request has been <strong>${escapeHtml(
      params.status
    )}</strong>.</p>
    <ul>
      <li><strong>Asset:</strong> ${escapeHtml(params.asset)}</li>
      <li><strong>Amount:</strong> ${escapeHtml(String(params.amount))}</li>
      ${
        params.txId
          ? `<li><strong>Transaction ID:</strong> ${escapeHtml(params.txId)}</li>`
          : ""
      }
      ${
        params.reason
          ? `<li><strong>Reason:</strong> ${escapeHtml(params.reason)}</li>`
          : ""
      }
    </ul>
    <p>If you do not recognize this action, please contact support immediately.</p>
    <p>Best regards,<br/>BitChange Security Team</p>
  `;

  return sendEmail({
    to: params.to,
    subject,
    text: baseText,
    html,
  });
}

/**
 * Email: aggiornamento stato KYC (approved / rejected)
 */
export async function sendKycStatusEmail(params: {
  to: string;
  status: "approved" | "rejected";
  reason?: string | null;
}) {
  const subject =
    params.status === "approved" ? "KYC approved" : "KYC review completed";

  const textApproved = `Hello,

Your KYC verification has been approved.

You can now access all features that require verified status.

BitChange Compliance Team`;

  const textRejected = `Hello,

Your KYC verification has been reviewed and was not approved.

Reason: ${params.reason || "no specific reason provided"}

You may update your documents and try again, or contact support for more information.

BitChange Compliance Team`;

  const htmlApproved = `
    <h2>KYC approved ✅</h2>
    <p>Your KYC verification has been approved.</p>
    <p>You can now access all features that require verified status.</p>
    <p>Best regards,<br/>BitChange Compliance Team</p>
  `;

  const htmlRejected = `
    <h2>KYC review completed</h2>
    <p>Your KYC verification has been reviewed and was <strong>not approved</strong>.</p>
    <p><strong>Reason:</strong> ${escapeHtml(
      params.reason || "no specific reason provided"
    )}</p>
    <p>You may update your documents and try again, or contact support for more information.</p>
    <p>Best regards,<br/>BitChange Compliance Team</p>
  `;

  const isApproved = params.status === "approved";

  return sendEmail({
    to: params.to,
    subject,
    text: isApproved ? textApproved : textRejected,
    html: isApproved ? htmlApproved : htmlRejected,
  });
}
