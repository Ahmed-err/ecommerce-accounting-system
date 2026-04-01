"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/context/LanguageContext";

export default function NotificationsPageClient() {
  const { lang, isRTL } = useLanguage();
  const [rows, setRows] = useState([]);
  const [type, setType] = useState("all");
  const [read, setRead] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    const qp = new URLSearchParams({
      limit: "100",
      type,
      read,
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
    const res = await fetch(`/api/notifications?${qp.toString()}`, { cache: "no-store" });
    const json = await res.json();
    if (json?.ok) setRows(json.rows || []);
  }, [type, read, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const markAll = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" });
    await load();
  };

  const cleanup = async () => {
    await fetch("/api/notifications", { method: "DELETE" });
    await load();
  };

  return (
    <div className={`space-y-6 ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{lang === "ar" ? "الإشعارات" : "Notifications"}</h1>
        <p className="mt-1 text-sm text-gray-400 sm:text-base">{lang === "ar" ? "متابعة إشعارات النظام والطلبات." : "Track system and order notifications."}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-gray-900/70 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-10 w-full min-w-[10rem] bg-gray-900 border-white/10 text-white sm:w-[11rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="NEW_ORDER">NEW_ORDER</SelectItem>
                <SelectItem value="LOW_STOCK">LOW_STOCK</SelectItem>
                <SelectItem value="NEW_REVIEW">NEW_REVIEW</SelectItem>
                <SelectItem value="NEW_MESSAGE">NEW_MESSAGE</SelectItem>
                <SelectItem value="ORDER_STATUS">ORDER_STATUS</SelectItem>
                <SelectItem value="NEW_USER">NEW_USER</SelectItem>
              </SelectContent>
            </Select>
            <Select value={read} onValueChange={setRead}>
              <SelectTrigger className="h-10 w-full min-w-[9rem] bg-gray-900 border-white/10 text-white sm:w-[10rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 w-full min-w-[10rem] rounded-md border border-white/10 bg-gray-900 px-3 py-2 text-white sm:w-auto"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 w-full min-w-[10rem] rounded-md border border-white/10 bg-gray-900 px-3 py-2 text-white sm:w-auto"
            />
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end">
            <Button
              onClick={markAll}
              className="h-10 w-full whitespace-nowrap bg-amber-500 text-black hover:bg-amber-600 sm:w-auto"
              type="button"
            >
              {lang === "ar" ? "تحديد الكل كمقروء" : "Mark all read"}
            </Button>
            <Button
              variant="outline"
              onClick={cleanup}
              className="h-10 w-full whitespace-nowrap border-white/10 text-white sm:w-auto"
              type="button"
            >
              {lang === "ar" ? "حذف الأقدم من 30 يوماً" : "Delete >30d"}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-gray-900 p-6 text-center text-sm text-gray-400 sm:p-8">
            {lang === "ar" ? "لا توجد إشعارات" : "No notifications"}
          </div>
        ) : rows.map((n) => (
          <div key={n.id} className={`rounded-xl border p-4 sm:p-5 ${n.read ? "border-white/10 bg-gray-900" : "border-amber-500/40 bg-amber-500/10"}`}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <p className="font-semibold text-sm text-white sm:text-base">{lang === "ar" ? n.titleAr : n.titleEn}</p>
              <span className="shrink-0 text-[11px] text-gray-400 sm:text-xs">{new Date(n.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-sm text-gray-300">{lang === "ar" ? n.bodyAr : n.bodyEn}</p>
            {n.link ? <p className="mt-1 break-all text-xs text-amber-400">{n.link}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
