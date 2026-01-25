router.get("/kyc", auth, authAdmin, async (req,res)=>{
  const q = await pool.query(
    "SELECT id,email,kyc_status,kyc_file FROM users WHERE kyc_status='pending'"
  );
  res.json(q.rows);
});
