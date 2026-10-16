import { Pool } from "pg";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { writeBackup } from "@/lib/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const encoder = new TextEncoder();
const globalForBackupPool = globalThis;
const backupPool =
  globalForBackupPool.backupPoolV1 ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.BACKUP_POOL_MAX || 2),
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 15000),
  });

if (process.env.NODE_ENV !== "production") {
  globalForBackupPool.backupPoolV1 = backupPool;
}

function backupFilename(format) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return format === "sql" ? `db-backup-${stamp}.sql` : `db-backup-${stamp}.json`;
}

function parseBackupFormat(req) {
  const { searchParams } = new URL(req.url);
  const requested = (searchParams.get("format") || "").toLowerCase();
  if (requested === "sql") return "sql";
  return "json";
}

async function writeChunk(writer, text) {
  await writer.write(encoder.encode(text));
}

async function streamBackup({ format, writer }) {
  const client = await backupPool.connect();
  try {
    await writeBackup(client, format, (text) => writeChunk(writer, text));
  } finally {
    client.release();
  }
}

function contentTypeFor(format) {
  return format === "sql"
    ? "application/sql; charset=utf-8"
    : "application/json; charset=utf-8";
}

async function recordBackupSuccess(format) {
  try {
    const store = await db.store.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!store) return;
    await db.store.update({
      where: { id: store.id },
      data: {
        backupLastAt: new Date(),
        backupLastStatus: `OK_${String(format).toUpperCase()}_DOWNLOAD`,
      },
    });
  } catch (error) {
    console.error("recordBackupSuccess /api/backup:", error);
  }
}

export async function GET(req) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    if (!process.env.DATABASE_URL || !String(process.env.DATABASE_URL).trim()) {
      return NextResponse.json(
        { ok: false, error: "missing_database_url", message: "DATABASE_URL is not configured." },
        { status: 500 }
      );
    }

    // A full copy of the database: a few per hour at most, and each one recorded.
    const ip = await getClientIP();
    const allowed = await checkRateLimit(`admin-backup:${session.user.id}:${ip}`, 5, 60 * 60 * 1000, { failClosed: false });
    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "rate_limit", message: "Too many backup downloads. Try again in an hour." },
        { status: 429 }
      );
    }

    const format = parseBackupFormat(req);
    const filename = backupFilename(format);
    void logAction("DATABASE_BACKUP_DOWNLOAD", { format, filename });
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    (async () => {
      try {
        await streamBackup({ format, writer });
        await recordBackupSuccess(format);
        await writer.close();
      } catch (error) {
        console.error("GET /api/backup streaming failed:", error);
        await writer.abort(error);
      }
    })();

    return new Response(readable, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(format),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    console.error("GET /api/backup:", error);
    return NextResponse.json(
      { ok: false, error: "server", message: error instanceof Error ? error.message : "Backup failed" },
      { status: 500 }
    );
  }
}
