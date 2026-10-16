import { describe, expect, it } from "vitest";
import { orderByDependencies } from "@/lib/backup";

describe("backup table order", () => {
  it("puts every table after the tables it points to", () => {
    const tables = ["NotificationConfig", "Order", "OrderItem", "Product", "Store", "User"];
    const fks = [
      { child: "NotificationConfig", parent: "Store" },
      { child: "Order", parent: "User" },
      { child: "OrderItem", parent: "Order" },
      { child: "OrderItem", parent: "Product" },
    ];
    const order = orderByDependencies(tables, fks);
    const before = (a: string, b: string) => order.indexOf(a) < order.indexOf(b);
    expect(order).toHaveLength(tables.length);
    expect(before("Store", "NotificationConfig")).toBe(true);
    expect(before("User", "Order")).toBe(true);
    expect(before("Order", "OrderItem")).toBe(true);
    expect(before("Product", "OrderItem")).toBe(true);
  });

  it("ignores a table pointing to itself and keeps tables in a cycle", () => {
    const order = orderByDependencies(["A", "B", "Category"], [
      { child: "Category", parent: "Category" },
      { child: "A", parent: "B" },
      { child: "B", parent: "A" },
    ]);
    expect(order).toEqual(["Category", "A", "B"]);
  });
});
