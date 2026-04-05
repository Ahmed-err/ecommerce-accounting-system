import OrderConfirmationClient from "@/components/store/OrderConfirmationClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Order confirmation",
  robots: { index: false, follow: false },
};

export default async function OrderConfirmationPage({ params }) {
  const resolved = await params;
  const raw = resolved?.id;
  const id =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw) && raw[0] != null
        ? String(raw[0])
        : "";
  return <OrderConfirmationClient initialOrderId={id} />;
}
