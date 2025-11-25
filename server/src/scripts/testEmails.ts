import "dotenv/config";
import {
  sendWelcomeEmail,
  sendLoginAlertEmail,
  sendWithdrawalRequestEmail,
  sendWithdrawalStatusEmail,
  sendKycStatusEmail,
  sendSupportReplyEmail,
  sendDepositStatusEmail,
  sendPasswordResetEmail,
} from "../email";

async function main() {
  const to =
    process.env.TEST_EMAIL_TO ||
    process.env.SMTP_TEST_TO ||
    process.env.SMTP_USER;

  if (!to) {
    console.error(
      "Please set TEST_EMAIL_TO (or SMTP_TEST_TO) in your .env file."
    );
    process.exit(1);
  }

  console.log("Sending test emails to:", to);
  const now = new Date().toISOString();

  // 1) Welcome email (account created)
  await sendWelcomeEmail(to);

  // 2) Login alert
  await sendLoginAlertEmail({
    to,
    ip: "127.0.0.1",
    userAgent: "Colab Test Script",
    createdAt: now,
  });

  // 3) Withdrawal request
  await sendWithdrawalRequestEmail({
    to,
    asset: "BTC",
    amount: 0.1234,
    address: "bc1qtestaddress0000000000000000000",
  });

  // 4) Withdrawal status (approved)
  await sendWithdrawalStatusEmail({
    to,
    asset: "BTC",
    amount: 0.1234,
    status: "approved",
    txId: "TEST-TX-ID-12345",
  });

  // 5) KYC status (approved)
  await sendKycStatusEmail({
    to,
    status: "approved",
  });

  // 6) Support reply
  await sendSupportReplyEmail({
    to,
    ticketId: "TEST-123",
    message: "This is a test reply from BitChange support.",
  });

  // 7) Deposit status (credited)
  await sendDepositStatusEmail({
    to,
    asset: "USDT",
    amount: 250,
    status: "credited",
    txId: "TEST-DEPOSIT-TX-1",
    gateway: "TestGateway",
  });

  // 8) Password reset
  await sendPasswordResetEmail({
    to,
    resetLink: "https://bitchange.money/reset-password/test-token",
    expiresAt: now,
  });

  console.log("All test emails sent (or attempted). Check your SMTP inbox/logs.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
