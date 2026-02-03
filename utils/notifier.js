import nodemailer from "nodemailer";
import twilio from "twilio";

const mailer = nodemailer.createTransport({
  service:"gmail",
  auth:{
    user:process.env.MAIL_USER,
    pass:process.env.MAIL_PASS
  }
});

const sms = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_TOKEN
);

export function notifyEmail(to,subject,html){
  return mailer.sendMail({ from:"CryptoDigitalPro", to, subject, html });
}

export function notifySMS(phone,msg){
  return sms.messages.create({
    to:phone,
    from:process.env.TWILIO_FROM,
    body:msg
  });
}
