const mongoose = require("mongoose");

const SettlementAccountSchema = new mongoose.Schema({
  accountNumber: {
    type: Number,
    required: true,
  },
  accountName: {
    type: String,
    required: true,
  },
  default: {
    type: Boolean,
    required: true,
    default: false,
  },
  currency: {
    type: String,
    default: "NGN",
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

const SettlementAccount = mongoose.model(
  "SettlementAccount",
  SettlementAccountSchema
);

module.exports = SettlementAccount;
