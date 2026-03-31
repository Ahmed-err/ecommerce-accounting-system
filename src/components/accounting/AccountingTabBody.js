"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { printElementById } from "@/lib/print";
import { createTransaction, deleteTransaction, bulkDeleteTransactions, createLedgerInvoice, markLedgerInvoicePaid } from "@/app/actions/accounting";
import { toast } from "sonner";
import { UploadButton } from "@/lib/uploader";
import TransactionForm from "./TransactionForm";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const CHART_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ef4444", "#06b6d4", "#eab308"];

const EXPENSE_PRESETS = ["Rent", "Utilities", "Salaries", "Shipping", "Maintenance", "Marketing", "Supplies", "Taxes", "Other"];

function Money({ value, lang, t, signed }) {
  const n = Number(value) || 0;
  const str = Math.abs(n).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = signed ? (n >= 0 ? "+" : "−") : n < 0 ? "−" : "";
  return (
    <span dir="ltr" className="tabular-nums inline-block">
      {prefix}
      {str} {t.currency}
    </span>
  );
}

function Delta({ type, pct, t, isRTL }) {
  const v = Number(pct) || 0;
  let positiveIsGood = true;
  if (type === "expenses") positiveIsGood = false;
  const good = positiveIsGood ? v >= 0 : v <= 0;
  const Icon = v >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight border",
        good ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-red-500/40 text-red-400 bg-red-500/10"
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(v).toFixed(1)}% {t.accVsPrev}
    </span>
  );
}

export function AccountingTabBody({ tab, data, t, lang, isRTL, permissions, onRefresh }) {
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState(() => new Set());

  const [expForm, setExpForm] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "Rent",
    amount: "",
    description: "",
    notes: "",
    paymentMethod: "CASH",
    receiptUrl: "",
  });

  const [invForm, setInvForm] = useState({
    direction: "PAYABLE",
    partyName: "",
    amount: "",
    dueDate: "",
    notes: "",
  });

  useEffect(() => {
    setSelected(new Set());
  }, [tab, data?.range?.start]);

  if (!data?.ok) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gray-900/80 p-12 text-center text-gray-400">
        <p>{t.accLoadError}</p>
        <Button variant="outline" className="mt-4 border-white/10" onClick={onRefresh}>
          {t.accRetry}
        </Button>
      </div>
    );
  }

  if (tab === "dashboard") {
    const { kpis, stacked, pie, recent } = data;
    const barData = (stacked || []).map((r) => ({
      name: r.month,
      store: r.store,
      pos: r.pos,
      other: r.other,
    }));
    const pieData = pie || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              key: "rev",
              label: t.accKpiRevenue,
              value: kpis.totalRevenue,
              delta: kpis.delta.revenuePct,
              dType: "revenue",
              icon: TrendingUp,
              color: "emerald",
            },
            {
              key: "exp",
              label: t.accKpiExpenses,
              value: kpis.totalExpenses,
              delta: kpis.delta.expensesPct,
              dType: "expenses",
              icon: TrendingDown,
              color: "red",
            },
            {
              key: "net",
              label: t.accKpiNet,
              value: kpis.netProfit,
              delta: kpis.delta.netPct,
              dType: "net",
              icon: DollarSign,
              color: kpis.netProfit >= 0 ? "amber" : "red",
            },
            {
              key: "cash",
              label: t.accKpiCash,
              value: kpis.cashBalance,
              delta: kpis.delta.cashPct,
              dType: "revenue",
              icon: Wallet,
              color: "sky",
            },
          ].map((card, i) => (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="relative overflow-hidden rounded-2xl border border-white/5 bg-gray-900 p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-gray-500">{card.label}</p>
                  <p
                    className={cn(
                      "mt-2 text-xl font-bold tabular-nums",
                      card.key === "net" && card.value < 0 && "text-red-400",
                      card.key === "net" && card.value >= 0 && "text-emerald-400",
                      card.key !== "net" && "text-white"
                    )}
                  >
                    <Money value={card.value} lang={lang} t={t} />
                  </p>
                </div>
                <div className={cn("rounded-xl p-2.5", card.color === "emerald" && "bg-emerald-500/10", card.color === "red" && "bg-red-500/10", card.color === "amber" && "bg-amber-500/10", card.color === "sky" && "bg-sky-500/10")}>
                  <card.icon className={cn("h-5 w-5", card.color === "emerald" && "text-emerald-400", card.color === "red" && "text-red-400", card.color === "amber" && "text-amber-400", card.color === "sky" && "text-sky-400")} />
                </div>
              </div>
              <div className={`mt-3 ${isRTL ? "text-right" : "text-left"}`}>
                <Delta type={card.dType} pct={card.delta} t={t} isRTL={isRTL} />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/5 bg-gray-900 p-4">
            <h3 className="mb-4 text-sm font-semibold text-white">{t.accChartStoreVsPos}</h3>
            {barData.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">{t.accNoData}</p>
            ) : (
              <div className="h-64 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff18" />
                    <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: "#111827", border: "1px solid #ffffff22", borderRadius: 8 }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Legend />
                    <Bar dataKey="store" stackId="a" fill="#10b981" name={t.accSourceStore} />
                    <Bar dataKey="pos" stackId="a" fill="#f59e0b" name={t.accSourcePos} />
                    <Bar dataKey="other" stackId="a" fill="#6b7280" name={t.accSourceOther} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-white/5 bg-gray-900 p-4">
            <h3 className="mb-4 text-sm font-semibold text-white">{t.accChartExpenseCats}</h3>
            {pieData.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">{t.accNoData}</p>
            ) : (
              <div className="h-64 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#111827", border: "1px solid #ffffff22" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-gray-900 p-4">
          <div className={`accounting-no-print mb-3 flex flex-wrap items-center justify-between gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <h3 className="text-sm font-semibold text-white">{t.accRecentActivity}</h3>
            <Button size="sm" variant="outline" className="border-white/10 text-white" onClick={() => setExpenseOpen(true)}>
              {t.accAddExpense}
            </Button>
          </div>
          <ul className="divide-y divide-white/5">
            {(recent || []).length === 0 && <li className="py-6 text-center text-gray-500">{t.accNoData}</li>}
            {(recent || []).map((r) => (
              <li key={r.id + r.kind} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div className={cn("min-w-0", isRTL ? "text-right" : "text-left")}>
                  <p className="truncate font-medium text-white">{r.label}</p>
                  <p className="text-xs text-gray-500">{r.sub}</p>
                </div>
                <span className={cn("tabular-nums font-semibold", r.amount >= 0 ? "text-emerald-400" : "text-red-400")}>
                  <Money value={r.amount} lang={lang} t={t} signed />
                </span>
              </li>
            ))}
          </ul>
        </div>

        <ExpenseDialog
          open={expenseOpen}
          onOpenChange={setExpenseOpen}
          t={t}
          lang={lang}
          isRTL={isRTL}
          form={expForm}
          setForm={setExpForm}
          onSaved={() => {
            setExpenseOpen(false);
            onRefresh();
          }}
        />
      </div>
    );
  }

  if (tab === "revenues") {
    const { revenues, expenses } = data;
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DataTable
          title={t.accKpiRevenue}
          lang={lang}
          rows={revenues?.rows}
          total={revenues?.total}
          cols={[
            { key: "date", label: t.accountingColDate, render: (r) => new Date(r.date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US") },
            { key: "source", label: t.accColSource, render: (r) => (r.source === "pos" ? t.accSourcePos : r.source === "store" ? t.accSourceStore : t.accSourceOther) },
            {
              key: "status",
              label: t.accColStatus,
              render: (r) => (
                <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">{r.status === "posted" ? t.accStatusPaid : r.status}</Badge>
              ),
            },
            { key: "amount", label: t.accountingColAmount, render: (r) => <Money value={r.amount} lang={lang} t={t} />, num: true },
          ]}
          t={t}
          isRTL={isRTL}
          extra={
            <Button size="sm" className="bg-amber-500 text-black" onClick={() => setExpenseOpen(true)}>
              {t.accAddExpense}
            </Button>
          }
        />
        <DataTable
          title={t.accKpiExpenses}
          lang={lang}
          rows={expenses?.rows}
          total={expenses?.total}
          cols={[
            { key: "date", label: t.accountingColDate, render: (r) => new Date(r.date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US") },
            { key: "category", label: t.accountingColCategory, render: (r) => (lang === "ar" ? t[r.category] || r.category : r.category) },
            { key: "description", label: t.accountingColDesc, render: (r) => <span className="max-w-[180px] truncate">{r.description}</span> },
            { key: "paidBy", label: t.accColPaidBy, render: (r) => r.paidBy },
            { key: "amount", label: t.accountingColAmount, render: (r) => <Money value={r.amount} lang={lang} t={t} />, num: true },
          ]}
          t={t}
          isRTL={isRTL}
          actions={(r) =>
            r.editable ? (
              <Button variant="ghost" size="sm" className="text-amber-500" onClick={() => { setEditTx({ ...r, type: "OUTGOING" }); setFormOpen(true); }}>
                {t.accEditExpense}
              </Button>
            ) : null
          }
        />
        <TransactionForm
          isOpen={formOpen}
          onClose={() => { setFormOpen(false); setEditTx(null); onRefresh(); }}
          transaction={editTx}
        />
        <ExpenseDialog
          open={expenseOpen}
          onOpenChange={setExpenseOpen}
          t={t}
          lang={lang}
          isRTL={isRTL}
          form={expForm}
          setForm={setExpForm}
          onSaved={() => {
            setExpenseOpen(false);
            onRefresh();
          }}
        />
      </div>
    );
  }

  if (tab === "pl") {
    const { statement, trend } = data;
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/5 bg-gray-900 p-6 space-y-3 max-w-lg">
          <PlLine label={t.accPlGrossRevenue} value={statement.grossRevenue} lang={lang} t={t} tone="in" />
          <PlLine label={t.accPlCogs} value={statement.cogs} lang={lang} t={t} tone="out" />
          <PlLine label={t.accPlGrossProfit} value={statement.grossProfit} lang={lang} t={t} tone="net" />
          <PlLine label={t.accPlOpEx} value={statement.operatingExpenses} lang={lang} t={t} tone="out" />
          <div className="border-t border-white/10 pt-3 mt-2">
            <PlLine label={t.accPlNet} value={statement.netProfit} lang={lang} t={t} tone="emphasis" />
          </div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-gray-900 p-4">
          <h3 className="mb-2 text-sm font-semibold">{t.accPlTrend}</h3>
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff18" />
                <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #ffffff22" }} />
                <Line type="monotone" dataKey="netProfit" stroke="#f59e0b" strokeWidth={2} dot={false} name={t.accKpiNet} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="accounting-no-print flex gap-2">
          <Button type="button" variant="outline" className="border-white/10" onClick={() => printElementById("accounting-tab-print")}>
            {t.accExportPdf}
          </Button>
        </div>
      </div>
    );
  }

  if (tab === "cashflow") {
    const { rows, monthly, openingBalance, closingBalance } = data;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/5 bg-gray-900 p-4">
            <p className="text-xs text-gray-500">{t.accCashOpening}</p>
            <p className="text-lg font-bold text-white tabular-nums">
              <Money value={openingBalance} lang={lang} t={t} />
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-gray-900 p-4">
            <p className="text-xs text-gray-500">{t.accCashClosing}</p>
            <p className="text-lg font-bold text-white tabular-nums">
              <Money value={closingBalance} lang={lang} t={t} />
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-gray-900 p-4">
          <h3 className="mb-2 text-sm font-semibold">{t.accCashMonthlyChart}</h3>
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff18" />
                <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #ffffff22" }} />
                <Legend />
                <Bar dataKey="in" fill="#10b981" name={t.accCashIn} />
                <Bar dataKey="out" fill="#ef4444" name={t.accCashOut} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className={`w-full min-w-[640px] text-sm ${isRTL ? "text-right" : "text-left"}`}>
            <thead className="bg-gray-800/50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t.accountingColDate}</th>
                <th className="px-4 py-3">{t.accCashIn}</th>
                <th className="px-4 py-3">{t.accCashOut}</th>
                <th className="px-4 py-3">{t.accCashRunning}</th>
                <th className="px-4 py-3">{t.accountingColDesc}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {(rows || []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    {t.accNoData}
                  </td>
                </tr>
              )}
              {(rows || []).map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 whitespace-nowrap tabular-nums">{new Date(r.date).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</td>
                  <td className="px-4 py-2 text-emerald-400 tabular-nums">{r.in > 0 ? <Money value={r.in} lang={lang} t={t} /> : "—"}</td>
                  <td className="px-4 py-2 text-red-400 tabular-nums">{r.out > 0 ? <Money value={r.out} lang={lang} t={t} /> : "—"}</td>
                  <td className="px-4 py-2 font-medium tabular-nums">
                    <Money value={r.balance} lang={lang} t={t} />
                  </td>
                  <td className="px-4 py-2 max-w-[200px] truncate text-gray-500">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (tab === "invoices") {
    const { ledger, sales, overdueCount } = data;

    const statusBadge = (s) => {
      const map = {
        PAID: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        OVERDUE: "bg-red-500/15 text-red-400 border-red-500/30",
        CANCELLED: "bg-gray-500/15 text-gray-400 border-gray-500/30",
      };
      const label =
        s === "PAID" ? t.accStatusPaid : s === "PENDING" ? t.accStatusPending : s === "OVERDUE" ? t.accStatusOverdue : s === "CANCELLED" ? t.accStatusCancelled : s;
      return <Badge className={cn("border", map[s] || map.PENDING)}>{label}</Badge>;
    };

    return (
      <div className="space-y-8">
        <div className="accounting-no-print flex flex-wrap gap-2">
          <Button className="bg-amber-500 text-black" onClick={() => setInvoiceOpen(true)}>
            {t.accAddInvoice}
          </Button>
        </div>

        <InvoiceDialog
          open={invoiceOpen}
          onOpenChange={setInvoiceOpen}
          form={invForm}
          setForm={setInvForm}
          t={t}
          isRTL={isRTL}
          onSaved={() => {
            setInvoiceOpen(false);
            onRefresh();
          }}
        />

        <section>
          <h3 className="mb-3 text-sm font-semibold text-white">{t.accInvoicesLedger}</h3>
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className={`w-full min-w-[720px] text-sm ${isRTL ? "text-right" : "text-left"}`}>
              <thead className="bg-gray-800/50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">{t.accColInvoiceNo}</th>
                  <th className="px-4 py-3">{t.accColParty}</th>
                  <th className="px-4 py-3">{t.accFilterDirection}</th>
                  <th className="px-4 py-3">{t.accountingColAmount}</th>
                  <th className="px-4 py-3">{t.accColDue}</th>
                  <th className="px-4 py-3">{t.accColStatus}</th>
                  <th className="px-4 py-3 accounting-no-print">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(ledger || []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      {t.accNoData}
                    </td>
                  </tr>
                )}
                {(ledger || []).map((inv) => (
                  <tr key={inv.id} className={inv.displayStatus === "OVERDUE" ? "bg-red-500/5" : ""}>
                    <td className="px-4 py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                    <td className="px-4 py-2">{inv.partyName}</td>
                    <td className="px-4 py-2">{inv.direction === "PAYABLE" ? t.accInvoicePayable : t.accInvoiceReceivable}</td>
                    <td className="px-4 py-2 tabular-nums">
                      <Money value={inv.amount} lang={lang} t={t} />
                    </td>
                    <td className="px-4 py-2 text-gray-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-2">{statusBadge(inv.displayStatus)}</td>
                    <td className="px-4 py-2 accounting-no-print">
                      {inv.status === "PENDING" && (
                        <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-400" onClick={async () => {
                          const res = await markLedgerInvoicePaid({ id: inv.id });
                          if (res.success) toast.success(t.accStatusPaid);
                          else toast.error(res.error);
                          onRefresh();
                        }}>
                          {t.accMarkPaid}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-white">{t.accInvoicesSales}</h3>
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className={`w-full min-w-[640px] text-sm ${isRTL ? "text-right" : "text-left"}`}>
              <thead className="bg-gray-800/50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">{t.accColInvoiceNo}</th>
                  <th className="px-4 py-3">{t.accColParty}</th>
                  <th className="px-4 py-3">{t.accountingColAmount}</th>
                  <th className="px-4 py-3">{t.accColStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(sales || []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      {t.accNoData}
                    </td>
                  </tr>
                )}
                {(sales || []).map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-4 py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                    <td className="px-4 py-2">{inv.partyName}</td>
                    <td className="px-4 py-2 tabular-nums">
                      <Money value={inv.amount} lang={lang} t={t} />
                    </td>
                    <td className="px-4 py-2">{statusBadge(inv.displayStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  if (tab === "expenses") {
    const { expenses, pie } = data;
    const toggle = (id) => {
      setSelected((prev) => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      });
    };

    return (
      <div className="space-y-6">
        <div className="accounting-no-print flex flex-wrap items-center gap-2">
          <Button className="bg-amber-500 text-black" onClick={() => setExpenseOpen(true)}>
            {t.accAddExpense}
          </Button>
          {permissions.canBulkDelete && (
            <Button
              variant="destructive"
              disabled={selected.size === 0}
              onClick={async () => {
                if (!window.confirm(t.accountingDeleteConfirm)) return;
                const res = await bulkDeleteTransactions([...selected]);
                if (res.success) {
                  toast.success(t.save);
                  setSelected(new Set());
                  onRefresh();
                } else toast.error(res.error);
              }}
            >
              {t.accBulkDelete}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 overflow-x-auto rounded-2xl border border-white/5">
            <table className={`w-full min-w-[800px] text-sm ${isRTL ? "text-right" : "text-left"}`}>
              <thead className="bg-gray-800/50 text-xs uppercase text-gray-500">
                <tr>
                  {permissions.canBulkDelete && (
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        className="rounded border-white/20"
                        onChange={(e) => {
                          if (e.target.checked) setSelected(new Set((expenses?.rows || []).filter((x) => x.editable).map((x) => x.id)));
                          else setSelected(new Set());
                        }}
                      />
                    </th>
                  )}
                  <th className="px-4 py-3">{t.accountingColDate}</th>
                  <th className="px-4 py-3">{t.accountingColCategory}</th>
                  <th className="px-4 py-3">{t.accountingColDesc}</th>
                  <th className="px-4 py-3">{t.accountingColAmount}</th>
                  <th className="px-4 py-3">{t.accFilterPayment}</th>
                  <th className="px-4 py-3 accounting-no-print">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(expenses?.rows || []).map((r) => (
                  <tr key={r.id}>
                    {permissions.canBulkDelete && (
                      <td className="px-3 py-2">
                        {r.editable ? (
                          <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="rounded border-white/20" />
                        ) : null}
                      </td>
                    )}
                    <td className="px-4 py-2 whitespace-nowrap">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{lang === "ar" ? t[r.category] || r.category : r.category}</td>
                    <td className="px-4 py-2 max-w-[200px] truncate">{r.description}</td>
                    <td className="px-4 py-2 tabular-nums text-red-300">
                      <Money value={r.amount} lang={lang} t={t} />
                    </td>
                    <td className="px-4 py-2">{r.paidBy}</td>
                    <td className="px-4 py-2 accounting-no-print space-x-1">
                      {r.editable && (
                        <>
                          <Button variant="ghost" size="sm" className="text-amber-500" onClick={() => { setEditTx({ ...r, type: "OUTGOING" }); setFormOpen(true); }}>
                            {t.accEditExpense}
                          </Button>
                          {permissions.canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400"
                              onClick={async () => {
                                if (!window.confirm(t.accountingDeleteConfirm)) return;
                                const res = await deleteTransaction(r.id);
                                if (res.success) onRefresh();
                                else toast.error(res.error);
                              }}
                            >
                              {t.accDelete}
                            </Button>
                          )}
                        </>
                      )}
                      {r.receiptUrl && (
                        <a href={r.receiptUrl} target="_blank" rel="noreferrer" className="text-sky-400 text-xs underline">
                          {t.accReceipt}
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-2xl border border-white/5 bg-gray-900 p-4">
            <h3 className="text-sm font-semibold mb-2">{t.accChartExpenseCats}</h3>
            <div className="h-56 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie || []} dataKey="value" nameKey="name" innerRadius={50} outerRadius={70} paddingAngle={2}>
                    {(pie || []).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #ffffff22" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">{t.accExpenseCategoriesHint}</p>
          </div>
        </div>

        <ExpenseDialog
          open={expenseOpen}
          onOpenChange={setExpenseOpen}
          t={t}
          lang={lang}
          isRTL={isRTL}
          form={expForm}
          setForm={setExpForm}
          onSaved={() => {
            setExpenseOpen(false);
            onRefresh();
          }}
        />
        <TransactionForm isOpen={formOpen} onClose={() => { setFormOpen(false); setEditTx(null); onRefresh(); }} transaction={editTx} />
      </div>
    );
  }

  if (tab === "reports") {
    const { report } = data;
    const { pl, cats, revSplit, top } = report || {};

    const exportCsv = (name, headers, rows) => {
      const esc = (c) => `"${String(c).replace(/"/g, '""')}"`;
      const line = (arr) => arr.map(esc).join(",");
      const body = [line(headers), ...rows.map((r) => line(r))].join("\n");
      const blob = new Blob([body], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div id="accounting-report-print" className="space-y-8">
        <div className="accounting-no-print flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-white/10"
            onClick={() =>
              exportCsv("monthly-summary", ["Metric", "Value"], [
                ["Gross revenue", pl?.grossRevenue],
                ["COGS", pl?.cogs],
                ["Gross profit", pl?.grossProfit],
                ["Operating expenses", pl?.operatingExpenses],
                ["Net profit", pl?.netProfit],
              ])
            }
          >
            {t.accExportCsv}
          </Button>
          <Button variant="outline" className="border-white/10" onClick={() => printElementById("accounting-report-print")}>
            {t.accPrint}
          </Button>
        </div>

        <section className="rounded-2xl border border-white/5 bg-gray-900 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">{t.accReportMonthly}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <ReportRow label={t.accPlGrossRevenue} value={pl?.grossRevenue} lang={lang} t={t} />
            <ReportRow label={t.accPlCogs} value={pl?.cogs} lang={lang} t={t} />
            <ReportRow label={t.accPlGrossProfit} value={pl?.grossProfit} lang={lang} t={t} />
            <ReportRow label={t.accPlOpEx} value={pl?.operatingExpenses} lang={lang} t={t} />
            <ReportRow label={t.accPlNet} value={pl?.netProfit} lang={lang} t={t} strong />
          </div>
        </section>

        <section className="rounded-2xl border border-white/5 bg-gray-900 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">{t.accReportExpenseByCat}</h3>
          <ul className="space-y-2 text-sm">
            {(cats || []).map((c) => (
              <li key={c.name} className="flex justify-between border-b border-white/5 py-2">
                <span>{lang === "ar" ? t[c.name] || c.name : c.name}</span>
                <Money value={c.value} lang={lang} t={t} />
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/5 bg-gray-900 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">{t.accReportRevBySource}</h3>
          <div className="h-56 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revSplit || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff18" />
                <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #ffffff22" }} />
                <Legend />
                <Bar dataKey="store" fill="#10b981" name={t.accSourceStore} />
                <Bar dataKey="pos" fill="#f59e0b" name={t.accSourcePos} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-white/5 bg-gray-900 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">{t.accReportTopProducts}</h3>
          <table className={`w-full text-sm ${isRTL ? "text-right" : "text-left"}`}>
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2">{t.inventoryColProduct}</th>
                <th className="py-2">{t.adminTotal}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(top || []).map((p) => (
                <tr key={p.productId}>
                  <td className="py-2">{lang === "ar" ? p.nameAr || p.name : p.nameEn || p.name}</td>
                  <td className="py-2 tabular-nums">
                    <Money value={p.revenue} lang={lang} t={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    );
  }

  return null;
}

function PlLine({ label, value, lang, t, tone }) {
  const n = Number(value) || 0;
  const color =
    tone === "in"
      ? "text-emerald-400"
      : tone === "out"
        ? "text-red-300"
        : tone === "net"
          ? n >= 0
            ? "text-emerald-400"
            : "text-red-400"
          : tone === "emphasis"
            ? n >= 0
              ? "text-emerald-400 font-bold"
              : "text-red-400 font-bold"
            : "text-white";
  const display =
    tone === "out" ? (
      <span dir="ltr" className="tabular-nums">
        −
        {Math.abs(n).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t.currency}
      </span>
    ) : (
      <Money value={n} lang={lang} t={t} />
    );
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className={cn("tabular-nums font-medium", color)}>{display}</span>
    </div>
  );
}

function ReportRow({ label, value, lang, t, strong }) {
  return (
    <div className="flex justify-between border-b border-white/5 py-2">
      <span className="text-gray-400">{label}</span>
      <span className={cn("tabular-nums font-semibold", strong && (value >= 0 ? "text-emerald-400" : "text-red-400"))}>
        <Money value={value} lang={lang} t={t} />
      </span>
    </div>
  );
}

function DataTable({ title, rows, total, cols, t, lang, isRTL, actions, extra }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-gray-900 flex flex-col">
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b border-white/5 p-4 ${isRTL ? "flex-row-reverse" : ""}`}>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {extra}
      </div>
      <div className="overflow-x-auto">
        <table className={`w-full min-w-[480px] text-sm ${isRTL ? "text-right" : "text-left"}`}>
          <thead className="bg-gray-800/50 text-xs uppercase text-gray-500">
            <tr>
              {cols.map((c) => (
                <th key={c.key} className={cn("px-4 py-3", c.num && (isRTL ? "text-left" : "text-right"))}>
                  {c.label}
                </th>
              ))}
              {actions && <th className="px-4 py-3 accounting-no-print">{t.actions}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-gray-300">
            {(rows || []).length === 0 && (
              <tr>
                <td colSpan={cols.length + (actions ? 1 : 0)} className="px-4 py-8 text-center text-gray-500">
                  {t.accNoData}
                </td>
              </tr>
            )}
            {(rows || []).map((r) => (
              <tr key={r.id}>
                {cols.map((c) => (
                  <td key={c.key} className={cn("px-4 py-2", c.num && (isRTL ? "text-left" : "text-right"))}>
                    {c.render(r)}
                  </td>
                ))}
                {actions && <td className="px-4 py-2 accounting-no-print">{actions(r)}</td>}
              </tr>
            ))}
          </tbody>
          {(rows || []).length > 0 && (
            <tfoot>
              <tr className="border-t border-white/10 bg-gray-800/30 font-semibold text-white">
                <td colSpan={Math.max(1, cols.length - 1)} className="px-4 py-3">
                  {t.accTotals}
                </td>
                <td className={cn("px-4 py-3 tabular-nums", isRTL ? "text-left" : "text-right")}>
                  <Money value={total} lang={lang} t={t} />
                </td>
                {actions && <td className="accounting-no-print" />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function ExpenseDialog({ open, onOpenChange, t, lang, isRTL, form, setForm, onSaved }) {
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    try {
      const res = await createTransaction({
        type: "OUTGOING",
        amount: form.amount,
        description: form.description || form.notes || "Expense",
        category: form.category,
        reference: null,
        date: form.date,
        paymentMethod: form.paymentMethod,
        receiptUrl: form.receiptUrl || null,
      });
      if (res.success) {
        toast.success(t.save);
        onSaved();
        setForm((f) => ({ ...f, amount: "", description: "", notes: "", receiptUrl: "" }));
      } else toast.error(res.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{t.accAddExpense}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="bg-gray-800 border-white/10" />
          <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
            <SelectTrigger className="bg-gray-800 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-white/10 text-white">
              {EXPENSE_PRESETS.map((c) => (
                <SelectItem key={c} value={c}>
                  {lang === "ar" ? t[c] || c : c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder={t.accountingColAmount} type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="bg-gray-800 border-white/10 tabular-nums" dir="ltr" />
          <Input placeholder={t.accountingColDesc} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="bg-gray-800 border-white/10" />
          <Input placeholder={t.accNotes} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="bg-gray-800 border-white/10" />
          <Select value={form.paymentMethod} onValueChange={(v) => setForm((f) => ({ ...f, paymentMethod: v }))}>
            <SelectTrigger className="bg-gray-800 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-white/10 text-white">
              <SelectItem value="CASH">CASH</SelectItem>
              <SelectItem value="BANK_TRANSFER">BANK_TRANSFER</SelectItem>
              <SelectItem value="CARD">CARD</SelectItem>
            </SelectContent>
          </Select>
          <div className="rounded-xl border border-dashed border-white/10 p-3">
            <UploadButton
              endpoint="expenseReceipt"
              content={{
                button: ({ ready }) => (ready ? t.accReceipt : t.saving),
                allowedContent: "Image max 4MB",
              }}
              className="rounded-md bg-amber-500 px-4 py-2 font-bold text-black hover:bg-amber-600 disabled:opacity-60"
              onClientUploadComplete={(res) => {
                if (res?.[0]?.url) setForm((f) => ({ ...f, receiptUrl: res[0].url }));
              }}
              onUploadError={(err) => toast.error(err.message)}
            />
          </div>
        </div>
        <DialogFooter className={cn(isRTL && "flex-row-reverse")}>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t.accClose}
          </Button>
          <Button className="bg-amber-500 text-black" disabled={loading} onClick={submit}>
            {t.accSave}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceDialog({ open, onOpenChange, form, setForm, t, isRTL, onSaved }) {
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    try {
      const res = await createLedgerInvoice({
        direction: form.direction,
        partyName: form.partyName,
        amount: parseFloat(form.amount),
        dueDate: form.dueDate || null,
        notes: form.notes || null,
      });
      if (res.success) {
        toast.success(t.save);
        onSaved();
        setForm({ direction: "PAYABLE", partyName: "", amount: "", dueDate: "", notes: "" });
      } else toast.error(res.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{t.accAddInvoice}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Select value={form.direction} onValueChange={(v) => setForm((f) => ({ ...f, direction: v }))}>
            <SelectTrigger className="bg-gray-800 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-white/10 text-white">
              <SelectItem value="PAYABLE">{t.accInvoicePayable}</SelectItem>
              <SelectItem value="RECEIVABLE">{t.accInvoiceReceivable}</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder={t.accColParty} value={form.partyName} onChange={(e) => setForm((f) => ({ ...f, partyName: e.target.value }))} className="bg-gray-800 border-white/10" />
          <Input placeholder={t.accountingColAmount} type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="bg-gray-800 border-white/10 tabular-nums" dir="ltr" />
          <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="bg-gray-800 border-white/10" />
          <textarea placeholder={t.accNotes} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="w-full min-h-[80px] rounded-md bg-gray-800 border border-white/10 p-2 text-sm" />
        </div>
        <DialogFooter className={cn(isRTL && "flex-row-reverse")}>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t.accClose}
          </Button>
          <Button className="bg-amber-500 text-black" disabled={loading} onClick={submit}>
            {t.accSave}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
