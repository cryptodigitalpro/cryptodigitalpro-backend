import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

export async function sendEmail(to, subject, html) {
  await transporter.sendMail({
    from: "CryptoDigitalPro <no-reply@cryptodigitalpro.com>",
    to,
    subject,
    html
  });
}
