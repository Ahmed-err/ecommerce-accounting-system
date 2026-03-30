import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";

export const runtime = "nodejs";

function toSse(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const isAdmin = ["ADMIN", "MANAGER"].includes(session.user.role);
  const encoder = new TextEncoder();
  const { searchParams } = new URL(req.url);
  const lastSeen = searchParams.get("lastSeen");

  const stream = new ReadableStream({
    start(controller) {
      let alive = true;
      let lastTime = lastSeen ? new Date(lastSeen) : new Date(0);

      const push = (event, payload) => {
        if (!alive) return;
        controller.enqueue(encoder.encode(toSse(event, payload)));
      };

      const interval = setInterval(async () => {
        try {
          if (!alive) return;
          const freshSession = await auth();
          if (!freshSession?.user?.id) {
            push("error", { message: "session_expired" });
            clearInterval(interval);
            clearInterval(heartbeat);
            controller.close();
            alive = false;
            return;
          }
          const rows = await db.notification.findMany({
            where: {
              userId: session.user.id,
              createdAt: { gt: lastTime },
              ...(isAdmin ? {} : { type: "ORDER_STATUS" }),
            },
            orderBy: { createdAt: "asc" },
            take: 20,
          });
          if (rows.length) {
            lastTime = new Date(rows[rows.length - 1].createdAt);
            push("notifications", { rows });
          }
        } catch (error) {
          push("error", { message: "poll_failed" });
        }
      }, 5000);

      const heartbeat = setInterval(() => {
        push("heartbeat", { time: Date.now() });
      }, 30000);

      push("connected", { ok: true, time: Date.now() });

      req.signal.addEventListener("abort", () => {
        alive = false;
        clearInterval(interval);
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
