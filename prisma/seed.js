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

import { PrismaClient } from "../src/generated/prisma/client.ts";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

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
    await prisma.transaction.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    console.log("   ✓ Cleared old data");

    // === 2. CREATE ADMIN USER ===
    const admin = await prisma.user.create({
        data: {
            email: "admin@powerstore.com",
            password: "admin123", // TODO: Hash this in Step 4 (Authentication)
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
            password: "cashier123",
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
            password: "manager123",
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
            password: "customer123",
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

    // === 6. CREATE PRODUCTS ===
    const productsData = [
        { name: "LED Panel Light 60W", description: "Ultra-slim LED panel light, 60W, warm white", sku: "LED-PNL-60W", purchasePrice: 25.00, sellingPrice: 45.99, stock: 50, minStock: 10, images: ["/images/products/led-panel.jpg"], categoryId: categories[0].id },
        { name: "Smart LED Bulb RGB", description: "WiFi-enabled smart LED bulb with RGB color control", sku: "LED-SMART-RGB", purchasePrice: 8.00, sellingPrice: 18.99, stock: 200, minStock: 20, images: ["/images/products/smart-bulb.jpg"], categoryId: categories[0].id },
        { name: "Industrial Cable 100m", description: "Heavy-duty industrial cable, 100m roll, 2.5mm²", sku: "CBL-IND-100M", purchasePrice: 55.00, sellingPrice: 89.99, stock: 30, minStock: 5, images: ["/images/products/industrial-cable.jpg"], categoryId: categories[1].id },
        { name: "Ethernet Cable Cat6 50m", description: "High-speed Cat6 ethernet cable, 50m, shielded", sku: "CBL-ETH-CAT6", purchasePrice: 12.00, sellingPrice: 24.99, stock: 100, minStock: 15, images: ["/images/products/ethernet-cable.jpg"], categoryId: categories[1].id },
        { name: "Smart Switch 3-Gang", description: "Touch-sensitive smart wall switch, 3-gang, WiFi", sku: "SW-SMART-3G", purchasePrice: 18.00, sellingPrice: 34.99, stock: 75, minStock: 10, images: ["/images/products/smart-switch.jpg"], categoryId: categories[2].id },
        { name: "Circuit Breaker 32A", description: "Miniature circuit breaker, 32A, single pole", sku: "CB-MCB-32A", purchasePrice: 12.00, sellingPrice: 24.99, stock: 120, minStock: 20, images: ["/images/products/circuit-breaker.jpg"], categoryId: categories[5].id },
        { name: "Power Inverter 3000W", description: "Pure sine wave power inverter, 3000W, 24V DC", sku: "PWR-INV-3000", purchasePrice: 180.00, sellingPrice: 299.99, stock: 15, minStock: 3, images: ["/images/products/inverter.jpg"], categoryId: categories[4].id },
        { name: "Voltage Tester Pro", description: "Non-contact voltage tester with LED indicator", sku: "TL-VTESTER", purchasePrice: 15.00, sellingPrice: 29.99, stock: 90, minStock: 10, images: ["/images/products/voltage-tester.jpg"], categoryId: categories[5].id },
    ];
    const products = [];
    for (const prod of productsData) {
        const created = await prisma.product.create({ data: prod });
        products.push(created);
    }
    console.log("   ✓ Created", products.length, "products");

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
                    { productId: products[4].id, quantity: 1, price: 34.99 },
                ],
            },
        },
    });
    console.log("   ✓ Created sample order");

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
