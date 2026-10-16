import nodemailer from "nodemailer";
import twilio from "twilio";
import { translations } from "@/lib/translations";
import { getAbsoluteSiteUrl } from "@/lib/site-url";

const BRAND_EN = translations.en.brandName;

function isMockSmsProvider() {
  return String(process.env.SMS_PROVIDER || "").toLowerCase() === "mock";
}

function logMockSms(kind, payload) {
  console.info(`[MOCK_SMS:${kind}]`, payload);
}

// -------------------------------------------------------------------
// 📧 EMAIL SENDER (Nodemailer via SMTP)
// -------------------------------------------------------------------
export async function sendEmailVerification(to, token) {
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
    if (!process.env.SMTP_USER) return false;

    const verifyUrl = `${getAbsoluteSiteUrl()}/account/settings?vt=${encodeURIComponent(token)}&ve=${encodeURIComponent(to)}`;

    await transporter.sendMail({
      from: `"${BRAND_EN}" <${process.env.SMTP_USER}>`,
      to,
      subject: "Verify your email",
      html: `<p>Verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`,
    });
    return true;
  } catch (e) {
    console.error("sendEmailVerification:", e.message);
    return false;
  }
}

export async function sendAccountDeletionEmail(to) {
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
    if (!process.env.SMTP_USER) return false;
    await transporter.sendMail({
      from: `"${BRAND_EN}" <${process.env.SMTP_USER}>`,
      to,
      subject: "Account closed",
      html: `<p>Your account has been closed as requested. This address is no longer active on our store.</p>`,
    });
    return true;
  } catch (e) {
    console.error("sendAccountDeletionEmail:", e.message);
    return false;
  }
}

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

    const resetLink = `${getAbsoluteSiteUrl()}/reset-password?token=${token}&email=${encodeURIComponent(to)}`;

    // Plain sender name, bilingual subject, a text part and a light layout: all-HTML mail
    // with a dark full-bleed design and a "Security" sender looks like phishing to spam filters.
    const mailOptions = {
      from: `"${BRAND_EN} | همّت" <${process.env.SMTP_USER}>`,
      to,
      subject: "إعادة تعيين كلمة المرور | Reset your Himmat password",
      text: [
        "همّت | Himmat",
        "",
        "طلبتَ إعادة تعيين كلمة المرور. افتح الرابط التالي لاختيار كلمة مرور جديدة (صالح لمدة ساعة):",
        resetLink,
        "إن لم تطلب ذلك فتجاهل هذه الرسالة.",
        "",
        "You asked to reset your password. Open this link to choose a new one (valid for one hour):",
        resetLink,
        "If you didn't ask for this, ignore this email.",
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #1f2937; line-height: 1.6;">
          <p style="font-size: 20px; font-weight: bold; color: #0e1a2b; margin: 0 0 16px;">همّت <span style="color: #b45309;">Himmat</span></p>
          <div dir="rtl" style="text-align: right;">
            <p>طلبتَ إعادة تعيين كلمة المرور. اضغط الزر لاختيار كلمة مرور جديدة. الرابط صالح لمدة ساعة.</p>
          </div>
          <p>You asked to reset your password. Use the button to choose a new one. The link is valid for one hour.</p>
          <p style="margin: 24px 0;">
            <a href="${resetLink}" style="background: #f59e0b; color: #111827; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none;">إعادة التعيين | Reset password</a>
          </p>
          <p style="font-size: 13px; color: #6b7280;">إن لم يعمل الزر فانسخ هذا الرابط | If the button doesn't work, copy this link:<br><a href="${resetLink}" style="color: #b45309; word-break: break-all;">${resetLink}</a></p>
          <p style="font-size: 13px; color: #6b7280;">إن لم تطلب ذلك فتجاهل هذه الرسالة. | If you didn't ask for this, ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;

  } catch (error) {
    console.error("Failed to send email:", error.message);
    return false; // Return false so the calling action knows it failed
  }
}

// -------------------------------------------------------------------
// 💬 SMS SENDER (Twilio)
// -------------------------------------------------------------------
export async function sendContactAdminNotification({ name, email, phone, subject, message }) {
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
    const adminTo = process.env.CONTACT_NOTIFY_EMAIL || process.env.SMTP_USER;
    if (!process.env.SMTP_USER || !adminTo) return false;
    await transporter.sendMail({
      from: `"${BRAND_EN}" <${process.env.SMTP_USER}>`,
      to: adminTo,
      subject: `[Contact] ${subject}`,
      text: `From: ${name} <${email}>\nPhone: ${phone || "—"}\n\n${message}`,
    });
    return true;
  } catch (e) {
    console.error("sendContactAdminNotification:", e.message);
    return false;
  }
}

export async function sendContactAutoReply(to, lang = "en") {
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
    if (!process.env.SMTP_USER) return false;
    const subj = lang === "ar" ? "تم استلام رسالتك" : "We received your message";
    const body =
      lang === "ar"
        ? "<p>شكراً لتواصلك معنا. سنرد عليك قريباً.</p>"
        : "<p>Thank you for contacting us. We will get back to you shortly.</p>";
    await transporter.sendMail({
      from: `"${BRAND_EN}" <${process.env.SMTP_USER}>`,
      to,
      subject: subj,
      html: body,
    });
    return true;
  } catch (e) {
    console.error("sendContactAutoReply:", e.message);
    return false;
  }
}

export async function sendContactReplyEmail(to, subject, htmlBody) {
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
    if (!process.env.SMTP_USER) return false;
    await transporter.sendMail({
      from: `"${BRAND_EN}" <${process.env.SMTP_USER}>`,
      to,
      subject: `Re: ${subject}`,
      html: htmlBody,
    });
    return true;
  } catch (e) {
    console.error("sendContactReplyEmail:", e.message);
    return false;
  }
}

/** `email` is the account's email: reset links identify the account by it, not by phone. */
export async function sendResetSMS(to, token, email) {
  try {
    const resetLink = `${getAbsoluteSiteUrl()}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    if (isMockSmsProvider()) {
      logMockSms("RESET_PASSWORD", { to, resetLink });
      return true;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.warn("[SMS] Twilio credentials missing. SMS not sent.");
      return false;
    }

    const client = twilio(accountSid, authToken);

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

