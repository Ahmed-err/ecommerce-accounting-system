import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getEmployees, getDepartments, getEmployeeHrData, getAllStaff } from "@/app/actions/employees";
import EmployeesModuleClient from "@/components/employees/EmployeesModuleClient";
import EmployeeTable from "@/components/employees/EmployeeTable";

export const metadata = {
  title: "Employee Management | Admin Dashboard",
};

export const dynamic = "force-dynamic";

export default async function EmployeesPage({ searchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/admin");
  }

  const params = await searchParams;
  const activeTab = params?.tab || "overview";

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  const isRTL = lang === "ar";

  const [initialData, staff, departments] = await Promise.all([
    getEmployeeHrData({ tab: activeTab, ...params }),
    getAllStaff(),
    getDepartments(),
  ]);

  let employeesData = null;
  if (activeTab === "employees") {
    const page = Number(params?.page) || 1;
    employeesData = await getEmployees({
      search: params?.search || "",
      role: params?.role || "all",
      department: params?.department || "",
      page,
    });
  }

  const permissions = { role: session.user.role };

  return (
    <div className={`space-y-6 ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{t.adminEmployeesTitle}</h1>
        <p className="text-muted-foreground mt-1">{t.adminEmployeesDesc}</p>
      </div>

      <EmployeesModuleClient
        initialData={initialData?.ok ? initialData : null}
        initialTab={activeTab}
        initialStaff={staff}
        permissions={permissions}
      />

      {activeTab === "employees" && employeesData && (
        <EmployeeTable
          initialEmployees={employeesData.employees}
          total={employeesData.total}
          departments={departments}
          searchParams={params}
        />
      )}
    </div>
  );
}
