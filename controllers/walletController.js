const catchAsync = require("../utils/catchAsync");
const User = require("../models/user");
const Transaction = require("../models/transaction");
const Wallet = require("../models/wallet");
const flutterwave = require("../services/flutterwave");
const bcrypt = require("bcryptjs");
const AppError = require("../utils/appError");

const getWallet = catchAsync(async (req, res, next) => {
  const wallet = await Wallet.findOne({ user: req.user.id })
    .select("-transactionPin")
    .populate({
      path: "user",
      select: ["firstName", "lastName", "email"],
    });

  if (!wallet) {
    throw new AppError(
      `You don't have a wallet. Please contact the administrator`,
      404
    );
  }

  res.status(200).json({
    success: true,
    data: wallet,
  });
});

const getBalance = catchAsync(async (req, res, next) => {
  const wallet = await Wallet.findOne({ user: req.user.id });

  if (!wallet) {
    throw new AppError(
      `You don't have a wallet. Please contact the administrator`,
      404
    );
  }

  res.status(200).json({
    success: true,
    data: wallet.balance,
  });
});

const getTransaction = catchAsync(async (req, res, next) => {
  const transaction = await Transaction.findOne({ reference: req.params.ref });

  if (!transaction) {
    throw new AppError(`No transaction with the ref [${req.params.ref}]`, 404);
  }

  res.status(200).json({
    success: true,
    data: transaction,
  });
});

const getTransactions = catchAsync(async (req, res, next) => {
  const transactions = await Transaction.find({ user: req.user.id });

  if (!transactions) {
    throw new AppError(`You don't have any transactions`, 404);
  }

  res.status(200).json({
    success: true,
    data: transactions,
  });
});

const changePin = catchAsync(async (req, res, next) => {
  // Validate transaction pin
  const wallet = await Wallet.findOne({ user: req.user.id });
  if (!wallet)
    throw new Error(
      "There's no wallet associated with this account. Please contact your administrator."
    );

  const validPin = bcrypt.compareSync(req.body.oldPin, wallet.transactionPin);
  if (!validPin) throw new Error("The old transaction pin is invalid");

  const salt = await bcrypt.genSalt(10);
  req.body.newPin = await bcrypt.hash(req.body.newPin, salt);
  const query = { user: req.user.id };
  const updateQuery = { transactionPin: req.body.newPin };

  let wallets = await Wallet.findOneAndUpdate(query, updateQuery);

  res.status(200).json({
    success: true,
    message: "Successfully updated wallet transaction pin.",
    wallets,
  });
});

const deposit = catchAsync(async (req, res, next) => {
  let payload = {
    card_number: req.body.cardNumber,
    cvv: req.body.cvv,
    expiry_month: req.body.expiryMonth,
    expiry_year: req.body.expiryYear,
    currency: req.body.currency,
    amount: req.body.amount,
    email: req.body.email || req.user.email,
    fullname: req.body.fullName,
    tx_ref: generateReference("transaction"),
    enckey: process.env.FLUTTERWAVE_ENCRYPTION_KEY,
    pin: req.body.pin,
  };

  const response = await flutterwave.chargeCard(payload);

  // Store reCallCharge in session
  req.session.reCallCharge = response;

  res.status(200).json({
    success: true,
    data: response,
  });
});

const authorize = catchAsync(async (req, res, next) => {
  req.body.flw_ref = req.session.reCallCharge.data.flw_ref || req.body.flw_ref;
  req.body.userId = req.user.id;

  const response = await flutterwave.authorizeCardPayment(req.body);

  res.status(200).json({
    success: true,
    message: "Charge on card initiated",
    data: response,
  });
});

const transfer = catchAsync(async (req, res, next) => {
  // Validate transaction pin
  const wallet = await Wallet.findOne({ user: req.user.id });
  const validPin = bcrypt.compareSync(
    req.body.transactionPin,
    wallet.transactionPin
  );

  if (!validPin) throw new Error("Invalid transaction pin");

  // Verify account details
  const details = {
    account_number: req.body.accountNumber,
    account_bank: req.body.accountBank,
  };
  flw.Misc.verify_Account(details).then((response) => {
    if (response.status === "error") throw new Error(response.message);
  });

  if (wallet.balance < req.body.amount) {
    throw new Error("You don't have enough funds");
  }
  if (wallet.balance - req.body.amount <= 100) {
    throw new Error("Expected minimum amount in wallet to be NGN100");
  }

  const payload = {
    account_bank: req.body.accountBank,
    account_number: req.body.accountNumber,
    amount: req.body.amount,
    narration:
      req.body.description ||
      `Transfer from [${req.user.firstName} ${req.user.lastName}]`,
    currency: req.body.currency || "NGN",
    reference: generateReference("transfer"),
    callback_url: `${process.env.APP_BASE_URL}/api/v1/wallet/transfer/verify`,
  };

  const response = await flutterwave.transfer(payload);

  // Mask recipient account number
  response.data.account_number = response.data.account_number.replace(
    /(?<=.{4})./g,
    "*"
  );

  console.log(response);
  let newTransaction = {
    reference: response.data.reference,
    gatewayReference: response.data.flw_ref || "N/A",
    transactionType: "debit",
    paymentType: "account",
    amount: response.data.amount,
    currency: response.data.currency,
    recipient: response.data.account_number,
    description: response.data.narration,
    user: req.user.id,
  };

  if (response.data.status === "NEW") {
    newTransaction.status = "pending";
  } else if (response.data.status === "FAILED") {
    newTransaction.status = "failed";
  }

  let transaction = await Transaction.create(newTransaction);

  res.status(200).json({
    success: true,
    message: "Transfer initiated",
    data: transaction,
  });
});

// Simple transfer verification webhook
const verify = catchAsync(async (req, res, next) => {
  let transactionStatus = req.body.data.data.status;
  let transactionReference = req.body.data.data.reference;

  const query = { reference: transactionReference };
  let updateQuery;

  if (transactionStatus === "SUCCESSFUL") {
    updateQuery = { status: "successful" };
  } else if (transactionStatus === "FAILED") {
    updateQuery = { status: "failed" };
  }

  let transaction = await Transaction.findOneAndUpdate(query, updateQuery);

  res.status(200).json({
    success: true,
    transaction,
  });
});

let generateReference = (type) => {
  if (type === "transaction")
    return `myWALLT-TRANS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  else if (type === "transfer")
    return `myWALLT-TRANSF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

const create = catchAsync(async (req, res, next) => {
  const createdAccount = flutterwave.createSubaccount(req.body);
  console.log("createdAccount", createdAccount);
  res.status(200).json({
    success: true,
    createdAccount,
  });
});
const fetchsubaccount = catchAsync(async (req, res, next) => {
  const data = flutterwave.fetchSubaccount(req.body);
  console.log("createdAccount", data.data);
  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  getWallet,
  getBalance,
  getTransaction,
  getTransactions,
  changePin,
  deposit,
  authorize,
  transfer,
  verify,
  create,
  fetchsubaccount,
};
