const nodemailer = require("nodemailer");

const getTransporter = () => {
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("MAIL_USER / MAIL_APP_PASSWORD are missing in backend .env");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass }
  });
};

const sendMail = async ({ to, subject, html, text }) => {
  const transporter = getTransporter();
  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject,
    text,
    html
  });
};

module.exports = { sendMail };

