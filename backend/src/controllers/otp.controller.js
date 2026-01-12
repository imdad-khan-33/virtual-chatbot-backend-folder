import otpGenerator from "otp-generator";
import { Otp } from "../models/otp.model.js";
import { User } from "../models/users.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
const sendOtp = asyncHandler(async (req, res) => {
  const { email, isSignup } = req.body;

  const checkUserPresent = await User.findOne({ email });

  // For signup: user should NOT exist
  // For login/reset: user MUST exist
  if (isSignup && checkUserPresent) {
    throw new ApiError(400, "User with this email already exists");
  }

  if (!isSignup && !checkUserPresent) {
    throw new ApiError(400, "User not found with this email");
  }
  try {
    await Otp.deleteMany({ email }); // delete old otp

    let otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });
    let result = await Otp.findOne({ otp: otp });
    while (result) {
      otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });
      result = await Otp.findOne({ otp: otp });
    }
    const otpPayload = { email, otp };
    const otpBody = await Otp.create(otpPayload);
    return res
      .status(200)
      .json(new ApiResponse(200, otp, "Otp sent successfully"));
  } catch (error) {
    throw new ApiError(500, "something went wrong while sending otp");
  }
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  if (!otp) {
    throw new ApiError(400, "otp is missing");
  }

  try {
    const existing = await Otp.findOne({ otp });
    if (!existing) {
      throw new ApiError(400, "Otp is missing or Invalid");
    }
    await Otp.deleteOne({ _id: existing._id });
    return res
      .status(200)
      .json(new ApiResponse(200, "OTP verified successfully"));
  } catch (error) {
    console.log("otp verification error", error);

    throw new ApiError(500, "something went wrong while verifing otp");
  }
});
export { sendOtp, verifyOtp };
