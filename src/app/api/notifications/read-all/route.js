import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const isAdmin = ["ADMIN", "MANAGER"].includes(session.user.role);
    await db.notification.updateMany({
      where: {
        userId: session.user.id,
        ...(isAdmin ? {} : { type: "ORDER_STATUS" }),
      },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/notifications/read-all:", error);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
