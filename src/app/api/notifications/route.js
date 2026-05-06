import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";
import { countUnreadNotifications, listNotificationsForUser } from "@/lib/notifications";

export async function GET(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const isAdmin = ["ADMIN", "MANAGER"].includes(session.user.role);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all";
    const read = searchParams.get("read") || "all";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = Number(searchParams.get("limit") || 20);
    const [rows, unread] = await Promise.all([
      listNotificationsForUser({ userId: session.user.id, isAdmin, type, read, from, to, limit }),
      countUnreadNotifications(session.user.id, isAdmin, type),
    ]);
    return NextResponse.json({ ok: true, rows, unread });
  } catch (error) {
    console.error("GET /api/notifications:", error);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await auth();
    if (!session?.user?.id || !["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await db.notification.deleteMany({
      where: { createdAt: { lt: cutoff }, userId: session.user.id },
    });
    return NextResponse.json({ ok: true, count: result.count });
  } catch (error) {
    console.error("DELETE /api/notifications:", error);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
