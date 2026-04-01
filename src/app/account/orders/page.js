import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { translations } from "@/lib/translations";
import { listUserOrders } from "@/lib/user-orders";
import { Input } from "@/components/ui/input";

const STATUS = ["all", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage({ searchParams }) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, Number(params?.page || 1));
  const status = STATUS.includes(params?.status) ? params.status : "all";
  const search = params?.search || "";
  const dateFrom = params?.from || "";
  const dateTo = params?.to || "";

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang] || translations.en;
  const isRTL = lang === "ar";

  const { orders, total } = await listUserOrders(session.user.id, { page, status, search, dateFrom, dateTo, limit: 10 });
  const pages = Math.max(1, Math.ceil(total / 10));

  const statusClass = (s) =>
    s === "PENDING" ? "bg-amber-500/10 text-amber-500" :
    s === "SHIPPED" ? "bg-blue-500/10 text-blue-500" :
    s === "DELIVERED" ? "bg-emerald-500/10 text-emerald-500" :
    s === "CANCELLED" ? "bg-red-500/10 text-red-500" :
    "bg-muted text-foreground";

  return (
    <main className={`min-h-screen bg-background ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.myOrdersTitle}</h1>
          <p className="text-muted-foreground">{t.trackManageOrders}</p>
        </div>

        <form className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <Input name="search" defaultValue={search} placeholder={lang === "ar" ? "بحث برقم الطلب" : "Search order #"} />
          <select name="status" defaultValue={status} className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground">
            {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Input type="date" name="from" defaultValue={dateFrom} />
          <Input type="date" name="to" defaultValue={dateTo} />
          <button className="h-8 rounded-lg bg-primary text-primary-foreground text-sm">{lang === "ar" ? "تصفية" : "Filter"}</button>
        </form>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-border bg-card/30 p-12 text-center">
            <p className="font-semibold text-foreground">{t.noOrdersFound}</p>
            <Link href="/products" className="text-amber-500 text-sm">{t.startShopping}</Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm hidden md:table">
              <thead className="bg-muted/50 text-foreground">
                <tr>
                  <th className="p-3">{lang === "ar" ? "الطلب" : "Order"}</th>
                  <th>{lang === "ar" ? "التاريخ" : "Date"}</th>
                  <th>{lang === "ar" ? "المنتجات" : "Items"}</th>
                  <th>{lang === "ar" ? "الإجمالي" : "Total"}</th>
                  <th>{lang === "ar" ? "الدفع" : "Payment"}</th>
                  <th>{lang === "ar" ? "الحالة" : "Status"}</th>
                  <th>{lang === "ar" ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="p-3 font-mono">#{o.id.slice(-8).toUpperCase()}</td>
                    <td>{new Date(o.createdAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}</td>
                    <td>{o.items.length}</td>
                    <td>{o.totalAmount.toLocaleString()} {t.currency}</td>
                    <td>{o.paymentMethod.replaceAll("_", " ")}</td>
                    <td><span className={`px-2 py-1 rounded-full text-xs ${statusClass(o.status)}`}>{o.status}</span></td>
                    <td><Link href={`/account/orders/${o.id}`} className="text-amber-500">{lang === "ar" ? "عرض" : "View"}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="md:hidden divide-y divide-border">
              {orders.map((o) => (
                <Link href={`/account/orders/${o.id}`} key={o.id} className="block p-3">
                  <p className="font-mono text-sm">#{o.id.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span>{page} / {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={`?page=${page - 1}&status=${status}&search=${search}&from=${dateFrom}&to=${dateTo}`}>Prev</Link>}
            {page < pages && <Link href={`?page=${page + 1}&status=${status}&search=${search}&from=${dateFrom}&to=${dateTo}`}>Next</Link>}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
