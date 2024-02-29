const express = require("express");
const {
  signup,
  login,
  logout,
  forgotPassword,
  resetPassword,
  updatePassword,
  protect,
  handleSendOTP,
  handleVerifyOTP,
  handleVerifyBVN,
} = require("../controllers/authController");

const router = express.Router();

router.post("/sendotp", handleSendOTP);
router.post("/verifyotp", handleVerifyOTP);
router.get("/verifybvn", handleVerifyBVN);
router.post("/register", signup);
router.post("/login", login);
router.get("/logout", logout);

router.post("/forgotPassword", forgotPassword);
router.patch("/resetPassword/:otp", resetPassword);

// Protect all routes after this middleware
router.use(protect);

router.patch("/updateMyPassword", updatePassword);
// router.get("/me", userController.getMe, userController.getUser);

module.exports = router;
