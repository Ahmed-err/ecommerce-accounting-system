import { canOpen, staffHome, isStaff, accessTable } from "@/lib/staff-access";

describe("staff-access", () => {
  it("admin opens every staff area", () => {
    for (const p of ["/admin", "/admin/accounting", "/admin/employees/123", "/admin/settings", "/pos"]) {
      expect(canOpen("ADMIN", p)).toBe(true);
    }
  });

  it("manager: dashboard, inventory, orders; not accounting, employees, settings, coupons", () => {
    expect(canOpen("MANAGER", "/admin")).toBe(true);
    expect(canOpen("MANAGER", "/admin/inventory")).toBe(true);
    expect(canOpen("MANAGER", "/admin/orders/abc")).toBe(true);
    for (const p of ["/admin/accounting", "/admin/employees", "/admin/settings", "/admin/coupons"]) {
      expect(canOpen("MANAGER", p)).toBe(false);
    }
  });

  it("cashier: orders, POS and inventory (receive only)", () => {
    expect(canOpen("CASHIER", "/admin/orders")).toBe(true);
    expect(canOpen("CASHIER", "/pos")).toBe(true);
    expect(canOpen("CASHIER", "/admin")).toBe(false);
    expect(canOpen("CASHIER", "/admin/inventory")).toBe(true);
    expect(canOpen("CASHIER", "/admin/suppliers")).toBe(false);
  });

  it("matches whole path segments only", () => {
    expect(canOpen("MANAGER", "/admin/ordersx")).toBe(false);
  });

  it("unknown admin pages are admin-only", () => {
    expect(canOpen("MANAGER", "/admin/something-new")).toBe(false);
    expect(canOpen("ADMIN", "/admin/something-new")).toBe(true);
  });

  it("customers and guests open nothing", () => {
    expect(canOpen("CUSTOMER", "/admin/orders")).toBe(false);
    expect(canOpen(undefined, "/pos")).toBe(false);
    expect(isStaff("CUSTOMER")).toBe(false);
    expect(isStaff("CASHIER")).toBe(true);
  });

  it("home page per role", () => {
    expect(staffHome("ADMIN")).toBe("/admin");
    expect(staffHome("MANAGER")).toBe("/admin");
    expect(staffHome("CASHIER")).toBe("/admin/orders");
    expect(staffHome("CUSTOMER")).toBe("/");
  });

  it("access table lists every area with the roles that open it", () => {
    const rows = accessTable();
    const accounting = rows.find((r) => r.key === "accounting");
    expect(accounting).toMatchObject({ ADMIN: true, MANAGER: false, CASHIER: false });
    expect(rows.find((r) => r.key === "pos")).toMatchObject({ ADMIN: true, MANAGER: true, CASHIER: true });
  });
});
