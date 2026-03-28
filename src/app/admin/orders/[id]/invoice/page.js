import { prisma as db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import PrintButton from "@/components/common/PrintButton";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { STORE_VAT_NUMBER } from "@/lib/constants";

// Currency symbol - SDG for Sudanese Pound
const CURRENCY = "SDG";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  return { title: `Invoice - ${id.slice(-8).toUpperCase()} | ${t.brandName}` };
}

export default async function InvoicePage({ params }) {
  const session = await auth();
  const { id } = await params;

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  
  // Fetch order first to check ownership
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      invoice: true,
      user: true,
    },
  });

  if (!order || !order.invoice) return notFound();

  // Auth check: Staff can view any invoice, customers can only view their own
  const isStaff = session && ["ADMIN", "MANAGER", "CASHIER"].includes(session.user.role);
  const isOwner = session && order.userId === session.user.id;
  
  if (!isStaff && !isOwner) {
    return notFound(); // Hide existence of invoice from unauthorized users
  }

  const { invoice } = order;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white text-gray-100 print:text-black">
      
      {/* Non-Printable Controls */}
      <div className="w-[80mm] flex justify-between items-center mb-6 print:hidden">
        <Link 
          href="/admin/orders" 
          className="p-2 bg-gray-800 text-gray-300 hover:text-white rounded-lg transition-colors border border-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PrintButton />
      </div>

      {/* 80mm Thermal Receipt Container */}
      {/* 80mm is ~302px but safely we use max-w-[300px] or exactly 80mm class */}
      <div className="w-full max-w-[80mm] bg-white text-black p-4 rounded-xl shadow-2xl print:shadow-none print:rounded-none mx-auto font-mono text-sm">
        
        {/* Header Section */}
        <div className="text-center mb-4">
          <h1 className="text-xl font-black mb-1">
            {t.brandName}
          </h1>
          <p className="text-xs text-gray-600">Tax Invoice / الفاتورة الضريبية</p>
          <p className="text-xs text-gray-600">VAT: {STORE_VAT_NUMBER}</p>
          <div className="my-3 border-t border-dashed border-gray-400"></div>
        </div>

        {/* Invoice Meta */}
        <div className="text-xs space-y-1 mb-4">
          <div className="flex justify-between">
             <span className="text-gray-500">Invoice No:</span>
             <span className="font-bold">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
             <span className="text-gray-500">Order Ref:</span>
             <span className="font-bold">#{order.id.slice(-8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
             <span className="text-gray-500">Date:</span>
             <span className="font-bold">{new Date(invoice.issuedAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
             <span className="text-gray-500">Customer:</span>
             <span className="font-bold uppercase break-all text-right max-w-[120px]">
               {order.guestName || order.user?.name || 'Walk-in Guest'}
             </span>
          </div>
        </div>

        <div className="my-3 border-t border-dashed border-gray-400"></div>

        {/* Items Table Header */}
        <div className="flex text-xs font-bold text-gray-500 pb-2 mb-2 border-b border-gray-200">
           <div className="flex-1">ITEM</div>
           <div className="w-12 text-center">QTY</div>
           <div className="w-16 text-right">PRICE</div>
        </div>

        {/* Items List */}
        <div className="space-y-3 mb-4">
          {order.items.map((item) => (
            <div key={item.id} className="text-xs flex items-start">
               <div className="flex-1 pr-2">
                 <p className="font-bold line-clamp-2">{item.product.name}</p>
                 <p className="text-[10px] text-gray-500">{item.product.sku}</p>
               </div>
               <div className="w-12 text-center font-medium">x{item.quantity}</div>
               <div className="w-16 text-right font-medium">{(item.price * item.quantity).toFixed(2)} {CURRENCY}</div>
            </div>
          ))}
        </div>

        <div className="my-3 border-t border-dashed border-gray-400"></div>

        {/* Totals Section */}
        <div className="space-y-1 mb-4 text-xs font-bold">
           <div className="flex justify-between">
              <span className="text-gray-500">Subtotal:</span>
              <span>{(invoice.totalAmount - invoice.taxAmount - order.shippingCost).toFixed(2)} {CURRENCY}</span>
           </div>
           {order.shippingCost > 0 && (
             <div className="flex justify-between">
                <span className="text-gray-500">Shipping:</span>
                <span>{order.shippingCost.toFixed(2)} {CURRENCY}</span>
             </div>
           )}
           <div className="flex justify-between">
              <span className="text-gray-500">VAT (15%):</span>
              <span>{invoice.taxAmount.toFixed(2)} {CURRENCY}</span>
           </div>
           
           <div className="my-2 border-t border-black"></div>
           
           <div className="flex justify-between text-base">
              <span>TOTAL ({CURRENCY}):</span>
              <span>{invoice.totalAmount.toFixed(2)} {CURRENCY}</span>
           </div>
        </div>

        {/* Payment Meta */}
        <div className="text-center text-[10px] text-gray-500 mb-4 bg-gray-100 p-2 rounded">
           Via {order.paymentMethod.replace("_", " ")}
        </div>

        {/* QR Code */}
        {invoice.qrCode && (
          <div className="flex flex-col items-center justify-center mt-6 mb-4">
            <div className="w-32 h-32 relative">
               <Image 
                 src={invoice.qrCode} 
                 alt="Tax QR Code" 
                 fill
                 className="object-contain"
               />
            </div>
            <p className="text-[10px] text-gray-500 mt-2">Scan for e-Invoice details</p>
          </div>
        )}

        <div className="text-center mt-6 text-xs text-gray-800 font-bold">
          <p>{t.invoiceThankYou}</p>
          <p>{t.brandTagline}</p>
        </div>
        
      </div>

    </div>
  );
}
