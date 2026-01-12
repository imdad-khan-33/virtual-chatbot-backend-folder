import dotenv from "dotenv";
import path from "path";

dotenv.config();

console.log("Checking Environment Variables for Backend...");

const keysToCheck = [
    "PORT",
    "MONGODB_URI",
    "CORS_ORIGIN",
    "ACCESS_TOKEN_SECRET",
    "ACCESS_TOKEN_EXPIRY",
    "REFRESH_TOKEN_SECRET",
    "REFRESH_TOKEN_EXPIRY",
    "EMAIL_VERIFICATION_SECRET",
    "EMAIL_VERIFICATION_EXPIRY",
    "MAIL_USER",
    "MAIL_PASSWORD",
    "CLIENT_URL",
    "LIVE_URL"
];

keysToCheck.forEach(key => {
    if (process.env[key]) {
        console.log(`✅ ${key} is present.`);
    } else {
        console.log(`❌ ${key} is REMOVED or MISSING!`);
    }
});
