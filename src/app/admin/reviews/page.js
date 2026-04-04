import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { staffCanViewModule } from "@/lib/permissions-policy";
import { getAdminReviewsAction } from "@/app/actions/reviews";
import ReviewsManagerClient from "@/components/admin/ReviewsManagerClient";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({ searchParams }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    redirect("/admin");
  }
  if (!(await staffCanViewModule(session.user.role, "store"))) {
    redirect("/admin");
  }
  const params = await searchParams;
  const data = await getAdminReviewsAction({
    status: params?.status || "all",
    rating: params?.rating || "all",
    search: params?.search || "",
    page: params?.page || 1,
  });

  if (!data.ok) redirect("/admin");

  return <ReviewsManagerClient initialRows={data.rows} stats={data.stats} />;
}
