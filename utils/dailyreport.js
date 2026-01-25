import User from "../models/User.js";
import Loan from "../models/Loan.js";
import Withdrawal from "../models/Withdrawal.js";

export async function generateDailyReport(){
  const today = new Date();
  today.setHours(0,0,0,0);

  const [
    newUsers,
    loansRequested,
    loansApproved,
    withdrawalsRequested,
    withdrawalsApproved,
    withdrawalsBlocked
  ] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: today } }),
    Loan.countDocuments({ createdAt: { $gte: today } }),
    Loan.countDocuments({ status: "approved", updatedAt: { $gte: today } }),
    Withdrawal.countDocuments({ status: "requested", createdAt: { $gte: today } }),
    Withdrawal.countDocuments({ status: "approved", updatedAt: { $gte: today } }),
    Withdrawal.countDocuments({ status: "blocked", updatedAt: { $gte: today } })
  ]);

  const outstanding = await Loan.aggregate([
    { $match: { status: "approved" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  return {
    date: today.toDateString(),
    users: newUsers,
    loansRequested,
    loansApproved,
    withdrawalsRequested,
    withdrawalsApproved,
    withdrawalsBlocked,
    outstanding: outstanding[0]?.total || 0
  };
}
