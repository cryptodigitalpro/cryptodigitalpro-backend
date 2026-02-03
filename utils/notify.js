import { sendMail } from "../mailer.js";
import twilio from "twilio";

const smsClient = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_TOKEN
);

export async function notifyEmail(to, subject, html) {
  await sendMail(to, subject, html);
}

export async function notifySMS(phone, message) {
  if (!phone) return;

  await smsClient.messages.create({
    from: process.env.TWILIO_PHONE,
    to: phone,
    body: message
  });
}
