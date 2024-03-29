const express = require("express");
const morx = require("morx");

const {
  fetchsubaccount,
  create,
  verify,
  transfer,
  authorize,
  deposit,
  changePin,
  getTransactions,
  getTransaction,
  getBalance,
  getWallet,
} = require("../controllers/walletController");

const router = express.Router();

router.get(
  "/",
  (req, res, next) => {
    next();
  },
  getWallet
);

router.get(
  "/balance",
  (req, res, next) => {
    next();
  },
  getBalance
);

router.get(
  "/transactions/:ref",

  (req, res, next) => {
    next();
  },
  getTransaction
);

router.get(
  "/transactions",

  (req, res, next) => {
    next();
  },
  getTransactions
);

router.post(
  "/changePin",

  (req, res, next) => {
    var spec = morx
      .spec()
      .build("oldPin", "required:true")
      .build("newPin", "required:true")
      .end();

    req.body = morx.validate(req.body, spec, { throw_error: true }).params;

    if (req.body.oldPin.length !== 4 || req.body.newPin.length !== 4) {
      throw Error("Invalid PIN. Please enter a 4-digit PIN, e.g 1111");
    }

    next();
  },
  changePin
);

router.post(
  "/deposit",

  (req, res, next) => {
    var spec = morx
      .spec()
      .build("cardNumber", "required:true")
      .build("cvv", "required:true")
      .build("expiryMonth", "required:true")
      .build("expiryYear", "required:true")
      .build("currency", "required:true")
      .build("amount", "required:true")
      .build("email", "required:true")
      .build("fullName", "required:true")
      .build("phoneNumber", "required:false")
      .build("pin", "required:true")
      .end();

    req.body = morx.validate(req.body, spec, { throw_error: true }).params;

    if (req.body.pin.length !== 4) {
      throw Error("Invalid PIN. Please enter a 4-digit PIN, e.g 1111");
    }

    next();
  },
  deposit
);

router.post(
  "/deposit/authorize",

  (req, res, next) => {
    next();
  },
  authorize
);

router.post(
  "/transfer",
  (req, res, next) => {
    var spec = morx
      .spec()
      .build("accountBank", "required:true")
      .build("accountNumber", "required:true")
      .build("amount", "required:true")
      .build("description", "required:true")
      .build("currency", "required:true")
      .build("transactionPin", "required:true")
      .end();

    if (req.body.transactionPin.length !== 4) {
      throw Error(
        "Invalid transaction PIN. Please enter a 4-digit PIN, e.g 1111"
      );
    }

    if (
      req.body.accountNumber.length < 8 ||
      req.body.accountNumber.length > 12
    ) {
      throw Error(
        "Invalid account number (Expected length of account number must be with 8 to 12)"
      );
    }

    if (req.body.amount <= 0) {
      throw new Error("Invalid transfer amount");
    }

    req.body = morx.validate(req.body, spec, { throw_error: true }).params;

    next();
  },
  transfer
);

router.post(
  "/transfer/verify",
  (req, res, next) => {
    next();
  },
  verify
);

router.post("/create", create);
router.get("/fetch", fetchsubaccount);

module.exports = router;
