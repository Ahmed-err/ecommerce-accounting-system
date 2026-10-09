import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function MyOrdersPage() {
  const session = await auth();
  if (!session) {
    redirect("/login?callbackUrl=/account/orders");
  }
  redirect("/account/orders");
}
