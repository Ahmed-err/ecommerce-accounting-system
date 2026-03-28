import { auth } from "@/auth";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const brand = lang === "ar" ? "أعمال عصام نصرالدين للأدوات الكهربائية" : "Essam Nasreddin Electrical Tools";

  return {
    title: lang === "ar" ? `نقطة البيع | ${brand}` : `POS | ${brand}`,
    description: lang === "ar" ? "واجهة نقطة البيع" : "Point of Sale Terminal",
  };
}

export default async function POSLayout({ children }) {
  const session = await auth();

  // Strict check: Only Admin, Manager, and Cashier can access POS
  if (!session || !["ADMIN", "MANAGER", "CASHIER"].includes(session.user.role)) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {/* Clean layout specifically for POS Terminal (no generic headers/footers) */}
      <main className="h-screen w-full flex flex-col">
        {children}
      </main>
    </div>
  );
}
