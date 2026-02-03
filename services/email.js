import nodemailer from "nodemailer";

const mailer = nodemailer.createTransport({
  service:"gmail",
  auth:{
    user:process.env.MAIL_USER,
    pass:process.env.MAIL_PASS
  }
});

export function sendEmail(to,subject,text){
  return mailer.sendMail({...});
}
