"use server";

import { prisma as db } from "@/lib/prisma";

export async function createNotification(input) {
  try {
    const data = {
      userId: input.userId || null,
      type: input.type || "SYSTEM",
      titleAr: input.titleAr || "",
      titleEn: input.titleEn || "",
      bodyAr: input.bodyAr || "",
      bodyEn: input.bodyEn || "",
      link: input.link || null,
    };
    if (!data.titleAr || !data.titleEn || !data.bodyAr || !data.bodyEn) return null;
    return await db.notification.create({ data });
  } catch (error) {
    console.error("createNotification:", error);
    return null;
  }
}

export async function createAdminBroadcastNotification(input) {
  try {
    const admins = await db.user.findMany({
      where: { role: { in: ["ADMIN", "MANAGER"] } },
      select: { id: true },
    });
    if (!admins.length) return { count: 0 };
    await db.notification.createMany({
      data: admins.map((u) => ({
        userId: u.id,
        type: input.type || "SYSTEM",
        titleAr: input.titleAr || "",
        titleEn: input.titleEn || "",
        bodyAr: input.bodyAr || "",
        bodyEn: input.bodyEn || "",
        link: input.link || null,
      })),
      skipDuplicates: false,
    });
    return { count: admins.length };
  } catch (error) {
    console.error("createAdminBroadcastNotification:", error);
    return { count: 0 };
  }
}

export async function listNotificationsForUser({ userId, isAdmin = false, type, read, from, to, limit = 20 }) {
  const where = {
    userId,
    ...(type && type !== "all" ? { type } : {}),
    ...(read === "read" ? { read: true } : read === "unread" ? { read: false } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };
  if (!isAdmin) {
    where.type = "ORDER_STATUS";
  }
  return db.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(Number(limit) || 20, 1), 100),
  });
}

export async function countUnreadNotifications(userId, isAdmin = false) {
  const where = { userId, read: false };
  if (!isAdmin) where.type = "ORDER_STATUS";
  return db.notification.count({ where });
}
