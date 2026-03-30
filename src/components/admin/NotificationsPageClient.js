"use client";

import { useEffect, useState } from "react";
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

  const load = async () => {
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
  };

  useEffect(() => {
    load();
  }, [type, read, from, to]);

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
      <div>
        <h1 className="text-3xl font-bold text-white">{lang === "ar" ? "الإشعارات" : "Notifications"}</h1>
        <p className="text-gray-400 mt-1">{lang === "ar" ? "متابعة إشعارات النظام والطلبات." : "Track system and order notifications."}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="bg-gray-900 border-white/10 text-white"><SelectValue /></SelectTrigger>
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
          <SelectTrigger className="bg-gray-900 border-white/10 text-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-white/10 bg-gray-900 px-3 py-2 text-white" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-white/10 bg-gray-900 px-3 py-2 text-white" />
        <div className="flex gap-2">
          <Button onClick={markAll} className="bg-amber-500 text-black hover:bg-amber-600">
            {lang === "ar" ? "تحديد الكل كمقروء" : "Mark all read"}
          </Button>
          <Button variant="outline" onClick={cleanup} className="border-white/10 text-white">
            {lang === "ar" ? "حذف الأقدم من 30 يوماً" : "Delete >30d"}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((n) => (
          <div key={n.id} className={`rounded-xl border p-3 ${n.read ? "border-white/10 bg-gray-900" : "border-amber-500/40 bg-amber-500/10"}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-white">{lang === "ar" ? n.titleAr : n.titleEn}</p>
              <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-sm text-gray-300">{lang === "ar" ? n.bodyAr : n.bodyEn}</p>
            {n.link ? <p className="mt-1 text-xs text-amber-400">{n.link}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
