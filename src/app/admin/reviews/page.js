import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canOpenArea, staffHome } from "@/lib/staff-access";
import { getAdminReviewsAction } from "@/app/actions/reviews";
import ReviewsManagerClient from "@/components/admin/ReviewsManagerClient";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({ searchParams }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    redirect("/admin");
  }
  if (!canOpenArea(session.user.role, "reviews")) {
    redirect(staffHome(session?.user?.role));
  }
  const params = await searchParams;
  const data = await getAdminReviewsAction({
    status: params?.status || "all",
    rating: params?.rating || "all",
    search: params?.search || "",
    page: params?.page || 1,
  });

  if (!data.ok) redirect("/admin");

  // Keyed by the query so new filters/pages replace the client's rows.
  return (
    <ReviewsManagerClient
      key={JSON.stringify(params || {})}
      initialRows={data.rows}
      stats={data.stats}
      total={data.total}
      page={data.page}
      pages={data.pages}
    />
  );
}
