import { getEmployees, getDepartments } from "@/app/actions/employees";
import EmployeeTable from "@/components/employees/EmployeeTable";
import { Users, Shield, Building } from "lucide-react";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";

export const metadata = {
  title: "Employee Management | Admin Dashboard",
};

export const dynamic = "force-dynamic";

export default async function EmployeesPage({ searchParams }) {
  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const search = params?.search || "";
  const role = params?.role || "all";
  const department = params?.department || "";

  const { prisma } = await import("@/lib/prisma");

  const [{ employees, total }, departments, adminCount, deptResult] = await Promise.all([
    getEmployees({ search, role, department, page }),
    getDepartments(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.findMany({ where: { department: { not: null } }, select: { department: true }, distinct: ["department"] }),
  ]);

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  const isRTL = lang === "ar";

  const totalEmployees = total;
  const deptCount = deptResult.length;

  const stats = [
    { label: lang === 'ar' ? 'إجمالي الموظفين' : 'Total Employees', value: totalEmployees, icon: Users, color: "bg-blue-500/10 text-blue-500" },
    { label: t.adminAdmins, value: adminCount, icon: Shield, color: "bg-purple-500/10 text-purple-500" },
    { label: t.departments, value: deptCount, icon: Building, color: "bg-amber-500/10 text-amber-500" },
  ];

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{t.adminEmployeesTitle}</h1>
        <p className="text-gray-400 mt-1">{t.adminEmployeesDesc}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-gray-900 border border-white/5 rounded-xl p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.color.split(" ")[0]} shrink-0`}>
                <Icon className={`h-5 w-5 ${stat.color.split(" ")[1]}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-0.5">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <EmployeeTable
        initialEmployees={employees}
        total={total}
        departments={departments}
        searchParams={params}
      />
    </div>
  );
}
