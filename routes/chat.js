import express from "express";
import { notifyUser } from "../ws.js";
import { pool } from "../server.js";
import { auth, authAdmin } from "../middleware/auth.js";

const router = express.Router();

/* Admin sends message */
router.post("/admin", auth, authAdmin, async (req,res)=>{
  const { userId, message } = req.body;

  await pool.query(
    "INSERT INTO messages(user_id,from_admin,message) VALUES($1,true,$2)",
    [userId,message]
  );

  notifyUser(userId,{
    type:"chat",
    from:"admin",
    message
  });

  res.json({success:true});
});

export default router;
