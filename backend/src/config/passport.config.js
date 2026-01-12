import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || "dummy-client-id",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy-client-secret",
  callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/auth/google/callback"
},
  async (accessToken, refreshToken, profile, done) => {
    // Simply forward user profile to the next step
    return done(null, profile);
  }
))
