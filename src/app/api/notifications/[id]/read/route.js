import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";

export async function POST(_req, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const isAdmin = ["ADMIN", "MANAGER"].includes(session.user.role);
    const row = await db.notification.findFirst({
      where: {
        id,
        userId: session.user.id,
        ...(isAdmin ? {} : { type: "ORDER_STATUS" }),
      },
      select: { id: true },
    });
    if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    await db.notification.update({ where: { id }, data: { read: true } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/notifications/[id]/read:", error);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
