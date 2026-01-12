import { User } from "../models/users.model.js";
import { Otp } from "../models/otp.model.js";
import otpGenerator from "otp-generator";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { verificationToken } from "../utils/verificationToken.js";
import jwt from "jsonwebtoken";
import fs from "fs";
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validBeforeSave: false });
    return { refreshToken, accessToken };
  } catch (error) {
    console.log(
      "something went wrong while generating refresh and access token",
      error
    );
    throw new ApiError(
      500,
      "something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  console.log(req.body)
  const { username, email, password, otp } = req.body;

  if ([username, email, password, otp].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields including OTP are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(400, "User with this email or username already exists");
  }

  // Verify OTP
  const otpRecord = await Otp.findOne({ email, otp });

  if (!otpRecord) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  try {
    const user = await User.create({
      username: username.toLowerCase(),
      email,
      password,
      role: "User",
      isVerified: true,
    });

    // Delete OTP after successful registration
    await Otp.deleteOne({ _id: otpRecord._id });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      throw new ApiError(400, "Something went wrong while creating user");
    }

    return res
      .status(201)
      .json(new ApiResponse(201, createdUser, "User registered successfully"));
  } catch (error) {
    console.log("Something went wrong while creating user", error);
    throw new ApiError(500, "Something went wrong while creating user");
  }
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) {
    throw new ApiError(400, "Verification token is missing");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.EMAIL_VERIFICATION_SECRET);
  } catch (err) {
    throw new ApiError(400, "Invalid or expired token");
  }

  const user = await User.findOne({ email: decoded.email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isVerified === true) {
    return res
      .status(200)
      .json(new ApiResponse(200, null, "User already verified"));
  }

  user.isVerified = true;
  await user.save();

  res
    .status(200)
    .json(new ApiResponse(200, null, "Email verified successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  // if (user.isVerified === false) {
  //   throw new ApiError(400, "User not verfied");
  // }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid password");
  }

  try {
    // Delete old OTPs for this email
    await Otp.deleteMany({ email });

    // Generate new OTP
    let otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    // Ensure OTP is unique
    let result = await Otp.findOne({ otp });
    while (result) {
      otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });
      result = await Otp.findOne({ otp });
    }

    // Save OTP to database (this will trigger email sending via pre-save hook)
    const otpPayload = { email, otp };
    await Otp.create(otpPayload);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { email },
          "OTP sent to your email. Please verify to complete login."
        )
      );
  } catch (error) {
    console.log("Something went wrong while sending OTP", error);
    throw new ApiError(500, "Something went wrong while sending OTP");
  }
});

const verifyLoginOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  try {
    // Verify OTP
    const otpRecord = await Otp.findOne({ email, otp });

    if (!otpRecord) {
      throw new ApiError(400, "Invalid or expired OTP");
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    // Delete OTP after successful verification
    await Otp.deleteOne({ _id: otpRecord._id });

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { user: loggedInUser, accessToken, refreshToken },
          "Login successful"
        )
      );
  } catch (error) {
    console.log("OTP verification error", error);
    throw new ApiError(500, "Something went wrong while verifying OTP");
  }
});


const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    console.error("Refresh token error:", error);
    throw new ApiError(
      500,
      "Someting went wrong while refreshing access token"
    );
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req?.user?._id,
    {
      $set: {
        refreshToken: null,
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // true in production,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken")
    .json(new ApiResponse(200, "User logged out successfully"));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { password, email } = req.body;
  if (!password || !email) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(400, "User dose not exist");
  }
  try {
    user.password = password;
    await user.save();

    return res
      .status(200)
      .json(new ApiResponse(201, null, "User password changed succsessfully"));
  } catch (error) {
    console.log("failed to change password", error);

    throw new ApiError(500, "someting went wrong while changing user password");
  }
});

const googleAuthCallback = asyncHandler(async (req, res) => {
  console.log("user: ", req.user);

  try {
    const profile = req.user;
    const email = profile?.emails?.[0]?.value;
    const username = profile?.displayName;
    const userImage = profile?.photos?.[0].value;

    if (!email) {
      throw new ApiError(400, "email not found in google profile");
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        username,
        password: Math.random().toString(36).slice(-8),
        isVerified: true,
        userImage,
      });
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // true in production
      // sameSite: "Lax",
    };
    const url = process.env.NODE_ENV === "production" ? process.env.LIVE_URL : process.env.CLIENT_URL; // in production it will use Live Url
    console.log("URL: ", url);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .redirect(
        `${url}/oauth-success?accessToken=${accessToken}&refreshToken=${refreshToken}`
      );
    // .json(
    //   new ApiResponse(
    //     201,
    //     accessToken,
    //     refreshToken,
    //     user,
    //     "User Login with google successfully"
    //   )
    // );
  } catch (error) {
    console.log("something went wrong while logging with google");
    throw new ApiError(500, "something went wrong while logging with google");
  }
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  const userImage = req.file;

  const userImagePath = userImage?.path;
  const userId = req.user._id;
  if (!userId) {
    throw new ApiError(404, "user id not found");
  }

  const user = await User.findById(userId);
  const oldImage = user.userImage
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (oldPassword && newPassword) {
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
      if (userImagePath) fs.unlink(userImagePath, () => { });
      throw new ApiError(400, "Old password is incorrect");
    }
    user.password = newPassword;
  }
  try {
    if (userImage) {
      // Normalize path: public\images\foo.png -> /images/foo.png
      let normalizedPath = userImagePath.replace(/\\/g, "/");
      normalizedPath = normalizedPath.replace(/^(\.\/)?public\//, "");

      // Ensure it starts with /
      if (!normalizedPath.startsWith("/")) {
        normalizedPath = "/" + normalizedPath;
      }

      user.userImage = normalizedPath;
    }
    if (username) {
      user.username = username;
    }

    await user.save();
    if (userImagePath && oldImage) {
      fs.unlink(oldImage, (err) => {
        if (err) {
          console.log("failed to delete old image", err);
        } else {
          console.log("old image deleted successfully");
        }
      })
    }
    const updatedUser = await User.findById(userId).select("-password -refreshToken");

    return res
      .status(200)
      .json(new ApiResponse(200, updatedUser, "user details updated successfully"));
  } catch (error) {
    console.log("something went wrong while uploading image", error);
    if (userImagePath)
      fs.unlink(userImagePath, (err) => {
        if (err) {
          console.error("Failed to delete image after error:", err);
        }
      });
    throw new ApiError(500, "something went wrong while uploading image");
  }
});

const completeSession = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Increment currentSession if it exists, otherwise init to 2 (since they just completed 1?)
  if (!user.currentSession) {
    user.currentSession = 2; // Assuming they completed 1
  } else {
    user.currentSession += 1;
  }

  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { currentSession: user.currentSession }, "Session completed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

export {
  registerUser,
  loginUser,
  verifyLoginOtp,
  logoutUser,
  verifyEmail,
  resetPassword,
  googleAuthCallback,
  refreshAccessToken,
  updateUserDetails,
  completeSession,
  getCurrentUser,
};
