import jwt from "jsonwebtoken";
import { mailSender } from "./mailSender.js";
import { ApiError } from "./ApiError.js";

const verificationToken = async (email) => {
  const token = jwt.sign({ email }, process.env.EMAIL_VERIFICATION_SECRET, {
    expiresIn: process.env.EMAIL_VERIFICATION_EXPIRY,
  });

  const baseUrl =
    process.env.NODE_ENV === "development"
      ? process.env.CLIENT_URL
      : process.env.LIVE_URL;

  const verificationUrl = `${baseUrl}/api/v1/users/verify-email?token=${token}`;
  try {
    const mailResponse = await mailSender(
      email,
      "Verify your email",
      `
      <h2>Verify your email</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationUrl}" target="_blank">Verify Email</a>
      <p>If you did not request this, please ignore this email.</p>
      `
    );
    return mailResponse
  } catch (error) {
    console.log("Error while sending email", error);
    throw new ApiError(400, "Something went wrong while sending email");
  }
};

export { verificationToken };
