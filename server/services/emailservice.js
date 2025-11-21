import nodemailer from "nodemailer";

function getConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "0");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!host || !port || !user || !pass || !from) {
    throw new Error("SMTP configuration missing. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.");
  }

  return { host, port, auth: { user, pass }, from };
}

export async function sendResetEmail({ to, code }) {
  const config = getConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465, // true for SMTPS
    auth: config.auth,
  });

  const message = {
    from: config.from,
    to,
    subject: "GAINS password reset code",
    text: `Your GAINS reset code is: ${code}\n\nThis code expires in 15 minutes. If you did not request this, you can ignore this email.`,
  };

  await transporter.sendMail(message);
}