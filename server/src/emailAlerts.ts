import { sendEmail } from "./email";

export async function sendLoginAlert(email: string, ip: string) {
  const html = `
  <h2>New Login Detected</h2>
  <p>A new login occurred on your account.</p>
  <p><strong>IP:</strong> ${ip}</p>
  <p>If this wasn't you, reset your password immediately.</p>
  `;
  await sendEmail(email, "New Login Alert", html);
}
