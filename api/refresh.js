app.post("/api/refresh", async (req,res)=>{
  const { refreshToken } = req.body;
  if(!refreshToken) return res.sendStatus(401);

  const q = await pool.query(
    "SELECT * FROM refresh_tokens WHERE token=$1",
    [refreshToken]
  );

  if(!q.rows.length) return res.sendStatus(403);

  const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

  const accessToken = jwt.sign(
    { id: payload.id },
    process.env.JWT_SECRET,
    { expiresIn:"15m" }
  );

  res.json({ accessToken });
});
