"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";

function timeAgo(value, lang) {
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (diff < 60) return lang === "ar" ? "الآن" : "now";
  if (diff < 3600) return lang === "ar" ? `منذ ${Math.floor(diff / 60)} د` : `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return lang === "ar" ? `منذ ${Math.floor(diff / 3600)} س` : `${Math.floor(diff / 3600)}h`;
  return lang === "ar" ? `منذ ${Math.floor(diff / 86400)} ي` : `${Math.floor(diff / 86400)}d`;
}

export default function NotificationBell({ customerOnly = false }) {
  const { lang, isRTL } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [unread, setUnread] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const lastSeenRef = useRef(null);
  const timerRef = useRef(null);
  const sourceRef = useRef(null);

  const typeQuery = customerOnly ? "&type=ORDER_STATUS" : "";

  const fetchList = async () => {
    try {
      const res = await fetch(`/api/notifications?limit=20${typeQuery}`, { cache: "no-store" });
      const json = await res.json();
      if (!json?.ok) return;
      setRows(json.rows || []);
      setUnread(json.unread || 0);
      if (json.rows?.[0]?.createdAt) {
        lastSeenRef.current = json.rows[0].createdAt;
      }
    } catch {}
  };

  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    let canceled = false;

    const startSse = () => {
      if (canceled) return;
      const lastSeen = lastSeenRef.current ? `?lastSeen=${encodeURIComponent(lastSeenRef.current)}` : "";
      const es = new EventSource(`/api/notifications/stream${lastSeen}`);
      sourceRef.current = es;

      es.addEventListener("notifications", (event) => {
        try {
          const payload = JSON.parse(event.data || "{}");
          const incoming = Array.isArray(payload.rows) ? payload.rows : [];
          if (!incoming.length) return;
          setRows((prev) => {
            const map = new Map(prev.map((r) => [r.id, r]));
            for (const n of incoming) map.set(n.id, n);
            return Array.from(map.values())
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 20);
          });
          setUnread((v) => v + incoming.filter((n) => !n.read).length);
          lastSeenRef.current = incoming[incoming.length - 1]?.createdAt || lastSeenRef.current;
          setFailCount(0);
        } catch {}
      });

      es.onerror = () => {
        es.close();
        const next = Math.min(5000 * Math.max(failCount + 1, 1), 30000);
        setFailCount((v) => v + 1);
        timerRef.current = setTimeout(startSse, next);
      };
    };

    startSse();
    return () => {
      canceled = true;
      if (sourceRef.current) sourceRef.current.close();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [failCount]);

  useEffect(() => {
    const poll = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      fetchList();
    }, 30000);
    return () => clearInterval(poll);
  }, []);

  const markOne = async (id, link) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => {});
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, read: true } : r)));
    setUnread((v) => Math.max(0, v - 1));
    setOpen(false);
    if (link) router.push(link);
  };

  const markAll = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
    setRows((prev) => prev.map((r) => ({ ...r, read: true })));
    setUnread(0);
  };

  const title = useMemo(() => (lang === "ar" ? "الإشعارات" : "Notifications"), [lang]);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-white relative"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className={`absolute -top-1 ${isRTL ? "-left-1" : "-right-1"} h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center`}>
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div className={`absolute z-[130] mt-2 w-80 rounded-2xl border border-white/10 bg-gray-900/95 p-3 shadow-2xl ${isRTL ? "left-0" : "right-0"}`}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-white">{title}</p>
            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-gray-300" onClick={markAll}>
              <CheckCheck className="h-4 w-4 me-1" />
              {lang === "ar" ? "تحديد الكل كمقروء" : "Mark all as read"}
            </Button>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {rows.length ? rows.map((n) => (
              <button
                key={n.id}
                onClick={() => markOne(n.id, n.link)}
                className={`w-full rounded-xl border p-3 text-start transition ${n.read ? "border-white/5 bg-white/[0.02]" : "border-amber-500/30 bg-amber-500/10"}`}
              >
                <p className="text-sm font-semibold text-white">{lang === "ar" ? n.titleAr : n.titleEn}</p>
                <p className="mt-1 text-xs text-gray-300">{lang === "ar" ? n.bodyAr : n.bodyEn}</p>
                <p className="mt-1 text-[10px] text-gray-500">{timeAgo(n.createdAt, lang)}</p>
              </button>
            )) : (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-gray-400">
                {lang === "ar" ? "لا توجد إشعارات" : "No notifications"}
              </div>
            )}
          </div>
          <Link href="/admin/notifications" className="mt-2 block text-center text-xs text-amber-400 hover:text-amber-300">
            {lang === "ar" ? "عرض الكل" : "View all"}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
