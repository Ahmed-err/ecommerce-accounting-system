import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { emitAlert } from "@/lib/monitoring";

export async function GET(req) {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("health_db_timeout")), 3000)
      ),
    ]);
    return NextResponse.json({
      ok: true,
      requestId,
      timestamp: new Date().toISOString(),
      service: "store-with-erp",
    });
  } catch (error) {
    logger.error("health_check_failed", { requestId, error: error?.message });
    emitAlert("healthcheck_failed", { requestId, error: error?.message || "database_unavailable" }).catch(() => {});
    return NextResponse.json(
      {
        ok: false,
        requestId,
        error: "database_unavailable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
