import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";

export const runtime = "nodejs";

const POLL_MS = 5000;
const HEARTBEAT_MS = 30000;
const AUTH_RECHECK_MS = 60000;

function toSse(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const isAdmin = ["ADMIN", "MANAGER"].includes(session.user.role);
  const encoder = new TextEncoder();
  const { searchParams } = new URL(req.url);
  const lastSeenParam = searchParams.get("lastSeen");
  const typeParam = searchParams.get("type") || "all";
  const customerOnly = searchParams.get("customerOnly") === "1";

  const typeFilter = !isAdmin
    ? { type: "ORDER_STATUS" }
    : customerOnly
    ? { type: "ORDER_STATUS" }
    : typeParam && typeParam !== "all"
    ? { type: typeParam }
    : {};

  const stream = new ReadableStream({
    start(controller) {
      let alive = true;
      // Default to NOW so a fresh connection only streams new events,
      // not the entire historical backlog (which double-counted unread).
      let lastTime = lastSeenParam ? new Date(lastSeenParam) : new Date();
      if (Number.isNaN(lastTime.getTime())) lastTime = new Date();
      let lastAuthCheck = Date.now();

      const safePush = (event, payload) => {
        if (!alive) return;
        try {
          controller.enqueue(encoder.encode(toSse(event, payload)));
        } catch {
          alive = false;
        }
      };

      const stop = () => {
        if (!alive) return;
        alive = false;
        clearInterval(interval);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {}
      };

      const interval = setInterval(async () => {
        if (!alive) return;
        try {
          if (Date.now() - lastAuthCheck > AUTH_RECHECK_MS) {
            const fresh = await auth();
            lastAuthCheck = Date.now();
            if (!fresh?.user?.id || fresh.user.id !== userId) {
              safePush("error", { message: "session_expired" });
              stop();
              return;
            }
          }

          const where = { userId, createdAt: { gt: lastTime }, ...typeFilter };
          const [rows, unread] = await Promise.all([
            db.notification.findMany({
              where,
              orderBy: { createdAt: "asc" },
              take: 20,
            }),
            db.notification.count({
              where: { userId, read: false, ...typeFilter },
            }),
          ]);

          if (rows.length) {
            lastTime = new Date(rows[rows.length - 1].createdAt);
            safePush("notifications", { rows, unread });
          } else {
            safePush("unread", { unread });
          }
        } catch {
          safePush("error", { message: "poll_failed" });
        }
      }, POLL_MS);

      const heartbeat = setInterval(() => {
        safePush("heartbeat", { time: Date.now() });
      }, HEARTBEAT_MS);

      safePush("connected", { ok: true, time: Date.now() });

      req.signal.addEventListener("abort", stop);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
