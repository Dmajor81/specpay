const axios = require("axios");

const verifyBvn = async (firstName, lastName, bvn, dob) => {
  const options = {
    method: "GET",
    url: `https://sandbox.dojah.io/api/v1/kyc/bvn?bvn=${bvn}&first_name=${firstName}&last_name=${lastName}&dob=${dob}`,
    headers: {
      accept: "application/json",
      Authorization: `${process.env.DOJAH_AUTHORIZATION}`,
      AppId: `${process.env.DOJAH_APPID}`,
    },
  };

  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.error) {
      throw new Error(error.response.data.error);
    } else {
      throw new Error(error.message);
    }
    throw error;
  }
};

module.exports = { verifyBvn };
