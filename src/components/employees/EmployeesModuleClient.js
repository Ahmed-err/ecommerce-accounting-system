"use client";

import { useState, useEffect, useCallback, useTransition, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Calendar, DollarSign, Clock, BarChart3, Shield, LayoutDashboard,
  Plus, Search, Edit, Trash2, Check, X, ChevronLeft, ChevronRight,
  Download, Printer, AlertTriangle, CheckCircle, XCircle, Eye, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { formatAuditActivityForDashboard } from "@/lib/audit-display";
import { getEmployeeHrData, createAttendance, updateAttendance, deleteAttendance,
  createSalaryRecord, markSalaryPaid, createLeaveRequest, reviewLeaveRequest,
  bulkMarkAttendance, getAllStaff, deleteEmployee, quickFillAttendanceForDate } from "@/app/actions/employees";

const TABS = ["overview", "employees", "attendance", "salaries", "leaves", "roles", "reports"];

const ATTENDANCE_COLORS = { PRESENT: "#10b981", ABSENT: "#ef4444", LATE: "#f59e0b" };
const DEPT_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#f97316", "#06b6d4"];

const MONTHS = [
  ["January","February","March","April","May","June","July","August","September","October","November","December"],
  ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],
];

function fmt(n, lang) {
  if (n == null) return "—";
  return Number(n).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", { maximumFractionDigits: 2 });
}

function fmtDate(d, lang) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function fmtTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function timeInputFromDate(d) {
  if (!d) return "";
  const x = new Date(d);
  const h = String(x.getHours()).padStart(2, "0");
  const m = String(x.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function attendanceSaveError(res, t) {
  if (!res?.error) return "Error";
  const key = {
    ONE_CLOCK: "empAttendanceErrOneClock",
    BAD_TIME: "empAttendanceErrBadTime",
    CHECKOUT_ORDER: "empAttendanceErrCheckoutOrder",
    LEAVE_ABSENT: "empAttendanceErrLeaveAbsent",
    LEAVE_PRESENT: "empAttendanceErrLeavePresent",
    INVALID_DATE: "empAttendanceErrInvalidDate",
    INVALID_EMPLOYEE: "empAttendanceErrInvalidEmployee",
  }[res.errorCode];
  return key ? t[key] : res.error;
}

function diffHours(cin, cout) {
  if (!cin || !cout) return "—";
  const diff = (new Date(cout) - new Date(cin)) / 3600000;
  return diff > 0 ? diff.toFixed(1) + "h" : "—";
}

function Badge({ color, children }) {
  const map = {
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    gray: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${map[color] || map.gray}`}>
      {children}
    </span>
  );
}

function KpiCard({ label, value, icon: Icon, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="bg-gray-900 border border-white/5 rounded-xl p-5 flex items-center gap-4"
    >
      <div className={`p-3 rounded-xl ${color} shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5 tabular-nums">{value}</p>
      </div>
    </motion.div>
  );
}

function Empty({ t, action }) {
  return (
    <div className="py-16 text-center text-gray-500">
      <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
      <p className="text-sm">{t.empNoData}</p>
      {action}
    </div>
  );
}

function Dialog({ open, onClose, title, children, isRTL }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className={`relative bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function MonthYearPicker({ month, year, onMonth, onYear, lang, isRTL }) {
  const months = lang === "ar" ? MONTHS[1] : MONTHS[0];
  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
  return (
    <div className="flex gap-2">
      <Select value={String(month)} onValueChange={(v) => onMonth(Number(v))}>
        <SelectTrigger className="bg-gray-800 border-white/10 text-white w-36" dir={isRTL ? "rtl" : "ltr"}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}>
          {months.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={String(year)} onValueChange={(v) => onYear(Number(v))}>
        <SelectTrigger className="bg-gray-800 border-white/10 text-white w-28" dir={isRTL ? "rtl" : "ltr"}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}>
          {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function OverviewTab({ data, t, lang, isRTL, staff, onAddExpense }) {
  if (!data) return null;
  const { kpis = {}, attendance30d = [], deptBreakdown = [], roleBreakdown = [], activity = [], upcomingLeaves = [] } = data;

  const kpiCards = [
    { label: t.empKpiTotal, value: kpis.total || 0, icon: Users, color: "bg-blue-500/10 text-blue-400" },
    { label: t.empKpiActive, value: kpis.active || 0, icon: CheckCircle, color: "bg-emerald-500/10 text-emerald-400" },
    { label: t.empKpiOnLeave, value: kpis.onLeaveToday || 0, icon: Clock, color: "bg-amber-500/10 text-amber-400" },
    { label: t.empKpiMissingSheet, value: kpis.missingAttendanceToday ?? 0, icon: XCircle, color: "bg-red-500/10 text-red-400" },
  ];

  const chartData = attendance30d.map((d) => ({ ...d, date: d.date.slice(5) }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((k, i) => <KpiCard key={k.label} {...k} delay={i * 0.08} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-900 border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">{t.empChartAttendance}</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #ffffff10", borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="present" name={t.empStatusPresent} fill="#10b981" radius={[3,3,0,0]} />
                <Bar dataKey="absent" name={t.empStatusAbsent} fill="#ef4444" radius={[3,3,0,0]} />
                <Bar dataKey="late" name={t.empStatusLate} fill="#f59e0b" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty t={t} />}
        </div>

        <div className="bg-gray-900 border border-white/5 rounded-xl p-4 sm:p-5 lg:p-6">
          <h3 className="mb-3 text-sm font-semibold text-white sm:mb-4">{t.empChartDepts}</h3>
          {deptBreakdown.length > 0 ? (
            <div className="rounded-lg bg-white/[0.02] p-2 sm:p-3">
              <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={deptBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" nameKey="name">
                  {deptBreakdown.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #ffffff10", borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty t={t} />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">{t.empUpcomingLeaves}</h3>
          {(kpis.upcomingLeaves || []).length > 0 ? (
            <div className="space-y-2">
              {(kpis.upcomingLeaves || []).map((l) => (
                <div key={l.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                    {l.user?.firstName?.[0]}{l.user?.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{l.user?.firstName} {l.user?.lastName}</p>
                    <p className="text-[10px] text-gray-400">{fmtDate(l.fromDate, lang)} → {fmtDate(l.toDate, lang)}</p>
                  </div>
                  <Badge color="amber">{l.days}d</Badge>
                </div>
              ))}
            </div>
          ) : <Empty t={t} />}
        </div>

        <div className="bg-gray-900 border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">{t.empRecentActivity}</h3>
          {activity.length > 0 ? (
            <div className="space-y-2">
              {activity.map((log) => {
                const fmt = formatAuditActivityForDashboard(log.action, log.details, lang);
                return (
                  <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg bg-white/5">
                    <div className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-200">{fmt.title}</p>
                      {fmt.subtitle ? (
                        <p className="text-[10px] text-gray-400 mt-0.5 break-words">{fmt.subtitle}</p>
                      ) : null}
                      <p className="text-[10px] text-gray-500 mt-0.5">{fmtDate(log.createdAt, lang)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <Empty t={t} />}
        </div>
      </div>
    </div>
  );
}

function AttendanceTab({ data, t, lang, isRTL, staff }) {
  const now = new Date();
  const pad2 = (n) => String(n).padStart(2, "0");
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [tabData, setTabData] = useState(data);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRec, setEditRec] = useState(null);
  const [form, setForm] = useState({ userId: "", date: todayStr, checkIn: "", checkOut: "", status: "PRESENT", notes: "" });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [quickDate, setQuickDate] = useState(todayStr);
  const [quickCheckIn, setQuickCheckIn] = useState("09:00");
  const [quickCheckOut, setQuickCheckOut] = useState("17:00");
  const [quickOnlyMissing, setQuickOnlyMissing] = useState(true);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickMsg, setQuickMsg] = useState(null);

  const load = useCallback(async (m, y) => {
    setLoading(true);
    const res = await getEmployeeHrData({ tab: "attendance", month: m, year: y });
    if (res.ok) setTabData(res);
    setLoading(false);
  }, []);

  const rows = tabData?.rows || [];
  const summaryByEmployee = tabData?.summaryByEmployee || [];
  const alert3 = tabData?.alert3Absent || [];

  const openAdd = () => { setEditRec(null); setForm({ userId: "", date: todayStr, checkIn: "", checkOut: "", status: "PRESENT", notes: "" }); setErr(""); setDialogOpen(true); };
  const openEdit = (r) => {
    setEditRec(r);
    setForm({
      userId: r.userId,
      date: r.date.split("T")[0],
      checkIn: timeInputFromDate(r.checkIn),
      checkOut: timeInputFromDate(r.checkOut),
      status: r.status,
      notes: r.notes || "",
    });
    setErr("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true); setErr("");
    const res = editRec ? await updateAttendance(editRec.id, form) : await createAttendance(form);
    if (res.success) {
      setDialogOpen(false);
      load(month, year);
    } else setErr(attendanceSaveError(res, t));
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm(lang === "ar" ? "حذف؟" : "Delete?")) return;
    await deleteAttendance(id);
    load(month, year);
  };

  const reloadMonthForDateStr = (dateStr) => {
    const y = Number(dateStr.slice(0, 4));
    const m = Number(dateStr.slice(5, 7));
    if (y && m >= 1 && m <= 12) {
      setMonth(m);
      setYear(y);
      load(m, y);
    } else {
      load(month, year);
    }
  };

  const runQuickFill = async (mode) => {
    if (!quickOnlyMissing && !confirm(t.empQuickOverwriteConfirm)) return;
    if (mode === "ABSENT" && !confirm(t.empQuickConfirmAbsent)) return;
    setQuickLoading(true);
    setQuickMsg(null);
    const res = await quickFillAttendanceForDate({
      date: quickDate,
      mode,
      checkIn: quickCheckIn,
      checkOut: quickCheckOut,
      onlyMissing: quickOnlyMissing,
    });
    setQuickLoading(false);
    if (!res.success) {
      setQuickMsg({ ok: false, text: res.error || (lang === "ar" ? "فشل الطلب" : "Request failed") });
      return;
    }
    const skipped =
      (res.skippedAlready || 0) +
      (res.skippedLeave || 0) +
      (res.skippedNoPrevious || 0) +
      (res.failed || 0);
    const parts = [];
    if (res.skippedAlready) parts.push(`${res.skippedAlready} ${t.empQuickSkipAlready}`);
    if (res.skippedLeave) parts.push(`${res.skippedLeave} ${t.empQuickSkipLeave}`);
    if (res.skippedNoPrevious) parts.push(`${res.skippedNoPrevious} ${t.empQuickSkipNoPrev}`);
    if (res.failed) parts.push(`${res.failed} ${t.empQuickFailed}`);
    const summary = t.empQuickResultSummary.replace("{created}", String(res.created)).replace("{skipped}", String(skipped));
    setQuickMsg({
      ok: true,
      text: summary,
      detail: parts.length ? parts.join(lang === "ar" ? "، " : ", ") : "",
    });
    reloadMonthForDateStr(quickDate);
  };

  const statusBadge = (s) => {
    const map = { PRESENT: "green", ABSENT: "red", LATE: "amber", HALF_DAY: "blue", HOLIDAY: "gray" };
    const labels = { PRESENT: t.empStatusPresent, ABSENT: t.empStatusAbsent, LATE: t.empStatusLate, HALF_DAY: t.empStatusHalfDay, HOLIDAY: t.empStatusHoliday };
    return <Badge color={map[s] || "gray"}>{labels[s] || s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthYearPicker month={month} year={year} onMonth={(m) => { setMonth(m); load(m, year); }} onYear={(y) => { setYear(y); load(month, y); }} lang={lang} isRTL={isRTL} />
        <Button onClick={openAdd} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
          <Plus className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} /> {t.empAddAttendance}
        </Button>
      </div>

      <div className="bg-gray-900/80 border border-amber-500/20 rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <ClipboardList className="h-5 w-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">{t.empQuickAttendanceTitle}</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{t.empQuickAttendanceDesc}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t.empColDate}</label>
            <Input
              type="date"
              value={quickDate}
              onChange={(e) => setQuickDate(e.target.value)}
              className="bg-gray-800 border-white/10 text-white w-[160px]"
              disabled={quickLoading}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t.empColCheckIn}</label>
            <Input
              type="time"
              value={quickCheckIn}
              onChange={(e) => setQuickCheckIn(e.target.value)}
              className="bg-gray-800 border-white/10 text-white w-[130px]"
              disabled={quickLoading}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t.empColCheckOut}</label>
            <Input
              type="time"
              value={quickCheckOut}
              onChange={(e) => setQuickCheckOut(e.target.value)}
              className="bg-gray-800 border-white/10 text-white w-[130px]"
              disabled={quickLoading}
            />
          </div>
          <label className={`flex items-center gap-2 text-xs text-gray-300 cursor-pointer ${isRTL ? "flex-row-reverse" : ""} pb-1`}>
            <input
              type="checkbox"
              className="rounded border-white/20 bg-gray-800 text-amber-500 focus:ring-amber-500/30"
              checked={quickOnlyMissing}
              onChange={(e) => setQuickOnlyMissing(e.target.checked)}
              disabled={quickLoading}
            />
            <span>{t.empQuickOnlyMissing}</span>
          </label>
        </div>
        <p className="text-[10px] text-gray-500">{t.empQuickDefaultTimes}</p>
        <div className={`flex flex-wrap gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          <Button
            type="button"
            onClick={() => runQuickFill("PRESENT_DEFAULT")}
            disabled={quickLoading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9"
          >
            {quickLoading ? t.empQuickWorking : t.empQuickFillPresent}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => runQuickFill("COPY_PREVIOUS")}
            disabled={quickLoading}
            className="border-white/15 text-gray-200 hover:bg-white/5 text-xs h-9"
          >
            {t.empQuickFillCopy}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => runQuickFill("ABSENT")}
            disabled={quickLoading}
            className="border-red-500/30 text-red-300 hover:bg-red-500/10 text-xs h-9"
          >
            {t.empQuickFillAbsent}
          </Button>
        </div>
        {quickMsg && (
          <div
            className={`text-xs rounded-lg px-3 py-2 ${quickMsg.ok ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-red-500/10 text-red-300 border border-red-500/20"}`}
          >
            <p>{quickMsg.text}</p>
            {quickMsg.detail ? <p className="mt-1 text-gray-400">{quickMsg.detail}</p> : null}
          </div>
        )}
      </div>

      {alert3.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-400">{t.empAlert3Absences}</p>
            <p className="text-xs text-red-300 mt-1">{alert3.map((e) => e.name).join(", ")}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-500 animate-pulse">{lang === "ar" ? "جاري التحميل..." : "Loading..."}</div>
      ) : (
        <>
          <div className="bg-gray-900 border border-white/5 rounded-xl overflow-hidden">
            <table className={`w-full min-w-[700px] text-sm ${isRTL ? "text-right" : "text-left"}`}>
              <thead className="bg-gray-800/40 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-4 py-3">{t.empColEmployee}</th>
                  <th className="px-4 py-3">{t.empColDate}</th>
                  <th className="px-4 py-3">{t.empColCheckIn}</th>
                  <th className="px-4 py-3">{t.empColCheckOut}</th>
                  <th className="px-4 py-3">{t.empColHours}</th>
                  <th className="px-4 py-3">{t.empColStatus}</th>
                  <th className="px-4 py-3">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.length === 0 && <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-500">{t.empNoData}</td></tr>}
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{r.user?.firstName} {r.user?.lastName}</td>
                    <td className="px-4 py-3 text-gray-400 tabular-nums">{fmtDate(r.date, lang)}</td>
                    <td className="px-4 py-3 text-gray-300 tabular-nums">{fmtTime(r.checkIn)}</td>
                    <td className="px-4 py-3 text-gray-300 tabular-nums">{fmtTime(r.checkOut)}</td>
                    <td className="px-4 py-3 text-gray-300 tabular-nums">{diffHours(r.checkIn, r.checkOut)}</td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)} className="h-7 w-7 text-gray-400 hover:text-white"><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="h-7 w-7 text-gray-400 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {summaryByEmployee.length > 0 && (
            <div className="bg-gray-900 border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">{t.empMonthlySummary}</h3>
              <div className="overflow-x-auto">
                <table className={`w-full text-xs ${isRTL ? "text-right" : "text-left"}`}>
                  <thead className="text-gray-400">
                    <tr>
                      <th className="pb-2 pr-4">{t.empColEmployee}</th>
                      <th className="pb-2 px-3 text-emerald-400">{t.empStatusPresent}</th>
                      <th className="pb-2 px-3 text-red-400">{t.empStatusAbsent}</th>
                      <th className="pb-2 px-3 text-amber-400">{t.empStatusLate}</th>
                      <th className="pb-2 px-3">{t.empStatusHalfDay}</th>
                      <th className="pb-2 px-3">{t.empStatusHoliday}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {summaryByEmployee.map((e) => (
                      <tr key={e.userId} className={e.absent >= 3 ? "bg-red-500/5" : ""}>
                        <td className="py-2 pr-4 font-medium text-white">{e.name}</td>
                        <td className="py-2 px-3 text-emerald-400 tabular-nums">{e.present}</td>
                        <td className="py-2 px-3 text-red-400 tabular-nums">{e.absent} {e.absent >= 3 && <AlertTriangle className="h-3 w-3 inline text-red-400" />}</td>
                        <td className="py-2 px-3 text-amber-400 tabular-nums">{e.late}</td>
                        <td className="py-2 px-3 text-gray-400 tabular-nums">{e.halfDay}</td>
                        <td className="py-2 px-3 text-gray-400 tabular-nums">{e.holiday}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editRec ? (lang === "ar" ? "تعديل الحضور" : "Edit Attendance") : t.empAddAttendance} isRTL={isRTL}>
        {err && <p className="mb-3 text-sm text-red-400 bg-red-500/10 rounded-lg p-3">{err}</p>}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t.empColEmployee}</label>
            <Select value={form.userId} onValueChange={(v) => setForm((p) => ({ ...p, userId: v }))} disabled={!!editRec}>
              <SelectTrigger className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}><SelectValue placeholder={t.empSelectEmployee} /></SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}>
                {(staff || []).map((s) => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t.empColDate}</label>
            <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="bg-gray-800 border-white/10 text-white" disabled={!!editRec} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t.empColCheckIn}</label>
              <Input type="time" value={form.checkIn} onChange={(e) => setForm((p) => ({ ...p, checkIn: e.target.value }))} className="bg-gray-800 border-white/10 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t.empColCheckOut}</label>
              <Input type="time" value={form.checkOut} onChange={(e) => setForm((p) => ({ ...p, checkOut: e.target.value }))} className="bg-gray-800 border-white/10 text-white" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t.empColStatus}</label>
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm((p) => ({
                  ...p,
                  status: v,
                  ...(v === "ABSENT" || v === "HOLIDAY" ? { checkIn: "", checkOut: "" } : {}),
                }))
              }
            >
              <SelectTrigger className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}>
                {["PRESENT","ABSENT","LATE","HALF_DAY","HOLIDAY"].map((s) => (
                  <SelectItem key={s} value={s}>{t[`empStatus${s.charAt(0)+s.slice(1).toLowerCase().replace(/_([a-z])/g, (_,c) => c.toUpperCase())}`] || s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t.empColNotes}</label>
            <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="bg-gray-800 border-white/10 text-white" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => setDialogOpen(false)} className="hover:bg-white/10">{t.cancel}</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">{saving ? t.saving : t.save}</Button>
        </div>
      </Dialog>
    </div>
  );
}

function SalariesTab({ data, t, lang, isRTL, staff }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [tabData, setTabData] = useState(data);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ userId: "", month: now.getMonth() + 1, year: now.getFullYear(), baseSalary: "", bonuses: "0", deductions: "0", notes: "" });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (m, y) => {
    setLoading(true);
    const res = await getEmployeeHrData({ tab: "salaries", month: m, year: y });
    if (res.ok) setTabData(res);
    setLoading(false);
  }, []);

  const records = tabData?.records || [];
  const totals = tabData?.totals || {};

  const handleSave = async () => {
    setSaving(true); setErr("");
    const res = await createSalaryRecord(form);
    if (res.success) { setDialogOpen(false); load(month, year); }
    else setErr(res.error || "Error");
    setSaving(false);
  };

  const handleMarkPaid = async (id) => {
    const res = await markSalaryPaid(id);
    if (res.success) load(month, year);
  };

  const openAdd = () => {
    setForm({ userId: "", month, year, baseSalary: "", bonuses: "0", deductions: "0", notes: "" });
    setErr(""); setDialogOpen(true);
  };

  const staffMap = Object.fromEntries((staff || []).map((s) => [s.id, s]));
  const onSelectEmp = (id) => {
    const emp = staffMap[id];
    setForm((p) => ({ ...p, userId: id, baseSalary: emp?.salary ? String(emp.salary) : p.baseSalary }));
  };

  const statusBadge = (s) => {
    const map = { PAID: "green", PENDING: "amber", PROCESSING: "blue" };
    const labels = { PAID: t.empSalaryPaid, PENDING: t.empSalaryPending, PROCESSING: t.empSalaryProcessing };
    return <Badge color={map[s] || "gray"}>{labels[s] || s}</Badge>;
  };

  const months = lang === "ar" ? MONTHS[1] : MONTHS[0];
  const net = (Number(form.baseSalary || 0) + Number(form.bonuses || 0) - Number(form.deductions || 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthYearPicker month={month} year={year} onMonth={(m) => { setMonth(m); load(m, year); }} onYear={(y) => { setYear(y); load(month, y); }} lang={lang} isRTL={isRTL} />
        <Button onClick={openAdd} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
          <Plus className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} /> {t.empAddSalary}
        </Button>
      </div>

      {totals.totalNet > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t.empColBase, value: fmt(totals.totalBase, lang), color: "text-blue-400" },
            { label: t.empColBonuses, value: fmt(totals.totalBonuses, lang), color: "text-emerald-400" },
            { label: t.empColDeductions, value: fmt(totals.totalDeductions, lang), color: "text-red-400" },
            { label: t.empColNet, value: fmt(totals.totalNet, lang), color: "text-amber-400" },
          ].map((item) => (
            <div key={item.label} className="bg-gray-900 border border-white/5 rounded-xl p-4">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className={`text-xl font-bold tabular-nums mt-1 ${item.color}`}>{item.value} {t.currency}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-500 animate-pulse">{lang === "ar" ? "جاري التحميل..." : "Loading..."}</div>
      ) : (
        <div className="bg-gray-900 border border-white/5 rounded-xl overflow-hidden">
          <table className={`w-full min-w-[700px] text-sm ${isRTL ? "text-right" : "text-left"}`}>
            <thead className="bg-gray-800/40 text-xs uppercase text-gray-400">
              <tr>
                <th className="px-4 py-3">{t.empColEmployee}</th>
                <th className="px-4 py-3">{t.empColBase}</th>
                <th className="px-4 py-3">{t.empColBonuses}</th>
                <th className="px-4 py-3">{t.empColDeductions}</th>
                <th className="px-4 py-3">{t.empColNet}</th>
                <th className="px-4 py-3">{t.empColPayStatus}</th>
                <th className="px-4 py-3">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {records.length === 0 && <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-500">{t.empNoData}</td></tr>}
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-white">{r.user?.firstName} {r.user?.lastName}</td>
                  <td className="px-4 py-3 tabular-nums text-gray-300">{fmt(r.baseSalary, lang)}</td>
                  <td className="px-4 py-3 tabular-nums text-emerald-400">+{fmt(r.bonuses, lang)}</td>
                  <td className="px-4 py-3 tabular-nums text-red-400">-{fmt(r.deductions, lang)}</td>
                  <td className="px-4 py-3 tabular-nums font-bold text-amber-400">{fmt(r.netSalary, lang)} {t.currency}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3">
                    {r.status !== "PAID" && (
                      <Button size="sm" onClick={() => handleMarkPaid(r.id)} className="h-7 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20">
                        <Check className="h-3 w-3 mr-1" /> {t.empMarkPaid}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={t.empAddSalary} isRTL={isRTL}>
        {err && <p className="mb-3 text-sm text-red-400 bg-red-500/10 rounded-lg p-3">{err}</p>}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t.empColEmployee}</label>
            <Select value={form.userId} onValueChange={onSelectEmp}>
              <SelectTrigger className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}><SelectValue placeholder={t.empSelectEmployee} /></SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}>
                {(staff || []).map((s) => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t.empSelectMonth}</label>
              <Select value={String(form.month)} onValueChange={(v) => setForm((p) => ({ ...p, month: Number(v) }))}>
                <SelectTrigger className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}>
                  {months.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t.empSelectYear}</label>
              <Input type="number" value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: Number(e.target.value) }))} className="bg-gray-800 border-white/10 text-white" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t.empColBase} ({t.currency})</label>
            <Input type="number" value={form.baseSalary} onChange={(e) => setForm((p) => ({ ...p, baseSalary: e.target.value }))} className="bg-gray-800 border-white/10 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t.empColBonuses}</label>
              <Input type="number" value={form.bonuses} onChange={(e) => setForm((p) => ({ ...p, bonuses: e.target.value }))} className="bg-gray-800 border-white/10 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t.empColDeductions}</label>
              <Input type="number" value={form.deductions} onChange={(e) => setForm((p) => ({ ...p, deductions: e.target.value }))} className="bg-gray-800 border-white/10 text-white" />
            </div>
          </div>
          <div className="bg-amber-500/10 rounded-lg p-3 flex justify-between items-center">
            <span className="text-xs text-amber-400">{t.empColNet}</span>
            <span className="font-bold text-amber-400 tabular-nums">{fmt(net, lang)} {t.currency}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => setDialogOpen(false)} className="hover:bg-white/10">{t.cancel}</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">{saving ? t.saving : t.save}</Button>
        </div>
      </Dialog>
    </div>
  );
}

function LeavesTab({ data, t, lang, isRTL, staff }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [tabData, setTabData] = useState(data);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ userId: "", type: "ANNUAL", fromDate: "", toDate: "", reason: "" });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (m, y) => {
    setLoading(true);
    const res = await getEmployeeHrData({ tab: "leaves", month: m, year: y });
    if (res.ok) setTabData(res);
    setLoading(false);
  }, []);

  const leaves = tabData?.leaves || [];

  const handleSave = async () => {
    setSaving(true); setErr("");
    const res = await createLeaveRequest(form);
    if (res.success) { setDialogOpen(false); load(month, year); }
    else setErr(res.error || "Error");
    setSaving(false);
  };

  const handleReview = async (id, action) => {
    const notes = action === "reject" ? prompt(lang === "ar" ? "سبب الرفض:" : "Rejection reason:") : "";
    const res = await reviewLeaveRequest(id, action, notes || "");
    if (res.success) load(month, year);
  };

  const statusBadge = (s) => {
    const map = { APPROVED: "green", PENDING: "amber", REJECTED: "red" };
    const labels = { APPROVED: t.empLeaveApproved, PENDING: t.empLeavePending, REJECTED: t.empLeaveRejected };
    return <Badge color={map[s] || "gray"}>{labels[s] || s}</Badge>;
  };

  const typeBadge = (tp) => {
    const map = { ANNUAL: "blue", SICK: "amber", EMERGENCY: "red", UNPAID: "gray" };
    const labels = { ANNUAL: t.empLeaveAnnual, SICK: t.empLeaveSick, EMERGENCY: t.empLeaveEmergency, UNPAID: t.empLeaveUnpaid };
    return <Badge color={map[tp] || "gray"}>{labels[tp] || tp}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthYearPicker month={month} year={year} onMonth={(m) => { setMonth(m); load(m, year); }} onYear={(y) => { setYear(y); load(month, y); }} lang={lang} isRTL={isRTL} />
        <Button onClick={() => { setForm({ userId: "", type: "ANNUAL", fromDate: "", toDate: "", reason: "" }); setErr(""); setDialogOpen(true); }} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
          <Plus className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} /> {t.empAddLeave}
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500 animate-pulse">{lang === "ar" ? "جاري التحميل..." : "Loading..."}</div>
      ) : (
        <div className="bg-gray-900 border border-white/5 rounded-xl overflow-hidden">
          <table className={`w-full min-w-[800px] text-sm ${isRTL ? "text-right" : "text-left"}`}>
            <thead className="bg-gray-800/40 text-xs uppercase text-gray-400">
              <tr>
                <th className="px-4 py-3">{t.empColEmployee}</th>
                <th className="px-4 py-3">{t.empColLeaveType}</th>
                <th className="px-4 py-3">{t.empColLeaveFrom}</th>
                <th className="px-4 py-3">{t.empColLeaveTo}</th>
                <th className="px-4 py-3">{t.empColLeaveDays}</th>
                <th className="px-4 py-3">{t.empColLeaveStatus}</th>
                <th className="px-4 py-3">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leaves.length === 0 && <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-500">{t.empNoData}</td></tr>}
              {leaves.map((l) => (
                <tr key={l.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-white">{l.user?.firstName} {l.user?.lastName}</td>
                  <td className="px-4 py-3">{typeBadge(l.type)}</td>
                  <td className="px-4 py-3 text-gray-400 tabular-nums">{fmtDate(l.fromDate, lang)}</td>
                  <td className="px-4 py-3 text-gray-400 tabular-nums">{fmtDate(l.toDate, lang)}</td>
                  <td className="px-4 py-3 text-gray-300 tabular-nums">{l.days}</td>
                  <td className="px-4 py-3">{statusBadge(l.status)}</td>
                  <td className="px-4 py-3">
                    {l.status === "PENDING" && (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => handleReview(l.id, "approve")} className="h-7 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"><Check className="h-3 w-3 mr-1" />{t.empApprove}</Button>
                        <Button size="sm" onClick={() => handleReview(l.id, "reject")} className="h-7 text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"><X className="h-3 w-3 mr-1" />{t.empReject}</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={t.empAddLeave} isRTL={isRTL}>
        {err && <p className="mb-3 text-sm text-red-400 bg-red-500/10 rounded-lg p-3">{err}</p>}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t.empColEmployee}</label>
            <Select value={form.userId} onValueChange={(v) => setForm((p) => ({ ...p, userId: v }))}>
              <SelectTrigger className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}><SelectValue placeholder={t.empSelectEmployee} /></SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}>
                {(staff || []).map((s) => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t.empColLeaveType}</label>
            <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
              <SelectTrigger className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}>
                <SelectItem value="ANNUAL">{t.empLeaveAnnual}</SelectItem>
                <SelectItem value="SICK">{t.empLeaveSick}</SelectItem>
                <SelectItem value="EMERGENCY">{t.empLeaveEmergency}</SelectItem>
                <SelectItem value="UNPAID">{t.empLeaveUnpaid}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t.empColLeaveFrom}</label>
              <Input type="date" value={form.fromDate} onChange={(e) => setForm((p) => ({ ...p, fromDate: e.target.value }))} className="bg-gray-800 border-white/10 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t.empColLeaveTo}</label>
              <Input type="date" value={form.toDate} onChange={(e) => setForm((p) => ({ ...p, toDate: e.target.value }))} className="bg-gray-800 border-white/10 text-white" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t.empColLeaveReason}</label>
            <Input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} className="bg-gray-800 border-white/10 text-white" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => setDialogOpen(false)} className="hover:bg-white/10">{t.cancel}</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">{saving ? t.saving : t.save}</Button>
        </div>
      </Dialog>
    </div>
  );
}

const ROLE_MATRIX = {
  ADMIN: { inventory: [1,1,1,1], cashier: [1,1,1,1], store: [1,1,1,1], accounting: [1,1,1,1], employees: [1,1,1,1], orders: [1,1,1,1], reports: [1,1,1,1], settings: [1,1,1,1] },
  MANAGER: { inventory: [1,1,1,0], cashier: [1,1,1,0], store: [1,1,1,0], accounting: [1,1,1,0], employees: [0,0,0,0], orders: [1,1,1,0], reports: [1,0,0,0], settings: [1,0,0,0] },
  CASHIER: { inventory: [1,0,0,0], cashier: [1,1,1,0], store: [1,0,0,0], accounting: [0,0,0,0], employees: [0,0,0,0], orders: [1,1,0,0], reports: [1,0,0,0], settings: [0,0,0,0] },
};

const MODULES = ["inventory","cashier","store","accounting","employees","orders","reports","settings"];
const PERM_LABELS_EN = { inventory: "Inventory", cashier: "Cashier/POS", store: "Store", accounting: "Accounting", employees: "Employees", orders: "Orders", reports: "Reports", settings: "Settings" };
const PERM_LABELS_AR = { inventory: "المخزون", cashier: "نقطة البيع", store: "المتجر", accounting: "المحاسبة", employees: "الموظفون", orders: "الطلبات", reports: "التقارير", settings: "الإعدادات" };

function RolesTab({ t, lang, isRTL }) {
  const ROLES = [
    { key: "ADMIN", name: lang === "ar" ? t.empRoleAdmin : "Admin", desc: lang === "ar" ? "وصول كامل لجميع الوحدات والتقارير المالية وإدارة الموظفين." : "Full access to all modules, financial reports, and employee management.", count: "—", protected: true, color: "purple" },
    { key: "MANAGER", name: lang === "ar" ? t.empRoleManager : "Manager", desc: lang === "ar" ? "إدارة الطلبات والمخزون. وصول لإحصائيات لوحة التحكم بدون تقارير مالية." : "Manage orders and inventory. Access to dashboard stats, no financial reports.", count: "—", protected: true, color: "blue" },
    { key: "CASHIER", name: lang === "ar" ? t.empRoleCashier : "Cashier", desc: lang === "ar" ? "معالجة الطلبات وعرض المنتجات. وصول محدود للوحة التحكم." : "Process orders and view products. Limited dashboard access.", count: "—", protected: true, color: "amber" },
  ];
  const pLabels = lang === "ar" ? PERM_LABELS_AR : PERM_LABELS_EN;
  const permHeaders = [t.empPermView, t.empPermCreate, t.empPermEdit, t.empPermDelete];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROLES.map((role) => (
          <div key={role.key} className="bg-gray-900 border border-white/5 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${role.color === "purple" ? "bg-purple-500/10 text-purple-400" : role.color === "blue" ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"}`}>
                <Shield className="h-3 w-3" /> {role.name}
              </div>
              {role.protected && <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{lang === "ar" ? "محمي" : "Protected"}</span>}
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{role.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-white/5 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-white">{t.empRolesTitle}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className={`w-full text-xs ${isRTL ? "text-right" : "text-left"}`}>
            <thead className="bg-gray-800/40 text-gray-400">
              <tr>
                <th className="px-4 py-3">{t.empPermModule}</th>
                {ROLES.map((r) => (
                  <th key={r.key} colSpan="4" className="px-4 py-3 text-center border-l border-white/5">{r.name}</th>
                ))}
              </tr>
              <tr className="text-[10px] text-gray-500">
                <th className="px-4 py-2"></th>
                {ROLES.map((r) => permHeaders.map((ph) => <th key={`${r.key}-${ph}`} className="px-2 py-2 text-center">{ph}</th>))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {MODULES.map((mod) => (
                <tr key={mod} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-gray-300">{pLabels[mod]}</td>
                  {ROLES.map((r) =>
                    (ROLE_MATRIX[r.key][mod] || [0,0,0,0]).map((has, pi) => (
                      <td key={`${r.key}-${mod}-${pi}`} className="px-2 py-3 text-center">
                        {has ? <Check className="h-3.5 w-3.5 text-emerald-400 mx-auto" /> : <X className="h-3.5 w-3.5 text-gray-700 mx-auto" />}
                      </td>
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReportsTab({ data, t, lang, isRTL }) {
  const summary = data?.summary || {};
  const payroll = data?.payroll || {};
  const rows = summary?.summaryByEmployee || [];
  const records = payroll?.records || [];
  const totals = payroll?.totals || {};

  const handlePrint = () => window.print();
  const handleCsvAttendance = () => {
    const headers = [t.empColEmployee, t.empStatusPresent, t.empStatusAbsent, t.empStatusLate];
    const csvRows = rows.map((r) => [r.name, r.present, r.absent, r.late]);
    const csv = [headers, ...csvRows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `attendance-report.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 emp-reports-print">
      <div className="flex items-center justify-between accounting-no-print">
        <h2 className="text-white font-semibold">{t.empTabReports}</h2>
        <div className="flex gap-2">
          <Button onClick={handleCsvAttendance} variant="outline" size="sm" className="border-white/10 text-gray-300 hover:bg-white/5">
            <Download className="h-4 w-4 mr-2" />{t.empExportCsv}
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm" className="border-white/10 text-gray-300 hover:bg-white/5">
            <Printer className="h-4 w-4 mr-2" />{t.empPrint}
          </Button>
        </div>
      </div>

      <div className="bg-gray-900 border border-white/5 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-white">{t.empMonthlySummary}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${isRTL ? "text-right" : "text-left"}`}>
            <thead className="bg-gray-800/40 text-xs uppercase text-gray-400">
              <tr>
                <th className="px-4 py-3">{t.empColEmployee}</th>
                <th className="px-4 py-3 text-emerald-400">{t.empStatusPresent}</th>
                <th className="px-4 py-3 text-red-400">{t.empStatusAbsent}</th>
                <th className="px-4 py-3 text-amber-400">{t.empStatusLate}</th>
                <th className="px-4 py-3">{t.empStatusHalfDay}</th>
                <th className="px-4 py-3">{lang === "ar" ? "معدل الحضور %" : "Attendance Rate %"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.length === 0 && <tr><td colSpan="6" className="px-4 py-10 text-center text-gray-500">{t.empNoData}</td></tr>}
              {rows.map((e) => {
                const rate = e.totalDays > 0 ? Math.round(((e.present + e.late * 0.5 + e.halfDay * 0.5) / e.totalDays) * 100) : 0;
                return (
                  <tr key={e.userId} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-white">{e.name}</td>
                    <td className="px-4 py-3 text-emerald-400 tabular-nums">{e.present}</td>
                    <td className="px-4 py-3 text-red-400 tabular-nums">{e.absent}</td>
                    <td className="px-4 py-3 text-amber-400 tabular-nums">{e.late}</td>
                    <td className="px-4 py-3 text-gray-400 tabular-nums">{e.halfDay}</td>
                    <td className="px-4 py-3 tabular-nums">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-xs text-gray-300">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gray-900 border border-white/5 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-white">{lang === "ar" ? "تقرير الرواتب" : "Payroll Report"}</h3>
        </div>
        <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {[
            { label: t.empColBase, value: fmt(totals.totalBase, lang), color: "text-blue-400" },
            { label: t.empColBonuses, value: fmt(totals.totalBonuses, lang), color: "text-emerald-400" },
            { label: t.empColDeductions, value: fmt(totals.totalDeductions, lang), color: "text-red-400" },
            { label: t.empColNet, value: fmt(totals.totalNet, lang), color: "text-amber-400" },
          ].map((item) => (
            <div key={item.label} className="bg-gray-800/40 rounded-xl p-4">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className={`text-lg font-bold tabular-nums mt-1 ${item.color}`}>{item.value} {t.currency}</p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${isRTL ? "text-right" : "text-left"}`}>
            <thead className="bg-gray-800/40 text-xs uppercase text-gray-400">
              <tr>
                <th className="px-4 py-3">{t.empColEmployee}</th>
                <th className="px-4 py-3">{t.empColBase}</th>
                <th className="px-4 py-3">{t.empColBonuses}</th>
                <th className="px-4 py-3">{t.empColDeductions}</th>
                <th className="px-4 py-3">{t.empColNet}</th>
                <th className="px-4 py-3">{t.empColPayStatus}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {records.length === 0 && <tr><td colSpan="6" className="px-4 py-10 text-center text-gray-500">{t.empNoData}</td></tr>}
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-white">{r.user?.firstName} {r.user?.lastName}</td>
                  <td className="px-4 py-3 tabular-nums text-gray-300">{fmt(r.baseSalary, lang)}</td>
                  <td className="px-4 py-3 tabular-nums text-emerald-400">{fmt(r.bonuses, lang)}</td>
                  <td className="px-4 py-3 tabular-nums text-red-400">{fmt(r.deductions, lang)}</td>
                  <td className="px-4 py-3 tabular-nums font-bold text-amber-400">{fmt(r.netSalary, lang)} {t.currency}</td>
                  <td className="px-4 py-3"><Badge color={r.status === "PAID" ? "green" : r.status === "PENDING" ? "amber" : "blue"}>{r.status === "PAID" ? t.empSalaryPaid : r.status === "PENDING" ? t.empSalaryPending : t.empSalaryProcessing}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function EmployeesModuleClient({ initialData, initialTab, initialStaff, permissions }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const activeTab = searchParams.get("tab") || initialTab || "overview";
  const [tabData, setTabData] = useState({ [activeTab]: initialData });
  const [staff, setStaff] = useState(initialStaff || []);
  const skipRef = useRef(true);

  const setTab = (tab) => {
    const p = new URLSearchParams(searchParams);
    p.set("tab", tab);
    router.push(`${pathname}?${p.toString()}`);
  };

  const loadTab = useCallback(async (tab) => {
    if (tabData[tab]) return;
    startTransition(async () => {
      const res = await getEmployeeHrData({ tab });
      if (res.ok) setTabData((prev) => ({ ...prev, [tab]: res }));
    });
  }, [tabData]);

  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return; }
    loadTab(activeTab);
  }, [activeTab]);

  const TABS_CONFIG = [
    { key: "overview", label: t.empTabOverview, icon: LayoutDashboard },
    { key: "employees", label: t.empTabEmployees, icon: Users },
    { key: "attendance", label: t.empTabAttendance, icon: Calendar },
    { key: "salaries", label: t.empTabSalaries, icon: DollarSign },
    { key: "leaves", label: t.empTabLeaves, icon: Clock },
    { key: "roles", label: t.empTabRoles, icon: Shield },
    { key: "reports", label: t.empTabReports, icon: BarChart3 },
  ];

  const currentData = tabData[activeTab];

  return (
    <div className={`space-y-6 ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="overflow-x-auto">
        <div className="flex gap-1 bg-gray-900/50 border border-white/5 rounded-xl p-1 w-fit min-w-full sm:min-w-0">
          {TABS_CONFIG.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === key ? "bg-amber-500 text-black" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {isPending && (
            <div className="py-12 text-center text-gray-500 animate-pulse">{lang === "ar" ? "جاري التحميل..." : "Loading..."}</div>
          )}
          {!isPending && (
            <>
              {activeTab === "overview" && <OverviewTab data={currentData} t={t} lang={lang} isRTL={isRTL} staff={staff} />}
              {activeTab === "employees" && null}
              {activeTab === "attendance" && <AttendanceTab data={currentData} t={t} lang={lang} isRTL={isRTL} staff={staff} />}
              {activeTab === "salaries" && <SalariesTab data={currentData} t={t} lang={lang} isRTL={isRTL} staff={staff} />}
              {activeTab === "leaves" && <LeavesTab data={currentData} t={t} lang={lang} isRTL={isRTL} staff={staff} />}
              {activeTab === "roles" && <RolesTab t={t} lang={lang} isRTL={isRTL} />}
              {activeTab === "reports" && <ReportsTab data={currentData} t={t} lang={lang} isRTL={isRTL} />}
            </>
          )}
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
