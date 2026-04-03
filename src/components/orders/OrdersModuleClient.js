"use client";

import { useState, useCallback, useTransition, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Store, Monitor, RotateCcw, BarChart3,
  Search, Filter, ChevronLeft, ChevronRight, X, Plus,
  Eye, Printer, Check, CheckCircle2, Clock, Package, Truck,
  XCircle, Download, AlertTriangle, ShoppingCart, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import {
  getOrdersTabData, createOrderReturn, approveOrderReturn, rejectOrderReturn,
  updateOrderStatusAction, getOrderItems,
} from "@/app/actions/orders";

const TABS_CONFIG_KEYS = ["all", "store", "pos", "returns", "reports"];

function mapReturnActionError(res, t) {
  if (!res || res.success) return "";
  const code = res.errorCode;
  const byCode = {
    RETURN_NO_ITEMS: t.ordReturnErrNoItems,
    RETURN_REASON: t.ordReturnErrReason,
    RETURN_ORDER_ID: t.ordReturnErrOrderId,
    RETURN_REFUND_METHOD: t.ordReturnErrGeneric,
    RETURN_LINE_INVALID: t.ordReturnErrLineInvalid,
    VALIDATION: t.ordReturnErrGeneric,
  };
  if (code && byCode[code]) return byCode[code];
  const raw = String(res.error || "");
  if (/too_small/i.test(raw) && /array/i.test(raw)) return t.ordReturnErrNoItems;
  return raw || t.ordReturnErrGeneric;
}

const STATUS_CONFIG = {
  PENDING: { color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock, label: "ordStatusPending" },
  CONFIRMED: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Check, label: "ordStatusProcessing" },
  PROCESSING: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Package, label: "ordStatusProcessing" },
  SHIPPED: { color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20", icon: Truck, label: "ordStatusShipped" },
  DELIVERED: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2, label: "ordStatusDelivered" },
  CANCELLED: { color: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle, label: "ordStatusCancelled" },
};

const RETURN_STATUS_CONFIG = {
  PENDING: "bg-amber-500/10 text-amber-400",
  APPROVED: "bg-emerald-500/10 text-emerald-400",
  REFUNDED: "bg-blue-500/10 text-blue-400",
  REJECTED: "bg-red-500/10 text-red-400",
};

const PIE_COLORS = ["#f59e0b", "#3b82f6", "#6366f1", "#10b981", "#ef4444", "#8b5cf6"];

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

function StatusBadge({ status, t }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  const label = t[cfg.label] || status;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${cfg.color}`}>
      <Icon className="h-2.5 w-2.5" />{label}
    </span>
  );
}

function SourceBadge({ order, t }) {
  const isPos = order.guestCity === "POS Station";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isPos ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"}`}>
      {isPos ? <Monitor className="h-2.5 w-2.5" /> : <Store className="h-2.5 w-2.5" />}
      {isPos ? t.ordSourcePos : t.ordSourceStore}
    </span>
  );
}

function KpiCard({ label, value, icon: Icon, color, sub, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }}
      className="bg-gray-900 border border-white/5 rounded-xl p-4 flex items-center gap-4">
      <div className={`p-2.5 rounded-xl ${color.split(" ")[0]} shrink-0`}>
        <Icon className={`h-4 w-4 ${color.split(" ")[1]}`} />
      </div>
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-white tabular-nums">{value}</p>
        {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

function Dialog({ open, onClose, title, children, isRTL, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className={`relative bg-gray-900 border border-white/10 rounded-2xl w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto shadow-2xl ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function OrderDetailSheet({ order, open, onClose, onStatusChange, t, lang, isRTL }) {
  const [status, setStatus] = useState(order?.status || "PENDING");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (order) setStatus(order.status); }, [order]);

  if (!open || !order) return null;

  const customer = order.guestName || (order.user ? `${order.user.firstName || ""} ${order.user.lastName || ""}`.trim() : "Guest");
  const isPos = order.guestCity === "POS Station";

  const handleStatusChange = async (newStatus) => {
    setSaving(true);
    const res = await updateOrderStatusAction(order.id, newStatus);
    if (res.success) { setStatus(newStatus); onStatusChange(order.id, newStatus); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div
        initial={{ x: isRTL ? -320 : 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: isRTL ? -320 : 320, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 250 }}
        className={`relative bg-gray-900 border border-white/10 rounded-t-2xl md:rounded-2xl w-full md:max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl ${isRTL ? "text-right" : "text-left"}`}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-gray-900 z-10">
          <div>
            <p className="text-xs text-gray-500">{t.ordDetailTitle}</p>
            <p className="text-white font-bold font-mono">#{order.id.slice(-8).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={status} t={t} />
            <SourceBadge order={order} t={t} />
            <span className="text-xs text-gray-500">{fmtDate(order.createdAt, lang)}</span>
          </div>

          <div className="bg-gray-800/40 rounded-xl p-4 space-y-2 text-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{t.ordDetailCustomer}</h4>
            <div className="flex justify-between"><span className="text-gray-500">{t.fullName}:</span><span className="font-medium text-white">{customer}</span></div>
            {order.guestPhone && <div className="flex justify-between"><span className="text-gray-500">{lang === "ar" ? "الهاتف" : "Phone"}:</span><span className="font-medium text-white dir-ltr">{order.guestPhone}</span></div>}
            {order.guestEmail && <div className="flex justify-between"><span className="text-gray-500">{t.email}:</span><span className="font-medium text-white">{order.guestEmail}</span></div>}
            {!isPos && order.guestAddress && <div className="flex justify-between gap-4"><span className="text-gray-500">{lang === "ar" ? "العنوان" : "Address"}:</span><span className="font-medium text-white text-right">{order.guestCity}, {order.guestAddress}</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">{t.ordColPayment}:</span><span className="font-medium text-amber-400">{order.paymentMethod?.replace(/_/g, " ")}</span></div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{t.ordDetailItems}</h4>
            <div className="space-y-2">
              {(order.items || []).map((item) => (
                <div key={item.id} className="flex items-center gap-3 bg-gray-800/40 rounded-xl p-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                    {item.product?.images?.[0] ? <img src={item.product.images[0]} alt="" className="object-cover h-full w-full" /> : <Package className="h-4 w-4 text-gray-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{item.product?.name}</p>
                    <p className="text-[10px] text-gray-500">SKU: {item.product?.sku}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-white tabular-nums">{fmt(item.price, lang)} {t.currency}</p>
                    <p className="text-[10px] text-gray-500">×{item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 bg-amber-500/10 rounded-xl p-3 flex justify-between items-center border border-amber-500/20">
              <span className="text-xs font-bold text-amber-400">{t.grandTotal}</span>
              <span className="font-bold text-amber-400 tabular-nums">{fmt(order.totalAmount, lang)} {t.currency}</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{t.ordUpdateStatus}</h4>
            <div className="flex flex-wrap gap-2">
              {["PENDING","PROCESSING","SHIPPED","DELIVERED","CANCELLED"].map((s) => (
                <button key={s} onClick={() => handleStatusChange(s)} disabled={saving || status === s}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${status === s ? "bg-amber-500 text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"} disabled:opacity-50`}>
                  {t[STATUS_CONFIG[s]?.label] || s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Link href={`/admin/orders/${order.id}/invoice`} target="_blank" className="flex-1">
              <Button variant="outline" size="sm" className="w-full border-white/10 text-gray-300 hover:bg-white/5">
                <Printer className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />{t.ordPrintInvoice}
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function OrdersTable({ orders, total, page, onPageChange, onRowClick, isRTL, t, lang, showSource = true, isLoading }) {
  const totalPages = Math.ceil(total / 20) || 1;

  if (isLoading) return <div className="py-16 text-center text-gray-500 animate-pulse">{lang === "ar" ? "جاري التحميل..." : "Loading..."}</div>;

  return (
    <div className="bg-gray-900 border border-white/5 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className={`w-full min-w-[700px] text-sm ${isRTL ? "text-right" : "text-left"}`}>
          <thead className="bg-gray-800/40 text-xs uppercase text-gray-400">
            <tr>
              <th className="px-4 py-3">{t.ordColOrder}</th>
              <th className="px-4 py-3">{t.ordColDate}</th>
              {showSource && <th className="px-4 py-3">{t.ordColSource}</th>}
              <th className="px-4 py-3">{t.ordColCustomer}</th>
              <th className="px-4 py-3 text-center">{t.ordColItems}</th>
              <th className="px-4 py-3 tabular-nums">{t.ordColTotal}</th>
              <th className="px-4 py-3">{t.ordColStatus}</th>
              <th className="px-4 py-3">{t.ordColActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.length === 0 && (
              <tr><td colSpan={showSource ? 8 : 7} className="px-4 py-14 text-center text-gray-500">
                <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p>{t.ordNoOrders}</p>
              </td></tr>
            )}
            {orders.map((order) => {
              const customer = order.guestName || (order.user ? `${order.user.firstName || ""} ${order.user.lastName || ""}`.trim() : "—");
              return (
                <tr key={order.id} onClick={() => onRowClick(order)} className="hover:bg-white/[0.02] cursor-pointer transition-colors group">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap tabular-nums">{fmtDate(order.createdAt, lang)}</td>
                  {showSource && <td className="px-4 py-3"><SourceBadge order={order} t={t} /></td>}
                  <td className="px-4 py-3">
                    <p className="font-medium text-white text-xs">{customer}</p>
                    {order.guestPhone && <p className="text-[10px] text-gray-500 dir-ltr">{order.guestPhone}</p>}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-gray-300">{order.items?.length || 0}</td>
                  <td className="px-4 py-3 font-bold text-white tabular-nums">{fmt(order.totalAmount, lang)} <span className="text-gray-500 font-normal">{t.currency}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} t={t} /></td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-white" onClick={() => onRowClick(order)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Link href={`/admin/orders/${order.id}/invoice`} target="_blank">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-amber-400">
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {total > 20 && (
        <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between text-sm text-gray-400">
          <span className="tabular-nums">{t.ordPage} {page} {t.ordOf} {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => onPageChange(page - 1)} className="h-7 border-white/10 bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-40">
              {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="h-7 border-white/10 bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-40">
              {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterBar({ t, lang, isRTL, onSearch, onFilter, values, showSource = true }) {
  const [searchVal, setSearchVal] = useState(values.search || "");
  const timerRef = useRef(null);

  const handleSearch = (e) => {
    const v = e.target.value;
    setSearchVal(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch(v), 300);
  };

  return (
    <div className="flex flex-wrap gap-3 items-center bg-gray-900 border border-white/5 rounded-xl p-4">
      <div className="relative flex-1 min-w-48">
        <Search className={`absolute ${isRTL ? "right-3" : "left-3"} inset-y-0 my-auto h-4 w-4 text-gray-500`} />
        <Input value={searchVal} onChange={handleSearch} placeholder={t.ordSearchPlaceholder}
          className={`${isRTL ? "pr-9" : "pl-9"} bg-gray-800 border-white/10 text-white h-9`} />
      </div>
      <Select value={values.status || "all"} onValueChange={(v) => onFilter("status", v)}>
        <SelectTrigger className="w-36 bg-gray-800 border-white/10 text-white h-9" dir={isRTL ? "rtl" : "ltr"}><SelectValue /></SelectTrigger>
        <SelectContent className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}>
          <SelectItem value="all">{lang === "ar" ? "كل الحالات" : "All Statuses"}</SelectItem>
          {["PENDING","PROCESSING","SHIPPED","DELIVERED","CANCELLED"].map((s) => (
            <SelectItem key={s} value={s}>{t[STATUS_CONFIG[s]?.label] || s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showSource && (
        <Select value={values.source || "all"} onValueChange={(v) => onFilter("source", v)}>
          <SelectTrigger className="w-32 bg-gray-800 border-white/10 text-white h-9" dir={isRTL ? "rtl" : "ltr"}><SelectValue /></SelectTrigger>
          <SelectContent className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}>
            <SelectItem value="all">{lang === "ar" ? "الكل" : "All"}</SelectItem>
            <SelectItem value="store">{t.ordSourceStore}</SelectItem>
            <SelectItem value="pos">{t.ordSourcePos}</SelectItem>
          </SelectContent>
        </Select>
      )}
      <div className="flex gap-2 items-center">
        <Input type="date" value={values.dateFrom || ""} onChange={(e) => onFilter("dateFrom", e.target.value)} className="bg-gray-800 border-white/10 text-white h-9 w-36" />
        <span className="text-gray-500 text-xs">—</span>
        <Input type="date" value={values.dateTo || ""} onChange={(e) => onFilter("dateTo", e.target.value)} className="bg-gray-800 border-white/10 text-white h-9 w-36" />
      </div>
    </div>
  );
}

function AllOrdersTab({ data, t, lang, isRTL, onStatusChange }) {
  const [tabData, setTabData] = useState(data);
  const [filters, setFilters] = useState({ search: "", status: "all", source: "all", dateFrom: "", dateTo: "" });
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (f, p) => {
    setLoading(true);
    const res = await getOrdersTabData("all", { ...f, page: p });
    if (res.ok) setTabData(res);
    setLoading(false);
  }, []);

  const handleFilter = (key, val) => {
    const newF = { ...filters, [key]: val };
    setFilters(newF); setPage(1);
    load(newF, 1);
  };

  const handleSearch = (val) => handleFilter("search", val);
  const handlePage = (p) => { setPage(p); load(filters, p); };

  const handleStatusChange = (orderId, newStatus) => {
    setTabData((prev) => ({ ...prev, orders: prev.orders?.map((o) => o.id === orderId ? { ...o, status: newStatus } : o) }));
    if (onStatusChange) onStatusChange(orderId, newStatus);
  };

  const kpis = tabData?.kpis || {};
  const orders = tabData?.orders || [];
  const total = tabData?.total || 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t.ordKpiTotal, value: kpis.total || 0, icon: ShoppingCart, color: "bg-blue-500/10 text-blue-400", delay: 0 },
          { label: t.ordKpiPending, value: kpis.pending || 0, icon: Clock, color: "bg-amber-500/10 text-amber-400", delay: 0.05 },
          { label: t.ordKpiDelivered, value: kpis.delivered || 0, icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-400", delay: 0.1 },
          { label: t.ordKpiToday, value: kpis.todayCount || 0, icon: Package, color: "bg-purple-500/10 text-purple-400", delay: 0.15, sub: `${fmt(kpis.todayRevenue, lang)} ${t.currency}` },
        ].map((k) => <KpiCard key={k.label} {...k} />)}
      </div>
      <FilterBar t={t} lang={lang} isRTL={isRTL} onSearch={handleSearch} onFilter={handleFilter} values={filters} showSource />
      <OrdersTable orders={orders} total={total} page={page} onPageChange={handlePage} onRowClick={setSelectedOrder} isRTL={isRTL} t={t} lang={lang} isLoading={loading} />
      <AnimatePresence>
        {selectedOrder && <OrderDetailSheet order={selectedOrder} open={!!selectedOrder} onClose={() => setSelectedOrder(null)} onStatusChange={handleStatusChange} t={t} lang={lang} isRTL={isRTL} />}
      </AnimatePresence>
    </div>
  );
}

function StoreOrdersTab({ data, t, lang, isRTL }) {
  const [tabData, setTabData] = useState(data);
  const [filters, setFilters] = useState({ search: "", status: "all", dateFrom: "", dateTo: "" });
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (f, p) => {
    setLoading(true);
    const res = await getOrdersTabData("store", { ...f, page: p });
    if (res.ok) setTabData(res);
    setLoading(false);
  }, []);

  const handleFilter = (key, val) => {
    const newF = { ...filters, [key]: val };
    setFilters(newF); setPage(1); load(newF, 1);
  };
  const handlePage = (p) => { setPage(p); load(filters, p); };
  const handleStatusChange = (orderId, newStatus) => {
    setTabData((prev) => ({ ...prev, orders: prev.orders?.map((o) => o.id === orderId ? { ...o, status: newStatus } : o) }));
  };

  return (
    <div className="space-y-5">
      <FilterBar t={t} lang={lang} isRTL={isRTL} onSearch={(v) => handleFilter("search", v)} onFilter={handleFilter} values={filters} showSource={false} />
      <OrdersTable orders={tabData?.orders || []} total={tabData?.total || 0} page={page} onPageChange={handlePage} onRowClick={setSelectedOrder} isRTL={isRTL} t={t} lang={lang} showSource={false} isLoading={loading} />
      <AnimatePresence>
        {selectedOrder && <OrderDetailSheet order={selectedOrder} open={!!selectedOrder} onClose={() => setSelectedOrder(null)} onStatusChange={handleStatusChange} t={t} lang={lang} isRTL={isRTL} />}
      </AnimatePresence>
    </div>
  );
}

function PosOrdersTab({ data, t, lang, isRTL }) {
  const [tabData, setTabData] = useState(data);
  const [filters, setFilters] = useState({ search: "", status: "all", dateFrom: "", dateTo: "" });
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const summary = tabData?.summary || {};

  const load = useCallback(async (f, p) => {
    setLoading(true);
    const res = await getOrdersTabData("pos", { ...f, page: p });
    if (res.ok) setTabData(res);
    setLoading(false);
  }, []);

  const handleFilter = (key, val) => {
    const newF = { ...filters, [key]: val };
    setFilters(newF); setPage(1); load(newF, 1);
  };
  const handlePage = (p) => { setPage(p); load(filters, p); };
  const handleStatusChange = (orderId, newStatus) => {
    setTabData((prev) => ({ ...prev, orders: prev.orders?.map((o) => o.id === orderId ? { ...o, status: newStatus } : o) }));
  };

  return (
    <div className="space-y-5">
      {summary.total > 0 && (
        <div className="bg-gray-900 border border-white/5 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">{t.ordPosSummary}</h3>
          <div className="flex flex-wrap gap-6">
            <div><p className="text-xs text-gray-500">{t.ordPosTotal}</p><p className="text-2xl font-bold text-white tabular-nums">{summary.total}</p></div>
            <div><p className="text-xs text-gray-500">{t.ordPosRevenue}</p><p className="text-2xl font-bold text-amber-400 tabular-nums">{fmt(summary.revenue, lang)} {t.currency}</p></div>
            {Object.entries(summary.byMethod || {}).map(([method, val]) => (
              <div key={method}><p className="text-xs text-gray-500">{method.replace(/_/g, " ")}</p><p className="text-lg font-bold text-blue-400 tabular-nums">{fmt(val, lang)}</p></div>
            ))}
          </div>
        </div>
      )}
      <FilterBar t={t} lang={lang} isRTL={isRTL} onSearch={(v) => handleFilter("search", v)} onFilter={handleFilter} values={filters} showSource={false} />
      <OrdersTable orders={tabData?.orders || []} total={tabData?.total || 0} page={page} onPageChange={handlePage} onRowClick={setSelectedOrder} isRTL={isRTL} t={t} lang={lang} showSource={false} isLoading={loading} />
      <AnimatePresence>
        {selectedOrder && <OrderDetailSheet order={selectedOrder} open={!!selectedOrder} onClose={() => setSelectedOrder(null)} onStatusChange={handleStatusChange} t={t} lang={lang} isRTL={isRTL} />}
      </AnimatePresence>
    </div>
  );
}

function ReturnsTab({ data, t, lang, isRTL, canAdmin }) {
  const [tabData, setTabData] = useState(data);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ orderId: "", reason: "", refundMethod: "CASH", notes: "" });
  const [selectedItems, setSelectedItems] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [err, setErr] = useState("");
  const [loadErr, setLoadErr] = useState("");
  const [loadOk, setLoadOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  const load = useCallback(async () => {
    const res = await getOrdersTabData("returns", {});
    if (res.ok) setTabData(res);
  }, []);

  const fetchOrderItems = useCallback(
    async (orderId) => {
      const id = String(orderId || "").trim();
      if (!id) {
        setOrderItems([]);
        setSelectedItems([]);
        setLoadErr("");
        setLoadOk(false);
        return;
      }
      setLoadingItems(true);
      setLoadErr("");
      setLoadOk(false);
      setErr("");
      const items = await getOrderItems(id);
      setLoadingItems(false);
      if (!items.length) {
        setOrderItems([]);
        setSelectedItems([]);
        setLoadErr(t.ordReturnErrOrderNotFound);
        return;
      }
      setOrderItems(items);
      setSelectedItems(
        items.map((it, idx) => ({
          lineId: it.id,
          productId: it.productId,
          quantity: idx === 0 ? Math.min(1, it.quantity) : 0,
          price: Number(it.price),
        }))
      );
      setLoadOk(true);
    },
    [t]
  );

  const handleSave = async () => {
    setErr("");
    setSaving(true);
    const id = form.orderId.trim();
    if (!id) {
      setErr(t.ordReturnErrOrderId);
      setSaving(false);
      return;
    }
    if (!orderItems.length) {
      setErr(t.ordReturnErrLoadOrderFirst);
      setSaving(false);
      return;
    }
    const payloadItems = selectedItems
      .filter((it) => it.quantity > 0)
      .map(({ productId, quantity, price }) => ({ productId, quantity, price }));
    if (!payloadItems.length) {
      setErr(t.ordReturnErrNoItems);
      setSaving(false);
      return;
    }
    if (form.reason.trim().length < 2) {
      setErr(t.ordReturnErrReason);
      setSaving(false);
      return;
    }
    const res = await createOrderReturn({ ...form, orderId: id, items: payloadItems });
    if (res.success) {
      setDialogOpen(false);
      load();
    } else {
      setErr(mapReturnActionError(res, t));
    }
    setSaving(false);
  };

  const returnLineCount = selectedItems.filter((it) => it.quantity > 0).length;
  const canSubmitReturn =
    form.orderId.trim() &&
    orderItems.length > 0 &&
    returnLineCount > 0 &&
    form.reason.trim().length >= 2;

  const handleApprove = async (id) => {
    const res = await approveOrderReturn(id);
    if (res.success) load();
  };

  const handleReject = async (id) => {
    const reason = prompt(lang === "ar" ? "سبب الرفض:" : "Rejection reason:");
    if (reason === null) return;
    const res = await rejectOrderReturn(id, reason);
    if (res.success) load();
  };

  const returns = tabData?.returns || [];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setForm({ orderId: "", reason: "", refundMethod: "CASH", notes: "" });
            setSelectedItems([]);
            setOrderItems([]);
            setErr("");
            setLoadErr("");
            setLoadOk(false);
            setDialogOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
        >
          <Plus className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />{t.ordAddReturn}
        </Button>
      </div>

      <div className="bg-gray-900 border border-white/5 rounded-xl overflow-hidden">
        <table className={`w-full min-w-[800px] text-sm ${isRTL ? "text-right" : "text-left"}`}>
          <thead className="bg-gray-800/40 text-xs uppercase text-gray-400">
            <tr>
              <th className="px-4 py-3">{t.ordReturnNo}</th>
              <th className="px-4 py-3">{t.ordOrigOrder}</th>
              <th className="px-4 py-3">{t.ordColDate}</th>
              <th className="px-4 py-3">{t.ordReturnReason}</th>
              <th className="px-4 py-3">{t.ordRefundAmount}</th>
              <th className="px-4 py-3">{t.ordReturnStatus}</th>
              <th className="px-4 py-3">{t.ordColActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {returns.length === 0 && (
              <tr><td colSpan="7" className="px-4 py-14 text-center text-gray-500">
                <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p>{t.ordNoReturns}</p>
              </td></tr>
            )}
            {returns.map((r) => (
              <tr key={r.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-mono text-xs text-amber-400">{r.returnNumber}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-300">#{r.orderId.slice(-8).toUpperCase()}</td>
                <td className="px-4 py-3 text-gray-400 tabular-nums">{fmtDate(r.createdAt, lang)}</td>
                <td className="px-4 py-3 text-gray-300 truncate max-w-40">{r.reason}</td>
                <td className="px-4 py-3 font-bold text-white tabular-nums">{fmt(r.refundAmount, lang)} {t.currency}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${RETURN_STATUS_CONFIG[r.status] || "bg-gray-500/10 text-gray-400"}`}>
                    {t[`ordReturn${r.status.charAt(0) + r.status.slice(1).toLowerCase()}`] || r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {r.status === "PENDING" && canAdmin && (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => handleApprove(r.id)} className="h-7 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"><Check className="h-3 w-3 mr-1" />{t.empApprove}</Button>
                      <Button size="sm" onClick={() => handleReject(r.id)} className="h-7 text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"><X className="h-3 w-3 mr-1" />{t.empReject}</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={t.ordAddReturn} isRTL={isRTL} wide>
        {err && (
          <div className="mb-3 text-sm text-red-200 bg-red-500/15 border border-red-500/25 rounded-lg px-3 py-2.5" role="alert">
            {err}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t.ordOrigOrder} ID</label>
            <div className={`flex flex-wrap gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <Input
                value={form.orderId}
                onChange={(e) => {
                  setForm((p) => ({ ...p, orderId: e.target.value }));
                  setLoadErr("");
                  setLoadOk(false);
                }}
                placeholder={lang === "ar" ? "معرّف الطلب…" : "Order ID…"}
                className="flex-1 min-w-[200px] bg-gray-800 border-white/10 text-white"
                disabled={loadingItems}
              />
              <Button
                type="button"
                variant="outline"
                className="border-white/15 text-gray-100 hover:bg-white/10 shrink-0"
                disabled={loadingItems || !form.orderId.trim()}
                onClick={() => fetchOrderItems(form.orderId)}
              >
                {loadingItems ? <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? "ml-2" : "mr-2"}`} /> : null}
                {t.ordReturnLoadOrder}
              </Button>
            </div>
            <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">{t.ordReturnOrderIdHint}</p>
            {loadErr && (
              <p className="text-xs text-red-400 mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2" role="status">
                {loadErr}
              </p>
            )}
            {loadOk && !loadErr && (
              <p className="text-xs text-emerald-400/90 mt-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2" role="status">
                {t.ordReturnLoadedOk}
              </p>
            )}
          </div>
          {orderItems.length > 0 && (
            <div>
              <label className="text-xs text-gray-400 mb-2 block">{t.ordSelectItems}</label>
              <div className="space-y-2">
                {orderItems.map((item) => {
                  const sel = selectedItems.find((s) => s.lineId === item.id);
                  const q = sel?.quantity ?? 0;
                  return (
                    <div key={item.id} className="flex items-center gap-3 bg-gray-800/40 rounded-xl p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white">{item.product?.name}</p>
                        <p className="text-[10px] text-gray-500 tabular-nums">
                          {fmt(item.price, lang)} × {lang === "ar" ? "الحد الأقصى" : "max"} {item.quantity}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={item.quantity}
                        value={q}
                        onChange={(e) => {
                          const raw = Number(e.target.value);
                          const n = Number.isFinite(raw)
                            ? Math.max(0, Math.min(Math.floor(raw), item.quantity))
                            : 0;
                          setSelectedItems((prev) =>
                            prev.map((si) => (si.lineId === item.id ? { ...si, quantity: n } : si))
                          );
                        }}
                        className="w-20 bg-gray-800 border-white/10 text-white h-8 text-center tabular-nums"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t.ordReturnReason}</label>
            <Input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} className="bg-gray-800 border-white/10 text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t.ordRefundMethod}</label>
            <Select value={form.refundMethod} onValueChange={(v) => setForm((p) => ({ ...p, refundMethod: v }))}>
              <SelectTrigger className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}>
                <SelectItem value="CASH">{lang === "ar" ? "نقداً" : "Cash"}</SelectItem>
                <SelectItem value="BANK_TRANSFER">{lang === "ar" ? "تحويل بنكي" : "Bank Transfer"}</SelectItem>
                <SelectItem value="STORE_CREDIT">{lang === "ar" ? "رصيد المتجر" : "Store Credit"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => setDialogOpen(false)} className="hover:bg-white/10">
            {t.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !canSubmitReturn}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold disabled:opacity-50 disabled:pointer-events-none"
          >
            {saving ? t.saving : t.ordConfirmReturn}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function ReportsTab({ data, t, lang, isRTL }) {
  const statusPie = data?.statusPie || [];
  const storeRev = data?.storeRev || 0;
  const posRev = data?.posRev || 0;
  const topCustomers = data?.topCustomers || [];

  const revData = [
    { name: t.ordSourceStore, value: storeRev },
    { name: t.ordSourcePos, value: posRev },
  ].filter((d) => d.value > 0);

  const handlePrint = () => window.print();
  const handleCsv = () => {
    const headers = [t.ordColStatus, lang === "ar" ? "العدد" : "Count"];
    const rows = statusPie.map((s) => [s.name, s.value]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "orders-report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between accounting-no-print">
        <h2 className="text-white font-semibold">{t.ordTabReports}</h2>
        <div className="flex gap-2">
          <Button onClick={handleCsv} variant="outline" size="sm" className="border-white/10 text-gray-300 hover:bg-white/5"><Download className="h-4 w-4 mr-2" />{t.ordExportCsv}</Button>
          <Button onClick={handlePrint} variant="outline" size="sm" className="border-white/10 text-gray-300 hover:bg-white/5"><Printer className="h-4 w-4 mr-2" />{lang === "ar" ? "طباعة" : "Print"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">{t.ordReportStatus}</h3>
          {statusPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                  {statusPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #ffffff10", borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="py-8 text-center text-gray-500 text-sm">{t.empNoData}</div>}
        </div>

        <div className="bg-gray-900 border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">{t.ordReportRevSource}</h3>
          {revData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #ffffff10", borderRadius: 8 }} formatter={(v) => [`${fmt(v, lang)} ${t.currency}`, ""]} />
                <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="py-8 text-center text-gray-500 text-sm">{t.empNoData}</div>}
        </div>
      </div>

      {topCustomers.length > 0 && (
        <div className="bg-gray-900 border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">{t.ordReportTopCust}</h3>
          <div className="overflow-x-auto">
            <table className={`w-full text-sm ${isRTL ? "text-right" : "text-left"}`}>
              <thead className="text-xs text-gray-400 border-b border-white/5">
                <tr>
                  <th className="pb-3">{lang === "ar" ? "الهاتف" : "Phone"}</th>
                  <th className="pb-3 text-center">{lang === "ar" ? "عدد الطلبات" : "Orders"}</th>
                  <th className="pb-3 tabular-nums">{lang === "ar" ? "الإجمالي" : "Total"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topCustomers.map((c, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="py-3 text-gray-300 dir-ltr">{c.guestPhone || "—"}</td>
                    <td className="py-3 text-center tabular-nums text-white">{c._count?.id || 0}</td>
                    <td className="py-3 tabular-nums font-bold text-amber-400">{fmt(c._sum?.totalAmount, lang)} {t.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersModuleClient({ initialData, initialTab, permissions }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const skipRef = useRef(true);

  const activeTab = searchParams.get("tab") || initialTab || "all";
  const [tabData, setTabData] = useState({ [activeTab]: initialData });

  const setTab = (tab) => {
    const p = new URLSearchParams(searchParams);
    p.set("tab", tab);
    router.push(`${pathname}?${p.toString()}`);
  };

  const loadTab = useCallback(async (tab) => {
    if (tabData[tab]) return;
    startTransition(async () => {
      const res = await getOrdersTabData(tab, {});
      if (res.ok) setTabData((prev) => ({ ...prev, [tab]: res }));
    });
  }, [tabData]);

  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return; }
    loadTab(activeTab);
  }, [activeTab]);

  const TABS_CONFIG = [
    { key: "all", label: t.ordTabAll, icon: ShoppingBag },
    { key: "store", label: t.ordTabStore, icon: Store },
    { key: "pos", label: t.ordTabPos, icon: Monitor },
    { key: "returns", label: t.ordTabReturns, icon: RotateCcw },
    { key: "reports", label: t.ordTabReports, icon: BarChart3 },
  ];

  const currentData = tabData[activeTab];
  const canAdmin = permissions?.role === "ADMIN";

  return (
    <div className={`space-y-6 ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="overflow-x-auto">
        <div className="flex gap-1 bg-gray-900/50 border border-white/5 rounded-xl p-1 w-fit min-w-full sm:min-w-0">
          {TABS_CONFIG.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === key ? "bg-amber-500 text-black" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {isPending && <div className="py-16 text-center text-gray-500 animate-pulse">{lang === "ar" ? "جاري التحميل..." : "Loading..."}</div>}
          {!isPending && (
            <>
              {activeTab === "all" && <AllOrdersTab data={currentData} t={t} lang={lang} isRTL={isRTL} />}
              {activeTab === "store" && <StoreOrdersTab data={currentData} t={t} lang={lang} isRTL={isRTL} />}
              {activeTab === "pos" && <PosOrdersTab data={currentData} t={t} lang={lang} isRTL={isRTL} />}
              {activeTab === "returns" && <ReturnsTab data={currentData} t={t} lang={lang} isRTL={isRTL} canAdmin={canAdmin} />}
              {activeTab === "reports" && <ReportsTab data={currentData} t={t} lang={lang} isRTL={isRTL} />}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
