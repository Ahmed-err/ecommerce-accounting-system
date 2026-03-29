import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import PDFDocument from "pdfkit";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const ip = await getClientIP();
  const allowed = await checkRateLimit(`invoice:${ip}`, 20, 60 * 60 * 1000, { failClosed: true });
  if (!allowed) return new Response("Rate limited", { status: 429 });

  const { id } = await params;
  const order = await db.order.findFirst({
    where: { id, userId: session.user.id },
    include: { items: { include: { product: true } }, invoice: true, user: true },
  });
  if (!order) return new Response("Not found", { status: 404 });

  const chunks = [];
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.on("data", (c) => chunks.push(c));

  doc.fontSize(18).text("Invoice", { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(11).text(`Order: #${order.id.slice(-8).toUpperCase()}`);
  doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
  doc.text(`Customer: ${order.guestName || order.user?.name || "-"}`);
  doc.moveDown(1);

  let subtotal = 0;
  order.items.forEach((item) => {
    const line = Number(item.price) * item.quantity;
    subtotal += line;
    doc.fontSize(10).text(`${item.product?.name || "Item"} x${item.quantity} - ${line.toFixed(2)}`);
  });

  const shipping = Number(order.shippingCost || 0);
  const discount = Number(order.invoice?.discountAmount || 0);
  const tax = Number(order.invoice?.taxAmount || 0);
  const total = Number(order.totalAmount || 0);

  doc.moveDown(1);
  doc.text(`Subtotal: ${subtotal.toFixed(2)}`);
  doc.text(`Discount: ${discount.toFixed(2)}`);
  doc.text(`Shipping: ${shipping.toFixed(2)}`);
  doc.text(`Tax: ${tax.toFixed(2)}`);
  doc.fontSize(12).text(`Grand Total: ${total.toFixed(2)}`);
  doc.end();

  const buffer = await new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${order.id.slice(-8)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
