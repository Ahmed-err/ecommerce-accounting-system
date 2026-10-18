"use client";

import { Check, Minus } from "lucide-react";
import { useLanguage, useT } from "@/context/LanguageContext";
import { STAFF_ROLES, accessTable } from "@/lib/staff-access";

const ROLE_KEYS = {
  ADMIN: "empRoleAdmin",
  MANAGER: "empRoleManager",
  CASHIER: "empRoleCashier",
  ACCOUNTANT: "empRoleAccountant",
  SUPPORT: "empRoleSupport",
};

// Read-only: who can open each staff page. Access is fixed in code (src/lib/staff-access.js).
export default function StaffAccessTable() {
  const { lang } = useLanguage();
  const t = useT();
  const ar = lang === "ar";
  const rows = accessTable();

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-bold text-foreground">{ar ? "من يستطيع فتح ماذا" : "Who can open what"}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {ar
            ? "الصلاحيات ثابتة لكل دور. لتغيير ما يراه شخص ما، غيّر دوره من صفحة الموظفين."
            : "Access is fixed per role. To change what someone can see, change their role on the employees page."}
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <th className="p-3 text-start font-semibold">{ar ? "الصفحة" : "Page"}</th>
              {STAFF_ROLES.map((r) => (
                <th key={r} className="p-3 text-center font-semibold">{t[ROLE_KEYS[r]]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border last:border-0">
                <td className="p-3 text-foreground">{t[row.labelKey]}</td>
                {STAFF_ROLES.map((r) => (
                  <td key={r} className="p-3 text-center">
                    {row[r] ? (
                      <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-label={ar ? "نعم" : "Yes"} />
                    ) : (
                      <Minus className="mx-auto h-4 w-4 text-muted-foreground/60" aria-label={ar ? "لا" : "No"} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
