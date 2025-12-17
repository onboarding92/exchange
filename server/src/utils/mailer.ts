import nodemailer from "nodemailer";

export async function sendEmail(opts: { to: string; subject: string; text?: string; html?: string }) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "noreply@localhost";

  // If SMTP not configured, do not crash production build/runtime
  if (!host || !port || !user || !pass) {
    console.log("[mailer] SMTP not configured; skipping email:", { to: opts.to, subject: opts.subject });
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}
