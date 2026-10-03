import bcrypt from "bcryptjs";
import { PERMISSION_MODULES, getDefaultPermissionFlags } from "../../src/lib/permission-defaults.js";

const USERS = [
  { email: "admin@powerstore.com", password: "admin123", firstName: "Ahmed", lastName: "Admin", phone: "+249900000001", role: "ADMIN", salary: 450000, hireDate: "2024-01-01", department: "Management" },
  { email: "manager@powerstore.com", password: "manager123", firstName: "Omar", lastName: "Ali", phone: "+249900000002", role: "MANAGER", salary: 300000, hireDate: "2024-03-01", department: "Operations" },
  { email: "cashier@powerstore.com", password: "cashier123", firstName: "Sara", lastName: "Hassan", phone: "+249900000003", role: "CASHIER", salary: 180000, hireDate: "2024-06-15", department: "Sales" },
  { email: "customer@example.com", password: "customer123", firstName: "Mohamed", lastName: "Khaled", phone: "+249900000004", role: "CUSTOMER" },
  // Accounts used by the Playwright suite (tests/e2e/global-setup.ts)
  { email: "admin@test.local", password: "Admin123!", firstName: "E2E", lastName: "Admin", phone: "+249900000005", role: "ADMIN" },
  { email: "customer@test.local", password: "Customer123!", firstName: "E2E", lastName: "Customer", phone: "+249900000006", role: "CUSTOMER" },
];

export async function seedUsers(prisma) {
  const created = {};
  for (const u of USERS) {
    const { password, hireDate, ...rest } = u;
    created[u.email] = await prisma.user.create({
      data: { ...rest, password: await bcrypt.hash(password, 10), hireDate: hireDate ? new Date(hireDate) : undefined },
    });
  }
  for (const role of ["ADMIN", "MANAGER", "CASHIER"]) {
    for (const mod of PERMISSION_MODULES) {
      await prisma.permission.create({ data: { role, module: mod, ...getDefaultPermissionFlags(role, mod) } });
    }
  }
  console.log(`   ✓ ${USERS.length} users, role permissions`);
  return { admin: created["admin@powerstore.com"], customer: created["customer@example.com"] };
}
