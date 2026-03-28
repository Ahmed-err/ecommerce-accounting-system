import { getSummary, getTransactions } from "@/app/actions/accounting";
import TransactionTable from "@/components/accounting/TransactionTable";
import PrintReportButton from "@/components/accounting/PrintReportButton";
import { DollarSign, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";

export const metadata = {
  title: "Accounting | Admin Dashboard",
};

export const dynamic = "force-dynamic";

export default async function AccountingPage({ searchParams }) {
  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const search = params?.search || "";
  const type = params?.type || "all";
  const category = params?.category || "";

  const [summary, { transactions, total }] = await Promise.all([
    getSummary(),
    getTransactions({ search, type, category, page }),
  ]);

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  const isRTL = lang === "ar";

  const cards = [
    {
      label: t.adminTotalIncoming,
      value: summary.totalIn,
      icon: TrendingUp,
      color: "emerald",
      prefix: "+",
    },
    {
      label: t.adminTotalOutgoing,
      value: summary.totalOut,
      icon: TrendingDown,
      color: "red",
      prefix: "-",
    },
    {
      label: t.adminNetProfit,
      value: Math.abs(summary.netProfit),
      icon: DollarSign,
      color: summary.netProfit >= 0 ? "amber" : "red",
      prefix: summary.netProfit >= 0 ? "" : "-",
    },
  ];

  const colorMap = {
    emerald: {
      bg: "bg-emerald-500/10",
      icon: "text-emerald-500",
      value: "text-emerald-400",
    },
    red: {
      bg: "bg-red-500/10",
      icon: "text-red-500",
      value: "text-red-400",
    },
    amber: {
      bg: "bg-amber-500/10",
      icon: "text-amber-500",
      value: "text-amber-400",
    },
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{t.adminAccountingTitle}</h1>
          <p className="text-gray-400 mt-1">{t.adminAccountingDesc}</p>
        </div>
        <div className="flex items-center gap-2">
           <PrintReportButton 
            label={t.adminPrintReport}
            isRTL={isRTL}
          />
        </div>
      </div>

      {/* Summary Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => {
          const colors = colorMap[card.color];
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-gray-900 border border-white/5 rounded-2xl p-6 flex flex-col justify-between hover:bg-white/[0.02] transition-colors relative overflow-hidden group">
               {/* Decorative background circle */}
               <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${colors.bg} blur-2xl opacity-20 group-hover:opacity-40 transition-opacity`} />
               
               <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${colors.bg}`}>
                    <Icon className={`h-5 w-5 ${colors.icon}`} />
                  </div>
                  <span className={`text-[10px] font-bold tracking-widest uppercase py-0.5 px-2 rounded ${colors.bg} ${colors.icon} border border-current opacity-75`}>
                     {card.prefix === "+" ? "IN" : card.prefix === "-" ? "OUT" : "DIFF"}
                  </span>
               </div>

               <div>
                <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                <p className={`text-2xl font-bold mt-1 ${colors.value} regular-nums`}>
                  {card.prefix}{card.value.toLocaleString()} {t.currency}
                </p>
                <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                   <Activity className="h-3 w-3" /> {t.adminActiveNow}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transaction Table */}
      <TransactionTable
        initialTransactions={transactions}
        total={total}
        searchParams={params}
      />
    </div>
  );
}
