// Quick Email Configuration Checker
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

console.log('\n🔍 Checking Email Configuration...\n');

const checks = {
    'MAIL_USER': process.env.MAIL_USER,
    'MAIL_PASSWORD': process.env.MAIL_PASSWORD,
};

let allGood = true;

for (const [key, value] of Object.entries(checks)) {
    if (value) {
        if (key === 'MAIL_PASSWORD') {
            console.log(`✅ ${key}: ${'*'.repeat(value.length)} (Hidden for security)`);
        } else {
            console.log(`✅ ${key}: ${value}`);
        }
    } else {
        console.log(`❌ ${key}: NOT SET`);
        allGood = false;
    }
}

console.log('\n' + '='.repeat(50));

if (allGood) {
    console.log('✅ All email configuration variables are set!');
    console.log('\n📝 Next Steps:');
    console.log('1. Make sure you are using Gmail App Password (not regular password)');
    console.log('2. Restart your backend server');
    console.log('3. Test OTP sending from frontend');
} else {
    console.log('❌ Email configuration is incomplete!');
    console.log('\n📝 To Fix:');
    console.log('1. Open .env file in backend folder');
    console.log('2. Add these lines:');
    console.log('   MAIL_USER=your-email@gmail.com');
    console.log('   MAIL_PASSWORD=your-16-digit-app-password');
    console.log('3. Get Gmail App Password from: https://myaccount.google.com/apppasswords');
    console.log('4. Restart backend server');
    console.log('\n📖 Full guide: See EMAIL_SETUP_GUIDE.md in project root');
}

console.log('='.repeat(50) + '\n');
