import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { emitAlert } from "@/lib/monitoring";

// Liveness by default: answers without touching the database, so uptime monitors and bots
// polling this route do not wake the Neon compute (each wake costs at least 5 minutes of
// compute time). Pass `?db=1` for a deep check that runs `SELECT 1` against the database.
export async function GET(req) {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const deep = new URL(req.url).searchParams.get("db") === "1";

  if (!deep) {
    return NextResponse.json({
      ok: true,
      requestId,
      timestamp: new Date().toISOString(),
      service: "store-with-erp",
      db: "not_checked",
    });
  }

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
      db: "ok",
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
