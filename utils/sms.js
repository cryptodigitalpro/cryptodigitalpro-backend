import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH
);

export function sendSMS(to, message) {
  return client.messages.create({
    body: message,
    from: process.env.TWILIO_NUMBER,
    to
  });
}
