import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { staffCanViewModule } from "@/lib/permissions-policy";
import { getAccountingTabData, getAccountingPermissions } from "@/app/actions/accounting";
import AccountingModuleClient from "@/components/accounting/AccountingModuleClient";

export const metadata = {
  title: "Accounting | Admin Dashboard",
};

export const dynamic = "force-dynamic";

const TAB_IDS = ["dashboard", "revenues", "pl", "cashflow", "invoices", "expenses", "reports"];

function validTab(t) {
  return TAB_IDS.includes(t) ? t : "dashboard";
}

export default async function AccountingPage({ searchParams }) {
  const params = await searchParams;
  const session = await auth();

  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    redirect("/admin");
  }
  if (!(await staffCanViewModule(session.user.role, "accounting"))) {
    redirect("/admin");
  }

  const perms = await getAccountingPermissions();
  if (!perms.ok) {
    redirect("/");
  }

  const tab = validTab(params?.tab);
  const rangePreset = params?.range || "month";
  const customFrom = params?.from;
  const customTo = params?.to;
  const plGranularity = params?.plg || "monthly";

  const initialPayload = await getAccountingTabData(tab, {
    rangePreset,
    customFrom: rangePreset === "custom" ? customFrom : undefined,
    customTo: rangePreset === "custom" ? customTo : undefined,
    plGranularity: tab === "pl" ? plGranularity : undefined,
  });

  const overdueCount = initialPayload?.overdueCount ?? 0;

  return (
    <AccountingModuleClient
      initialTab={tab}
      initialPayload={initialPayload}
      permissions={perms}
      overdueCount={overdueCount}
    />
  );
}
