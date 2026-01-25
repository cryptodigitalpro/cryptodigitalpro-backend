import { generateDailyReport } from "./dailyReport.js";
import { sendMail } from "./mailer.js";
import User from "../models/User.js";

export async function sendDailyAdminReport(){
  const report = await generateDailyReport();

  const admins = await User.find({
    role: { $in: ["admin","superadmin"] }
  });

  const html = `
    <h2>📊 Daily Platform Report</h2>
    <p><b>Date:</b> ${report.date}</p>
    <ul>
      <li>👥 New Users: ${report.users}</li>
      <li>📄 Loans Requested: ${report.loansRequested}</li>
      <li>✅ Loans Approved: ${report.loansApproved}</li>
      <li>💸 Withdrawals Requested: ${report.withdrawalsRequested}</li>
      <li>✔ Withdrawals Approved: ${report.withdrawalsApproved}</li>
      <li>⛔ Withdrawals Blocked: ${report.withdrawalsBlocked}</li>
      <li>💰 Outstanding Loans: $${report.outstanding.toLocaleString()}</li>
    </ul>
  `;

  for(const admin of admins){
    await sendMail(
      admin.email,
      "Daily Admin Report — CryptoDigitalPro",
      html
    );
  }
}
