import { Router } from "express";
import { googleAuthCallback, loginUser, verifyLoginOtp, logoutUser, refreshAccessToken, registerUser, resetPassword, updateUserDetails, verifyEmail, completeSession, getCurrentUser } from "../controllers/user.controller.js";
import upload from "../middleware/multer.middlewares.js";
import passport from "passport";
import { verifyJwt } from "../middleware/auth.middlewares.js"

const router = Router()

router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route("/verify-login-otp").post(verifyLoginOtp)
router.route("/logout").post(logoutUser)
router.route("/verify-email").get(verifyEmail)
router.route("/reset-password").patch(resetPassword)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/user-details").put(verifyJwt, upload.single("userImage"), updateUserDetails)
router.route("/complete-session").post(verifyJwt, completeSession)
router.route("/current-user").get(verifyJwt, getCurrentUser)

//Google OAuth routes
router.route("/google").get(passport.authenticate('google', { scope: ['profile', 'email'] }));
router.route('/google/callback').get(passport.authenticate('google', { session: false, failureRedirect: '/api/v1/users/google/failure' }), googleAuthCallback)
router.get('/google/failure', (req, res) => {
  res.status(401).json({ success: false, message: "Google login failed" });
});
export default router