router.post("/kyc", auth, async (req,res)=>{
  const filePath = req.file.path;

  await pool.query(
    `UPDATE users
     SET kyc_status='pending', kyc_file=$1
     WHERE id=$2`,
    [filePath, req.user.id]
  );

  res.json({ success:true });
});
