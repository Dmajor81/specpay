// // Download the helper library from https://www.twilio.com/docs/node/install
// // Find your Account SID and Auth Token at twilio.com/console
// // and set the environment variables. See http://twil.io/secure
// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const serviceSid = process.env.TWILIO_SERVICE_SID;

const User = require("../models/user");
const AppError = require("../utils/appError");

// const sentOtp = async (firstName, lastName, bvn, dob) => {
//   const client = require("twilio")(accountSid, authToken);

//   client.verify.v2
//     .services(serviceSid)
//     .verifications.create({ to: "+2349027448894", channel: "sms" })
//     .then((verification) => console.log(verification.status));
// };
// // Download the helper library from https://www.twilio.com/docs/node/install
// // Find your Account SID and Auth Token at twilio.com/console
// // and set the environment variables. See http://twil.io/secure

// const verifyOtp = async (phone, otp) => {
//   const client = require("twilio")(accountSid, authToken);

//   client.verify.v2
//     .services(serviceSid)
//     .verificationChecks.create({ to: "+2349027448894", code: "123456" })
//     .then((verification_check) => console.log(verification_check.status));
// };

// module.exports = { sentOtp, verifyOtp };

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;

const sentOtp = async (phone) => {
  const existingUser = await User.findOne({ phone });

  if (existingUser) {
    throw new AppError(`user already exists, Login`, 400);
  }
  const client = require("twilio")(accountSid, authToken);

  try {
    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications.create({ to: phone, channel: "sms" });
    return verification;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const verifyOtp = async (phone, otp) => {
  const client = require("twilio")(accountSid, authToken);

  try {
    const verificationCheck = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phone, code: otp });
    console.log("verificationCheck", verificationCheck);
    return verificationCheck.status;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports = { sentOtp, verifyOtp };
