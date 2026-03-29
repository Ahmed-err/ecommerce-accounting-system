// =============================================
// SEED SCRIPT — Fills the Database with Sample Data
// =============================================
//
// RUN THIS WITH: npx prisma db seed
//
// WHY SEED?
// An empty database is useless for development. This script creates:
// - An admin user (so you can log into the dashboard)
// - Product categories (Lighting, Cables, etc.)
// - Sample products with realistic data
// - Sample accounting transactions

import "dotenv/config";
// ☝️ Load environment variables from .env file

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { HERO_BANNER_SEED_DATA } from "../src/lib/hero-defaults.js";
import {
    DEFAULT_TERMS_AR,
    DEFAULT_TERMS_EN,
    DEFAULT_PRIVACY_AR,
    DEFAULT_PRIVACY_EN,
} from "../src/lib/legal-defaults.js";

// ☝️ Import from our generated Prisma client (tsx handles the .ts import)

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
// ☝️ Prisma v7 requires an adapter like PrismaPg to connect to the database.

async function main() {
    console.log("🌱 Seeding database...");

    // === 1. CLEAR EXISTING DATA (reverse dependency order) ===
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.purchaseItem.deleteMany().catch(() => {});
    await prisma.purchase.deleteMany().catch(() => {});
    await prisma.contactMessage.deleteMany().catch(() => {});
    await prisma.faq.deleteMany().catch(() => {});
    await prisma.legalPage.deleteMany().catch(() => {});
    await prisma.aboutFeature.deleteMany().catch(() => {});
    await prisma.teamMember.deleteMany().catch(() => {});
    await prisma.stockMovement.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.userAddress.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.product.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.banner.deleteMany();
    await prisma.offer.deleteMany();
    console.log("   ✓ Cleared old data");

    // === 2. CREATE ADMIN USER ===
    const admin = await prisma.user.create({
        data: {
            email: "admin@powerstore.com",
            password: await bcrypt.hash("admin123", 10),
            firstName: "Ahmed",
            lastName: "Admin",
            phone: "+20 123 456 7890",
            role: "ADMIN",
            salary: 15000,
            hireDate: new Date("2024-01-01"),
            department: "Management",
        },
    });
    console.log("   ✓ Created admin user:", admin.email);

    // === 3. CREATE EMPLOYEE USERS ===
    await prisma.user.create({
        data: {
            email: "cashier@powerstore.com",
            password: await bcrypt.hash("cashier123", 10),
            firstName: "Sara",
            lastName: "Hassan",
            phone: "+20 111 222 3333",
            role: "CASHIER",
            salary: 6000,
            hireDate: new Date("2024-06-15"),
            department: "Sales",
        },
    });

    await prisma.user.create({
        data: {
            email: "manager@powerstore.com",
            password: await bcrypt.hash("manager123", 10),
            firstName: "Omar",
            lastName: "Ali",
            phone: "+20 100 200 3000",
            role: "MANAGER",
            salary: 10000,
            hireDate: new Date("2024-03-01"),
            department: "Operations",
        },
    });
    console.log("   ✓ Created employee users");

    // === 4. CREATE CUSTOMER USER ===
    const customer = await prisma.user.create({
        data: {
            email: "customer@example.com",
            password: await bcrypt.hash("customer123", 10),
            firstName: "Mohamed",
            lastName: "Khaled",
            phone: "+20 155 666 7777",
            role: "CUSTOMER",
        },
    });
    console.log("   ✓ Created customer user");

    // === 5. CREATE CATEGORIES ===
    const categories = [];
    const catData = [
        { name: "Lighting", description: "LED panels, bulbs, fixtures, and smart lighting solutions", image: "/images/categories/lighting.jpg" },
        { name: "Cables & Wires", description: "Power cables, data cables, and fiber optic wiring", image: "/images/categories/cables.jpg" },
        { name: "Switches & Sockets", description: "Wall switches, power sockets, dimmers, and smart controls", image: "/images/categories/switches.jpg" },
        { name: "Connectors", description: "Plugs, adapters, junction boxes, and terminal blocks", image: "/images/categories/connectors.jpg" },
        { name: "Power Systems", description: "Generators, UPS units, inverters, and power distribution", image: "/images/categories/power.jpg" },
        { name: "Safety Gear", description: "Circuit breakers, fuses, PPE, and safety equipment", image: "/images/categories/safety.jpg" },
    ];
    for (const cat of catData) {
        const created = await prisma.category.create({ data: cat });
        categories.push(created);
    }
    console.log("   ✓ Created", categories.length, "categories");

    const supplierA = await prisma.supplier.create({
        data: { name: "Khartoum Electrical Wholesale", phone: "+249912345678" },
    });
    const supplierB = await prisma.supplier.create({
        data: { name: "Red Sea Cables Ltd", phone: "+249987654321" },
    });
    console.log("   ✓ Created sample suppliers");

    // === 6. CREATE PRODUCTS ===
    const productsData = [
        { name: "LED Panel Light 60W", nameEn: "LED Panel Light 60W", nameAr: "كشاف LED لوح ٦٠ واط", description: "Ultra-slim LED panel light, 60W, warm white", sku: "LED-PNL-60W", barcode: "6281234567890", unit: "pcs", purchasePrice: 25.00, sellingPrice: 45.99, stock: 50, minStock: 10, images: ["/images/products/led-panel.png"], categoryId: categories[0].id, supplierId: supplierA.id },
        { name: "Smart Switch 3-Gang", nameEn: "Smart Switch 3-Gang", nameAr: "مفتاح ذكي ٣ خطوط", description: "Touch-sensitive smart wall switch, 3-gang, WiFi", sku: "SW-SMART-3G", barcode: "6281234567891", unit: "pcs", purchasePrice: 18.00, sellingPrice: 34.99, stock: 75, minStock: 10, images: ["/images/products/smart-switch.png"], categoryId: categories[2].id, supplierId: supplierA.id },
        { name: "Industrial Cable 100m", nameEn: "Industrial Cable 100m", nameAr: "كابل صناعي ١٠٠ م", description: "Heavy-duty industrial cable, 100m roll, 2.5mm²", sku: "CBL-IND-100M", barcode: "6281234567892", unit: "roll", purchasePrice: 55.00, sellingPrice: 89.99, stock: 30, minStock: 5, images: ["/images/home/hero-cables.png"], categoryId: categories[1].id, supplierId: supplierB.id },
        { name: "Smart LED Bulb RGB", nameEn: "Smart LED Bulb RGB", nameAr: "لمبة LED ذكية RGB", description: "WiFi-enabled smart LED bulb with RGB color control", sku: "LED-SMART-RGB", barcode: "6281234567893", unit: "pcs", purchasePrice: 8.00, sellingPrice: 18.99, stock: 200, minStock: 20, images: ["/images/products/smartbulb.jpg"], categoryId: categories[0].id, supplierId: supplierA.id },
        { name: "Ethernet Cable Cat6 50m", nameEn: "Ethernet Cable Cat6 50m", nameAr: "كابل إيثرنت Cat6 ٥٠ م", description: "High-speed Cat6 ethernet cable, 50m, shielded", sku: "CBL-ETH-CAT6", barcode: "6281234567894", unit: "roll", purchasePrice: 12.00, sellingPrice: 24.99, stock: 100, minStock: 15, images: ["/images/products/ethernet.jpg"], categoryId: categories[1].id, supplierId: supplierB.id },
        { name: "Circuit Breaker 32A", nameEn: "Circuit Breaker 32A", nameAr: "قاطع دائرة ٣٢ أمبير", description: "Miniature circuit breaker, 32A, single pole", sku: "CB-MCB-32A", barcode: "6281234567895", unit: "pcs", purchasePrice: 12.00, sellingPrice: 24.99, stock: 120, minStock: 20, images: ["/images/products/circuit.jpg"], categoryId: categories[5].id, supplierId: supplierA.id },
        { name: "Power Inverter 3000W", nameEn: "Power Inverter 3000W", nameAr: "عاكس طاقة ٣٠٠٠ واط", description: "Pure sine wave power inverter, 3000W, 24V DC", sku: "PWR-INV-3000", barcode: "6281234567896", unit: "pcs", purchasePrice: 180.00, sellingPrice: 299.99, stock: 15, minStock: 3, images: ["/images/products/inverter.jpg"], categoryId: categories[4].id, supplierId: supplierB.id },
        { name: "Voltage Tester Pro", nameEn: "Voltage Tester Pro", nameAr: "فاحص جهد احترافي", description: "Non-contact voltage tester with LED indicator", sku: "TL-VTESTER", barcode: "6281234567897", unit: "pcs", purchasePrice: 15.00, sellingPrice: 29.99, stock: 90, minStock: 10, images: ["/images/categories/safety.jpg"], categoryId: categories[5].id, supplierId: supplierA.id },
    ];
    const products = [];
    for (const prod of productsData) {
        const created = await prisma.product.create({ data: prod });
        products.push(created);
    }
    console.log("   ✓ Created", products.length, "products");

    await prisma.coupon.create({
        data: {
            code: "SAVE10",
            percentOff: 10,
            isActive: true,
        },
    });
    console.log("   ✓ Created sample coupon SAVE10");

    // === 7. CREATE SAMPLE TRANSACTIONS (Accounting) ===
    const txnData = [
        { type: "INCOMING", amount: 4500.00, description: "Daily sales revenue - Monday", category: "Sales", reference: "SALE-2024-001", date: new Date("2024-12-01") },
        { type: "INCOMING", amount: 3200.00, description: "Daily sales revenue - Tuesday", category: "Sales", reference: "SALE-2024-002", date: new Date("2024-12-02") },
        { type: "INCOMING", amount: 5800.00, description: "Bulk order - Al-Nour Construction", category: "Sales", reference: "SALE-2024-003", date: new Date("2024-12-03") },
        { type: "OUTGOING", amount: 15000.00, description: "Monthly rent payment", category: "Rent", reference: "RENT-DEC-2024", date: new Date("2024-12-01") },
        { type: "OUTGOING", amount: 6000.00, description: "Salary - Sara Hassan (Cashier)", category: "Salary", reference: "SAL-DEC-001", date: new Date("2024-12-01") },
        { type: "OUTGOING", amount: 10000.00, description: "Salary - Omar Ali (Manager)", category: "Salary", reference: "SAL-DEC-002", date: new Date("2024-12-01") },
        { type: "OUTGOING", amount: 2500.00, description: "Electricity bill - December", category: "Utilities", reference: "UTIL-DEC-001", date: new Date("2024-12-05") },
        { type: "OUTGOING", amount: 8500.00, description: "Stock purchase - LED panels", category: "Inventory", reference: "PO-2024-015", date: new Date("2024-12-03") },
    ];
    for (const txn of txnData) {
        await prisma.transaction.create({ data: txn });
    }
    console.log("   ✓ Created", txnData.length, "sample transactions");

    // === 8. CREATE A SAMPLE ORDER ===
    await prisma.order.create({
        data: {
            userId: customer.id,
            status: "DELIVERED",
            totalAmount: 135.97,
            items: {
                create: [
                    { productId: products[0].id, quantity: 2, price: 45.99 },
                    { productId: products[1].id, quantity: 1, price: 34.99 },
                ],
            },
        },
    });
    console.log("   ✓ Created sample order");

    // === 9. CREATE BANNERS & OFFERS ===
    await prisma.banner.createMany({
        data: HERO_BANNER_SEED_DATA,
    });

    await prisma.offer.create({
        data: {
            titleAr: "عرض العام الجديد",
            titleEn: "New Year Special",
            subtitleAr: "خصم 25% على جميع المحولات",
            subtitleEn: "25% OFF on all inverters",
            image: "/images/home/promo-offer.png",
            ctaTextAr: "احصل على العرض",
            ctaTextEn: "Get Offer",
            ctaLink: "/products",
            expiresAt: new Date("2024-12-31T23:59:59Z")
        }
    });
    console.log("   ✓ Created banners and offers");

    await prisma.faq.createMany({
        data: [
            {
                questionAr: "ما هي ساعات العمل؟",
                questionEn: "What are your business hours?",
                answerAr: "نعمل من السبت إلى الخميس، ويمكنك مراجعة ساعات العمل المحدثة في صفحة التواصل.",
                answerEn: "We operate Saturday–Thursday; see this page for current hours from store settings.",
                sortOrder: 1,
            },
            {
                questionAr: "كيف أتتبع طلبي؟",
                questionEn: "How do I track my order?",
                answerAr: "استخدم صفحة تتبع الطلب برقم الطلب أو من حسابك تحت طلباتي.",
                answerEn: "Use the track order page with your order ID or check My Orders when logged in.",
                sortOrder: 2,
            },
            {
                questionAr: "هل تتوفر شحن لجميع المدن؟",
                questionEn: "Do you ship to all cities?",
                answerAr: "مناطق الشحن والتكلفة تظهر عند إتمام الطلب حسب إعدادات المتجر.",
                answerEn: "Shipping zones and fees are shown at checkout based on store settings.",
                sortOrder: 3,
            },
            {
                questionAr: "ما هي سياسة الإرجاع؟",
                questionEn: "What is your return policy?",
                answerAr: "تواصل معنا لمعرفة شروط الإرجاع حسب نوع المنتج وحالة العبوة.",
                answerEn: "Contact us for return conditions depending on product type and packaging.",
                sortOrder: 4,
            },
        ],
    }).catch(() => console.log("   (FAQ seed skipped if table missing)"));

    await prisma.aboutFeature
        .createMany({
            data: [
                {
                    titleAr: "منتجات موثوقة",
                    titleEn: "Quality products",
                    descAr: "معدات كهربائية مختارة بعناية للاستخدام المنزلي والمهني.",
                    descEn: "Carefully selected electrical equipment for home and professional use.",
                    iconKey: "Package",
                    sortOrder: 0,
                },
                {
                    titleAr: "فريق خبير",
                    titleEn: "Expert team",
                    descAr: "نرشدك لاختيار القطعة المناسبة لمشروعك.",
                    descEn: "We guide you to the right parts for your project.",
                    iconKey: "Users",
                    sortOrder: 1,
                },
                {
                    titleAr: "توصيل سريع",
                    titleEn: "Fast delivery",
                    descAr: "نسعى لتسليم الطلبات بأمان وفق مناطق الشحن.",
                    descEn: "We aim to deliver orders safely within our shipping zones.",
                    iconKey: "Truck",
                    sortOrder: 2,
                },
                {
                    titleAr: "دعم ما بعد البيع",
                    titleEn: "After-sales support",
                    descAr: "نواصل مساعدتك بعد الشراء.",
                    descEn: "We stay available after your purchase.",
                    iconKey: "Headphones",
                    sortOrder: 3,
                },
            ],
        })
        .catch(() => console.log("   (AboutFeature seed skipped if table missing)"));

    await prisma.legalPage
        .createMany({
            data: [
                { type: "TERMS", contentAr: DEFAULT_TERMS_AR, contentEn: DEFAULT_TERMS_EN },
                { type: "PRIVACY", contentAr: DEFAULT_PRIVACY_AR, contentEn: DEFAULT_PRIVACY_EN },
            ],
        })
        .catch(() => console.log("   (LegalPage seed skipped if table missing)"));

    console.log("\n✅ Database seeded successfully!");
    console.log("   Admin login: admin@powerstore.com / admin123");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end(); // Wait for the pool to close so the script doesn't hang
    });
