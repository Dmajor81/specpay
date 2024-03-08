const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
  reference: {
    type: String,
    required: true,
    trim: true,
  },
  gatewayReference: {
    type: String,
    required: true,
    trim: true,
  },
  transactionType: {
    type: String,
    required: true,
    enum: ["debit", "credit"],
    default: "debit",
  },
  paymentType: {
    type: String,
    required: true,
    enum: ["card", "account"],
  },
  amount: {
    type: mongoose.Decimal128,
    default: 0,
    required: true,
  },
  currency: {
    type: String,
    default: "NGN",
  },
  recipient: {
    type: String,
    required: false,
  },
  status: {
    type: String,
    enum: ["pending", "successful", "failed", "flagged"],
    default: "pending",
  },
  description: {
    type: String,
    required: false,
  },
  deviceFingerprint: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
});

// Static method to get total sum of transaction balance
TransactionSchema.statics.sumBalances = async function (userId) {
  const obj = await this.aggregate([
    { $match: { user: userId, status: "successful" } },
    {
      $group: {
        _id: "$user", // Group all transaction by userId
        transactionSum: { $sum: "$amount" }, // Sums up all transaction by userId
      },
    },
  ]);

  try {
    await this.model("Wallet").findOneAndUpdate(
      { user: userId },
      {
        balance: obj[0].transactionSum,
      }
    );
  } catch (error) {
    console.error(error);
  }
};

// Aggregate transaction balance
TransactionSchema.post("save'", function () {
  this.constructor.sumBalances(this.user);
});

const Transaction = mongoose.model("Transaction", TransactionSchema);

module.exports = Transaction;
