import { getAllOrders } from "@/app/actions/catalog";
import OrderTable from "@/components/admin/OrderTable";
import { getTranslations } from "@/lib/translations";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }) {
  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const search = params?.search || "";
  const status = params?.status || "all";

  const { orders, total } = await getAllOrders({ search, status, page, limit: 20 });
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = getTranslations(lang);

  return (
    <div className="space-y-8 p-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          {t.adminOrders || "Orders"}
        </h1>
        <p className="text-gray-400 text-sm">
          {t.adminRecentOrders || "View and manage recent customer orders."}
        </p>
      </div>

      <OrderTable initialOrders={orders} total={total} searchParams={params} />
    </div>
  );
}
