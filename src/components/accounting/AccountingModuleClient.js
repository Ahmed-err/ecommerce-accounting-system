"use client";

import { useCallback, useEffect, useState, useTransition, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { getAccountingTabData } from "@/app/actions/accounting";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PrintReportButton from "./PrintReportButton";
import { AccountingTabBody } from "./AccountingTabBody";

const TAB_IDS = ["dashboard", "revenues", "pl", "cashflow", "invoices", "expenses", "reports"];

function validTab(t) {
  return TAB_IDS.includes(t) ? t : "dashboard";
}

export default function AccountingModuleClient({ initialTab, initialPayload, permissions, overdueCount: initialOverdue }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = validTab(searchParams.get("tab") || initialTab || "dashboard");
  const [tabData, setTabData] = useState(() => ({
    [validTab(initialTab || "dashboard")]: initialPayload,
  }));
  const [overdue, setOverdue] = useState(initialOverdue ?? 0);
  const [pending, startTransition] = useTransition();

  const [rangePreset, setRangePreset] = useState(searchParams.get("range") || "month");
  const [customFrom, setCustomFrom] = useState(searchParams.get("from") || "");
  const [customTo, setCustomTo] = useState(searchParams.get("to") || "");
  const [plGranularity, setPlGranularity] = useState(searchParams.get("plg") || "monthly");

  const refresh = useCallback(() => {
    const targetTab = tab;
    startTransition(async () => {
      const res = await getAccountingTabData(targetTab, {
        rangePreset,
        customFrom: rangePreset === "custom" ? customFrom : undefined,
        customTo: rangePreset === "custom" ? customTo : undefined,
        plGranularity: targetTab === "pl" ? plGranularity : undefined,
      });
      setTabData((prev) => ({ ...prev, [targetTab]: res }));
      if (res?.overdueCount != null) setOverdue(res.overdueCount);
    });
  }, [tab, rangePreset, customFrom, customTo, plGranularity]);

  const skipNextFetch = useRef(true);
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    if (tabData[tab]) {
      return;
    }
    refresh();
  }, [tab, tabData, refresh]);

  const setTab = (next) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", next);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  const applyRangeToUrl = () => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("range", rangePreset);
    if (rangePreset === "custom") {
      if (customFrom) p.set("from", customFrom);
      if (customTo) p.set("to", customTo);
    } else {
      p.delete("from");
      p.delete("to");
    }
    if (tab === "pl") p.set("plg", plGranularity);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    refresh();
  };

  const tabs = [
    { id: "dashboard", label: t.accTabDashboard },
    { id: "revenues", label: t.accTabRevenues },
    { id: "pl", label: t.accTabPL },
    { id: "cashflow", label: t.accTabCashflow },
    { id: "invoices", label: t.accTabInvoices, badge: overdue > 0 ? overdue : null },
    { id: "expenses", label: t.accTabExpenses },
    { id: "reports", label: t.accTabReports },
  ];

  const currentData = tabData[tab];

  return (
    <div className={`accounting-page-print space-y-6 max-w-[1440px] mx-auto w-full ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className={`accounting-no-print flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between`}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t.adminAccountingTitle}</h1>
          <p className="text-muted-foreground mt-1">{t.adminAccountingDesc}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PrintReportButton label={t.adminPrintReport} isRTL={isRTL} targetId="accounting-tab-print" />
        </div>
      </div>

      <div className="accounting-no-print flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-end">
        <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card/80 p-1">
          {tabs.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setTab(x.id)}
              className={cn(
                "relative rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm",
                tab === x.id ? "bg-amber-500 text-black" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {x.label}
              {x.badge != null && (
                <span className="ms-1 inline-flex min-w-[1.25rem] justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {x.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card/60 p-3">
          <Select value={rangePreset} onValueChange={setRangePreset}>
            <SelectTrigger className="h-9 w-[140px] bg-background border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground">
              <SelectItem value="today">{t.accRangeToday}</SelectItem>
              <SelectItem value="week">{t.accRangeWeek}</SelectItem>
              <SelectItem value="month">{t.accRangeMonth}</SelectItem>
              <SelectItem value="custom">{t.accRangeCustom}</SelectItem>
            </SelectContent>
          </Select>
          {rangePreset === "custom" && (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">{t.accFrom}</span>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 w-[140px] bg-background border-border text-foreground" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">{t.accTo}</span>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 w-[140px] bg-background border-border text-foreground" />
              </div>
            </>
          )}
          {tab === "pl" && (
            <Select value={plGranularity} onValueChange={setPlGranularity}>
              <SelectTrigger className="h-9 w-[140px] bg-background border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                <SelectItem value="monthly">{t.accPlPeriodMonthly}</SelectItem>
                <SelectItem value="quarterly">{t.accPlPeriodQuarterly}</SelectItem>
                <SelectItem value="yearly">{t.accPlPeriodYearly}</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button type="button" size="sm" variant="outline" className="h-9 border-border text-foreground hover:bg-muted" onClick={applyRangeToUrl}>
            {t.accApplyRange}
          </Button>
        </div>
      </div>

      {pending && (
        <div className="rounded-xl border border-border bg-card/50 p-4 text-center text-sm text-muted-foreground animate-pulse">{t.saving}</div>
      )}

      {!currentData ? (
        <div className="rounded-xl border border-border bg-card/50 p-8 text-center text-sm text-muted-foreground animate-pulse">
          {t.loading}
        </div>
      ) : (
        <motion.div id="accounting-tab-print" key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <AccountingTabBody
            tab={tab}
            data={currentData}
            t={t}
            lang={lang}
            isRTL={isRTL}
            permissions={permissions}
            onRefresh={refresh}
          />
        </motion.div>
      )}
    </div>
  );
}
