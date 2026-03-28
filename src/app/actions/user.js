"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";

export async function updateUserProfile(data) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const { firstName, lastName, phone, avatar, currentPassword, newPassword } = data;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
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

      const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordCorrect) {
        return { success: false, error: "Incorrect current password" };
      }

      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(newPassword, salt);
    }

    await db.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update profile:", error);
    return { success: false, error: "An error occurred while updating your profile" };
  }
}

export async function getUserProfile() {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
      }
    });

    return user;
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return null;
  }
}
