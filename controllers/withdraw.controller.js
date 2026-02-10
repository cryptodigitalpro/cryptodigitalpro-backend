import { db } from "../db.js";
import { notifyUser, notifyAdmins } from "../ws.js";

/**
 * PROCESS WITHDRAWAL PROGRESS
 * Admin-controlled, deterministic flow
 */
export async function processWithdrawal(withdraw) {
  if (!withdraw || withdraw.status !== "processing") return;

  // deterministic increment
  const progress = Math.min((withdraw.progress || 0) + 10, 100);

  /* ================= 47% — GAS FEE REQUIRED ================= */
  if (progress >= 47 && !withdraw.fee_paid) {
    await db.query(
      `UPDATE withdrawals
       SET progress = 47, status = 'fee_required'
       WHERE id = $1`,
      [withdraw.id]
    );

    notifyUser(withdraw.user_id, {
      type: "withdraw",
      progress: 47,
      message: "Gas fee required to continue withdrawal"
    });

    notifyAdmins({ type: "withdraw_update", id: withdraw.id });
    return;
  }

  /* ================= 73% — VERIFICATION HOLD ================= */
  if (progress >= 73 && withdraw.fee_paid && !withdraw.admin_verified) {
    await db.query(
      `UPDATE withdrawals
       SET progress = 73, status = 'verification_hold'
       WHERE id = $1`,
      [withdraw.id]
    );

    notifyUser(withdraw.user_id, {
      type: "withdraw",
      progress: 73,
      message: "Withdrawal under admin verification"
    });

    notifyAdmins({ type: "withdraw_update", id: withdraw.id });
    return;
  }

  /* ================= 100% — COMPLETE (LEDGER DEBIT) ================= */
  if (progress >= 100 && withdraw.admin_verified) {
    try {
      await db.query("BEGIN");

      // lock withdrawal row (prevents double processing)
      const w = await db.query(
        `SELECT * FROM withdrawals
         WHERE id = $1 AND status != 'completed'
         FOR UPDATE`,
        [withdraw.id]
      );

      if (!w.rows.length) {
        await db.query("ROLLBACK");
        return;
      }

      // mark withdrawal completed
      await db.query(
        `UPDATE withdrawals
         SET progress = 100, status = 'completed'
         WHERE id = $1`,
        [withdraw.id]
      );

      // ledger debit (SOURCE OF TRUTH)
      await db.query(
        `INSERT INTO balance_ledger
         (user_id, amount, type, reference_id, admin_id, note)
         VALUES ($1, $2, 'withdrawal', $3, $4, 'Withdrawal completed')`,
        [
          withdraw.user_id,
          -withdraw.amount,
          withdraw.id,
          withdraw.admin_id || null
        ]
      );

      await db.query("COMMIT");

      notifyUser(withdraw.user_id, {
        type: "withdraw",
        progress: 100,
        message: "Withdrawal completed successfully"
      });

      notifyAdmins({ type: "withdraw_update", id: withdraw.id });
      return;

    } catch (err) {
      await db.query("ROLLBACK");
      console.error("Withdrawal completion failed:", err);
      return;
    }
  }

  /* ================= NORMAL PROGRESS UPDATE ================= */
  await db.query(
    `UPDATE withdrawals
     SET progress = $1
     WHERE id = $2`,
    [progress, withdraw.id]
  );

  notifyAdmins({ type: "withdraw_update", id: withdraw.id });
}