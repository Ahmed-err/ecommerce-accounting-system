import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";

export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const isAdmin = ["ADMIN", "MANAGER"].includes(session.user.role);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const customerOnly = searchParams.get("customerOnly") === "1";

    const where = { userId: session.user.id, read: false };
    if (!isAdmin || customerOnly) {
      where.type = "ORDER_STATUS";
    } else if (type && type !== "all") {
      where.type = type;
    }

    await db.notification.updateMany({ where, data: { read: true } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/notifications/read-all:", error);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
