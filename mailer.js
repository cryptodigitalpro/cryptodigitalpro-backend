import nodemailer from "nodemailer";

export const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

export function sendMail(to, subject, html){
  return mailer.sendMail({
    from: `"CryptoDigitalPro" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html
  });
}
