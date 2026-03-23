import { getSummary, getTransactions } from "@/app/actions/accounting";
import TransactionTable from "@/components/accounting/TransactionTable";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";

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

  const cards = [
    {
      label: "Total Incoming",
      value: summary.totalIn,
      icon: TrendingUp,
      color: "emerald",
      prefix: "+",
    },
    {
      label: "Total Outgoing",
      value: summary.totalOut,
      icon: TrendingDown,
      color: "red",
      prefix: "-",
    },
    {
      label: "Net Profit",
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Accounting</h1>
        <p className="text-gray-400 mt-1">Track all incoming and outgoing transactions.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => {
          const colors = colorMap[card.color];
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-gray-900 border border-white/5 rounded-xl p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${colors.bg} shrink-0`}>
                <Icon className={`h-5 w-5 ${colors.icon}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{card.label}</p>
                <p className={`text-2xl font-bold mt-0.5 ${colors.value}`}>
                  {card.prefix}${card.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
