import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listCouponsAdmin } from "@/app/actions/coupons-admin";
import CouponsAdminClient from "@/components/admin/CouponsAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage({ searchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/admin");
  }

  const params = await searchParams;
  const data = await listCouponsAdmin({
    page: Number(params?.page) || 1,
    search: params?.search || "",
    status: params?.status || "all",
  });

  return (
    <CouponsAdminClient
      initialRows={data?.rows || []}
      initialTotal={data?.total || 0}
      initialPage={data?.page || 1}
      initialPages={data?.pages || 1}
      initialSearch={params?.search || ""}
      initialStatus={params?.status || "all"}
    />
  );
}
