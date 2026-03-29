"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { sendEmailVerification, sendAccountDeletionEmail } from "@/lib/senders";

const profileSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().max(30).optional().nullable(),
  gender: z.union([z.literal("male"), z.literal("female"), z.literal("other"), z.literal("")]).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  avatar: z.string().url().optional().nullable(),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
});

const prefsSchema = z.object({
  prefLanguage: z.enum(["ar", "en"]),
  prefTheme: z.enum(["light", "dark", "system"]),
  prefCurrency: z.string().max(8).optional().nullable(),
  newsletterSubscribed: z.boolean(),
});

const notifySchema = z.object({
  marketingUnsubscribed: z.boolean().optional(),
  notifyOrderStatusEmail: z.boolean().optional(),
  notifyPromoEmail: z.boolean().optional(),
  notifyNewArrivalsEmail: z.boolean().optional(),
  notifyWhatsapp: z.boolean().optional(),
});

const deleteAccountSchema = z
  .object({
    confirmPhrase: z.string(),
    password: z.string().optional(),
  })
  .refine((d) => d.confirmPhrase.trim() === "DELETE", { message: "Type DELETE to confirm" });

async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

export async function updateUserProfile(data) {
  try {
    const userId = (await getSessionUser())?.id;
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const { firstName, lastName, phone, avatar, currentPassword, newPassword } = data;

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (firstName || lastName) {
      updateData.name = `${firstName || user.firstName} ${lastName || user.lastName}`;
    }
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;

    if (newPassword) {
      if (!currentPassword) {
        return { success: false, error: "Current password is required to set a new password" };
      }

      const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password || "");
      if (!isPasswordCorrect) {
        return { success: false, error: "Incorrect current password" };
      }

      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(newPassword, salt);
    }

    await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    revalidatePath("/settings");
    revalidatePath("/account/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update profile:", error);
    return { success: false, error: "An error occurred while updating your profile" };
  }
}

export async function updateAccountProfile(data) {
  try {
    const userId = (await getSessionUser())?.id;
    if (!userId) return { success: false, error: "Not authenticated" };

    const parsed = profileSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

    const p = parsed.data;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: "User not found" };

    let dob = null;
    if (p.dateOfBirth && p.dateOfBirth.trim()) {
      const d = new Date(p.dateOfBirth);
      if (!Number.isNaN(d.getTime())) dob = d;
    }

    try {
      await db.user.update({
        where: { id: userId },
        data: {
          firstName: p.firstName,
          lastName: p.lastName,
          name: `${p.firstName} ${p.lastName}`,
          phone: p.phone?.trim() ? p.phone.replace(/\s/g, "") : null,
          gender: p.gender === "" || !p.gender ? null : p.gender,
          dateOfBirth: dob,
          avatar: p.avatar || null,
        },
      });
    } catch (e) {
      if (e?.code === "P2002") {
        return { success: false, error: "phone_in_use", field: "phone" };
      }
      throw e;
    }

    revalidatePath("/account/settings");
    revalidatePath("/settings");
    return { success: true };
  } catch (e) {
    console.error("updateAccountProfile:", e);
    return { success: false, error: e.message || "Failed to save profile" };
  }
}

export async function changeAccountPassword(data) {
  try {
    const userId = (await getSessionUser())?.id;
    if (!userId) return { success: false, error: "Not authenticated" };

    const limited = await checkRateLimit(`pwd_change_${userId}`, 5, 60 * 60 * 1000, { failClosed: true });
    if (!limited) return { success: false, error: "Too many attempts. Try again later." };

    const parsed = passwordChangeSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message, field: "newPassword" };

    const p = parsed.data;
    if (p.newPassword !== p.confirmPassword) {
      return { success: false, error: "Passwords do not match", field: "confirmPassword" };
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user?.password) return { success: false, error: "Password sign-in is not enabled for this account." };

    const ok = await bcrypt.compare(p.currentPassword, user.password);
    if (!ok) return { success: false, error: "Incorrect current password", field: "currentPassword" };

    const salt = await bcrypt.genSalt(10);
    await db.user.update({
      where: { id: userId },
      data: { password: await bcrypt.hash(p.newPassword, salt), passwordChangedAt: new Date() },
    });

    revalidatePath("/account/settings");
    return { success: true };
  } catch (e) {
    console.error("changeAccountPassword:", e);
    return { success: false, error: e.message };
  }
}

export async function resendEmailVerification() {
  try {
    const userId = (await getSessionUser())?.id;
    if (!userId) return { success: false, error: "Not authenticated" };

    const limited = await checkRateLimit(`resend_verify_${userId}`, 3, 60 * 60 * 1000, { failClosed: true });
    if (!limited) return { success: false, error: "Too many requests. Try again later." };

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user?.email) return { success: false, error: "No email" };
    if (user.emailVerified) return { success: false, error: "Already verified" };

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.verificationToken.deleteMany({ where: { identifier: user.email } });
    await db.verificationToken.create({
      data: { identifier: user.email, token, expires },
    });

    const sent = await sendEmailVerification(user.email, token);
    if (!sent) return { success: false, error: "Could not send email. Check SMTP settings." };
    return { success: true };
  } catch (e) {
    console.error("resendEmailVerification:", e);
    return { success: false, error: e.message };
  }
}

export async function verifyEmailFromToken(email, token) {
  try {
    const userId = (await getSessionUser())?.id;
    if (!userId) return { success: false, error: "Not authenticated" };

    const row = await db.verificationToken.findFirst({
      where: { identifier: email, token, expires: { gt: new Date() } },
    });
    if (!row) return { success: false, error: "Invalid or expired link" };

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || user.email !== email) return { success: false, error: "Email mismatch" };

    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { emailVerified: new Date() } }),
      db.verificationToken.deleteMany({ where: { identifier: email, token } }),
    ]);

    revalidatePath("/account/settings");
    return { success: true };
  } catch (e) {
    console.error("verifyEmailFromToken:", e);
    return { success: false, error: e.message };
  }
}

export async function updateNotificationPreferences(raw) {
  try {
    const userId = (await getSessionUser())?.id;
    if (!userId) return { success: false, error: "Not authenticated" };

    const parsed = notifySchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

    const p = parsed.data;

    if (p.marketingUnsubscribed === true) {
      await db.user.update({
        where: { id: userId },
        data: {
          marketingUnsubscribed: true,
          notifyPromoEmail: false,
          notifyNewArrivalsEmail: false,
          notifyWhatsapp: false,
          newsletterSubscribed: false,
        },
      });
    } else {
      const data = {};
      if (p.marketingUnsubscribed === false) data.marketingUnsubscribed = false;
      if (p.notifyOrderStatusEmail !== undefined) data.notifyOrderStatusEmail = p.notifyOrderStatusEmail;
      if (p.notifyPromoEmail !== undefined) data.notifyPromoEmail = p.notifyPromoEmail;
      if (p.notifyNewArrivalsEmail !== undefined) data.notifyNewArrivalsEmail = p.notifyNewArrivalsEmail;
      if (p.notifyWhatsapp !== undefined) data.notifyWhatsapp = p.notifyWhatsapp;
      if (Object.keys(data).length) await db.user.update({ where: { id: userId }, data });
    }

    revalidatePath("/account/settings");
    return { success: true };
  } catch (e) {
    console.error("updateNotificationPreferences:", e);
    return { success: false, error: e.message };
  }
}

export async function updateAccountPreferences(raw) {
  try {
    const userId = (await getSessionUser())?.id;
    if (!userId) return { success: false, error: "Not authenticated" };

    const parsed = prefsSchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

    await db.user.update({
      where: { id: userId },
      data: {
        prefLanguage: parsed.data.prefLanguage,
        prefTheme: parsed.data.prefTheme,
        prefCurrency: parsed.data.prefCurrency?.trim() || null,
        newsletterSubscribed: parsed.data.newsletterSubscribed,
      },
    });

    revalidatePath("/account/settings");
    return { success: true };
  } catch (e) {
    console.error("updateAccountPreferences:", e);
    return { success: false, error: e.message };
  }
}

export async function revokeSessionToken(sessionToken) {
  try {
    const userId = (await getSessionUser())?.id;
    if (!userId) return { success: false, error: "Not authenticated" };

    const row = await db.session.findFirst({ where: { userId, sessionToken } });
    if (!row) return { success: false, error: "Session not found" };

    const c = await cookies();
    const cookieToken = c.get("authjs.session-token")?.value || c.get("__Secure-authjs.session-token")?.value;
    if (cookieToken === sessionToken) {
      return { success: false, error: "Use sign out to end this session" };
    }

    await db.session.delete({ where: { sessionToken } });
    revalidatePath("/account/settings");
    return { success: true };
  } catch (e) {
    console.error("revokeSessionToken:", e);
    return { success: false, error: e.message };
  }
}

export async function revokeAllOtherSessions() {
  try {
    const userId = (await getSessionUser())?.id;
    if (!userId) return { success: false, error: "Not authenticated" };

    const c = await cookies();
    const cookieToken = c.get("authjs.session-token")?.value || c.get("__Secure-authjs.session-token")?.value;

    if (cookieToken) {
      await db.session.deleteMany({
        where: { userId, NOT: { sessionToken: cookieToken } },
      });
    } else {
      await db.session.deleteMany({ where: { userId } });
    }

    revalidatePath("/account/settings");
    return { success: true };
  } catch (e) {
    console.error("revokeAllOtherSessions:", e);
    return { success: false, error: e.message };
  }
}

export async function deleteMyAccount(data) {
  try {
    const userId = (await getSessionUser())?.id;
    if (!userId) return { success: false, error: "Not authenticated" };

    const parsed = deleteAccountSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Type DELETE to confirm" };

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: "User not found" };

    const hasOAuth = await db.account.findFirst({
      where: { userId, provider: { in: ["google"] } },
    });

    if (user.password) {
      if (!parsed.data.password) return { success: false, error: "Password required" };
      const ok = await bcrypt.compare(parsed.data.password, user.password);
      if (!ok) return { success: false, error: "Incorrect password", field: "password" };
    } else if (!hasOAuth) {
      return { success: false, error: "Account cannot be closed automatically" };
    }

    const oldEmail = user.email;
    const anonId = `deleted_${userId.slice(-8)}`;

    await db.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: { userId, status: "PENDING" },
        data: { status: "CANCELLED" },
      });

      await tx.session.deleteMany({ where: { userId } });

      await tx.user.update({
        where: { id: userId },
        data: {
          accountDeletedAt: new Date(),
          isActive: false,
          email: `${anonId}@closed.local`,
          firstName: "Deleted",
          lastName: "User",
          name: "Deleted User",
          phone: null,
          avatar: null,
          password: null,
        },
      });
    });

    await sendAccountDeletionEmail(oldEmail);
    revalidatePath("/account/settings");
    return { success: true };
  } catch (e) {
    console.error("deleteMyAccount:", e);
    return { success: false, error: e.message };
  }
}

export async function getUserProfile() {
  try {
    const userId = (await getSessionUser())?.id;
    if (!userId) return null;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        emailVerified: true,
        gender: true,
        dateOfBirth: true,
        prefLanguage: true,
        prefTheme: true,
        prefCurrency: true,
        newsletterSubscribed: true,
        notifyOrderStatusEmail: true,
        notifyPromoEmail: true,
        notifyNewArrivalsEmail: true,
        notifyWhatsapp: true,
        marketingUnsubscribed: true,
      },
    });

    return user
      ? {
          ...user,
          dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
          emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
        }
      : null;
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return null;
  }
}
