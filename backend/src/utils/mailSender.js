import nodemailer from 'nodemailer'

const mailSender = async (email, title, body) => {
  try {
    console.log("📧 Attempting to send email to:", email);
    console.log("📧 Using MAIL_USER:", process.env.MAIL_USER ? "✅ Set" : "❌ Not Set");
    console.log("📧 Using MAIL_PASSWORD:", process.env.MAIL_PASSWORD ? "✅ Set" : "❌ Not Set");

    const transporter = nodemailer.createTransport({
      // host: process.env.MAIL_HOST,
      // port: process.env.MAIL_HOST,
      // secure: false, // true for 465, false for other ports
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: `"Virtual Therapist" <${process.env.MAIL_USER}>`,
      to: email,
      subject: title,
      html: body,
    });
    console.log("✅ Email sent successfully! Message ID:", info.messageId);
    return info
  } catch (error) {
    console.log("❌ Something went wrong while sending mail:", error.message);
    console.error("Full error:", error);
    return null; // Return null to indicate failure
  }
}

export { mailSender }