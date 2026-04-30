import { redirect } from "next/navigation";

export default async function AdminInvoiceRedirect({ params }) {
  const { id } = await params;
  redirect(`/orders/${id}/invoice`);
}
