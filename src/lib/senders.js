import nodemailer from "nodemailer";
import twilio from "twilio";
import { translations } from "@/lib/translations";

const BRAND_EN = translations.en.brandName;

// -------------------------------------------------------------------
// 📧 EMAIL SENDER (Nodemailer via SMTP)
// -------------------------------------------------------------------
export async function sendResetEmail(to, token) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === "true", 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_APP_PASSWORD, 
      },
    });

    const resetLink = `${process.env.AUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(to)}`;

    const mailOptions = {
      from: `"${BRAND_EN} Security" <${process.env.SMTP_USER}>`,
      to: to,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background: #000; padding: 40px; border-radius: 16px; color: #fff; text-align: center;">
            <h1 style="color: #f59e0b; margin-bottom: 20px;">${BRAND_EN}</h1>
            <h2 style="color: #fff; margin-bottom: 20px;">Reset Your Password</h2>
            <p style="color: #9ca3af; line-height: 1.6; margin-bottom: 30px;">
                We received a request to reset your password. Click the button below to set a new password. If you didn't make this request, you can safely ignore this email.
            </p>
            <a href="${resetLink}" style="display: inline-block; background-color: #f59e0b; color: #000; font-weight: bold; padding: 14px 28px; border-radius: 50px; text-decoration: none;">
                Reset Password
            </a>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                This link will expire in 1 hour.
            </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    return true;

  } catch (error) {
    console.error("Failed to send email:", error.message);
    return false; // Return false so the calling action knows it failed
  }
}

// -------------------------------------------------------------------
// 💬 SMS SENDER (Twilio)
// -------------------------------------------------------------------
export async function sendResetSMS(to, token) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.warn("[SMS] Twilio credentials missing. SMS not sent.");
      return false;
    }

    const client = twilio(accountSid, authToken);
    const resetLink = `${process.env.AUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(to)}`;

    const message = await client.messages.create({
      body: `${BRAND_EN}: Your password reset link is: ${resetLink} \nValid for 1 hr. Do not share.`,
      from: fromNumber,
      to: to, // Must be in E.164 format, e.g., +1234567890
    });

    
    return true;

  } catch (error) {
    console.error("Failed to send SMS:", error.message);
    return false;
  }
}
