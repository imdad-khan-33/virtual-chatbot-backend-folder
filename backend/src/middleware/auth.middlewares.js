import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/users.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyJwt = asyncHandler(async (req, _, next) => {
  // const token = req.header(("Authorization")?.replace("Bearer ", ""))
//   console.log(token);
  
  const authHeader = req.header("Authorization");
  let token;

  if (req?.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.replace("Bearer ", "");
  }

  if (!token) {
    throw new ApiError(401, "Unautharized");
  }
  let decodedToken;
  try {
    // decode() does not verify the token signature, so anyone could send a fake token.
    // use verify() This both decodes and verifies the JWT against the secret.
    // const decondeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiError(401, "Unauthorized ");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
