import { db } from "../db.js";
import { notifyUser, notifyAdmins } from "../ws.js";

export async function processWithdrawal(withdraw) {
  if (!withdraw || withdraw.status !== "processing") return;

  let progress = (withdraw.progress || 0) + 6;

  // 🛑 47% — GAS FEE
  if (progress >= 47 && !withdraw.fee_paid) {
    await db.query(
      "UPDATE withdrawals SET progress=47, status='fee_required' WHERE id=$1",
      [withdraw.id]
    );

    notifyUser(withdraw.user_id, {
      type: "withdraw",
      progress: 47,
      message: "Deposit USDT gas fee to continue withdrawal"
    });

    notifyAdmins({ type: "withdraw_update", id: withdraw.id });
    return;
  }

  // 🛑 73% — VERIFICATION
  if (progress >= 73 && withdraw.fee_paid && !withdraw.admin_verified) {
    await db.query(
      "UPDATE withdrawals SET progress=73, status='verification_hold' WHERE id=$1",
      [withdraw.id]
    );

    notifyUser(withdraw.user_id, {
      type: "withdraw",
      progress: 73,
      message: "Withdrawal under verification. Contact admin."
    });

    notifyAdmins({ type: "withdraw_update", id: withdraw.id });
    return;
  }

  // ✅ COMPLETE
  if (progress >= 100 && withdraw.admin_verified) {
    await db.query(
      "UPDATE withdrawals SET progress=100, status='completed' WHERE id=$1",
      [withdraw.id]
    );

    notifyUser(withdraw.user_id, {
      type: "withdraw",
      progress: 100,
      message: "Withdrawal completed successfully"
    });

    notifyAdmins({ type: "withdraw_update", id: withdraw.id });
    return;
  }

  await db.query(
    "UPDATE withdrawals SET progress=$1 WHERE id=$2",
    [progress, withdraw.id]
  );

  notifyAdmins({ type: "withdraw_update", id: withdraw.id });
}
