import OrderConfirmationClient from "@/components/store/OrderConfirmationClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Order confirmation",
  robots: { index: false, follow: false },
};

export default function OrderConfirmationPage() {
  return <OrderConfirmationClient />;
}
