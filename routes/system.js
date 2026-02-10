async function creditLoanSystem(loanId) {
  await pool.query("BEGIN");

  const loanRes = await pool.query(
    "SELECT * FROM loans WHERE id=$1 FOR UPDATE",
    [loanId]
  );
  const loan = loanRes.rows[0];

  if (loan.status !== "approved_lvl2") {
    await pool.query("ROLLBACK");
    throw new Error("Loan not fully approved");
  }

  await pool.query(
    "UPDATE users SET balance = balance + $1 WHERE id=$2",
    [loan.amount, loan.user_id]
  );

  await pool.query(
    "UPDATE loans SET status='credited' WHERE id=$1",
    [loanId]
  );

  await pool.query(
    `INSERT INTO balance_ledger
     (user_id, amount, type, note)
     VALUES ($1,$2,'loan','Auto credit after dual approval')`,
    [loan.user_id, loan.amount]
  );

  await pool.query("COMMIT");
}