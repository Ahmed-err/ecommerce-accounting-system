// Coupon, accounting transactions, banners, offer, FAQ, about features and
// legal pages. Moved as-is from the original prisma/seed.js.

import { HERO_BANNER_SEED_DATA } from "../../src/lib/hero-defaults.js";
import { DEFAULT_TERMS_AR, DEFAULT_TERMS_EN, DEFAULT_PRIVACY_AR, DEFAULT_PRIVACY_EN } from "../../src/lib/legal-defaults.js";

export async function seedContent(prisma) {
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
            image: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?auto=format&fit=crop&w=1600&q=85",
            ctaTextAr: "احصل على العرض",
            ctaTextEn: "Get Offer",
            ctaLink: "/products",
            expiresAt: new Date(Date.now() + 30 * 86400000)
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
    });

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
        });

    await prisma.legalPage
        .createMany({
            data: [
                { type: "TERMS", contentAr: DEFAULT_TERMS_AR, contentEn: DEFAULT_TERMS_EN },
                { type: "PRIVACY", contentAr: DEFAULT_PRIVACY_AR, contentEn: DEFAULT_PRIVACY_EN },
            ],
        });
}
