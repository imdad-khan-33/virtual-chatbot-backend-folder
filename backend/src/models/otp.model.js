import mongoose from "mongoose";
import { mailSender } from "../utils/mailSender.js"
const { Schema } = mongoose

const otpSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 1, // The document will be automatically deleted after 5 minutes of its creation time
  },
});
// Define a function to send emails
async function sendVerificationEmail(email, otp) {
  try {
    console.log(`Preparing to send OTP email to: ${email}`);
    const mailResponse = await mailSender(
      email,
      "Verification Email",
      `<h1>Please confirm your OTP</h1>
       <p>Here is your OTP code: <strong>${otp}</strong></p>`
    );


    if (mailResponse) {
      console.log(" Email sent successfully via Model Hook");
    } else {
      console.log(" Email sending failed via Model Hook");
      throw new Error("Email sending failed. Please check backend logs.");
    }
  } catch (error) {
    console.log(" Error occurred while sending email: ", error.message);
    throw error;
  }
}
otpSchema.pre("save", async function (next) {
  console.log(" Saving OTP document to database...");
  // Only send an email when a new document is created
  if (this.isNew) {
    console.log(" New OTP document detected, triggering email...");
    await sendVerificationEmail(this.email, this.otp);
  }
  next();
});
export const Otp = mongoose.model("OTP", otpSchema);