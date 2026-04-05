import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

function backupFilename(format) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return format === "sql" ? `db-backup-${stamp}.sql` : `db-backup-${stamp}.dump`;
}

async function pgDumpAvailable() {
  try {
    await execFileAsync("pg_dump", ["--version"], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function recordBackupSuccess(format) {
  try {
    const store = await db.store.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    if (!store) return;
    await db.store.update({
      where: { id: store.id },
      data: {
        backupLastAt: new Date(),
        backupLastStatus: `OK_${format.toUpperCase()}_DOWNLOAD`,
      },
    });
  } catch (e) {
    console.error("recordBackupSuccess:", e);
  }
}

export async function GET(req) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl || !String(databaseUrl).trim()) {
      return NextResponse.json(
        { ok: false, error: "missing_database_url", message: "DATABASE_URL is not configured." },
        { status: 500 }
      );
    }

    const ip = await getClientIP();
    const rateKey = `admin-backup:${session.user.id}:${ip}`;
    const allowed = await checkRateLimit(rateKey, 5, 60 * 60 * 1000, { failClosed: false });
    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "rate_limit", message: "Too many backup downloads. Try again in an hour." },
        { status: 429 }
      );
    }

    const hasPgDump = await pgDumpAvailable();
    if (!hasPgDump) {
      return NextResponse.json(
        {
          ok: false,
          error: "pg_dump_not_found",
          message:
            "The pg_dump program is not available on this server (common on serverless hosts). Run pg_dump on a machine with PostgreSQL client tools installed, or use your database provider’s backup export.",
        },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") === "sql" ? "sql" : "custom";
    const filename = backupFilename(format);

    const args = [
      "--no-owner",
      "--no-acl",
      "-F",
      format === "sql" ? "p" : "c",
      "-d",
      databaseUrl.trim(),
    ];

    const stream = new ReadableStream({
      start(controller) {
        const proc = spawn("pg_dump", args, {
          env: { ...process.env },
          shell: false,
        });
        const stderrChunks = [];

        proc.stderr.on("data", (chunk) => {
          stderrChunks.push(chunk);
        });

        proc.stdout.on("data", (chunk) => {
          try {
            controller.enqueue(new Uint8Array(chunk));
          } catch {
            proc.kill("SIGKILL");
          }
        });

        proc.stdout.on("error", (err) => {
          try {
            controller.error(err);
          } catch {
            /* ignore */
          }
        });

        proc.on("error", (err) => {
          try {
            controller.error(err);
          } catch {
            /* ignore */
          }
        });

        proc.on("close", (code) => {
          if (code === 0) {
            void recordBackupSuccess(format);
            void logAction("DATABASE_BACKUP_DOWNLOAD", { format, filename });
            try {
              controller.close();
            } catch {
              /* ignore */
            }
          } else {
            const errText = Buffer.concat(stderrChunks).toString("utf8").trim().slice(0, 800);
            try {
              controller.error(new Error(errText || `pg_dump exited with code ${code}`));
            } catch {
              /* ignore */
            }
          }
        });
      },
    });

    const contentType =
      format === "sql" ? "text/plain; charset=utf-8" : "application/octet-stream";

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    console.error("GET /api/admin/backup/database:", error);
    return NextResponse.json(
      { ok: false, error: "server", message: error instanceof Error ? error.message : "Backup failed" },
      { status: 500 }
    );
  }
}
