describe("integration/prisma/transactions", () => {
  it("order creation transaction all-or-nothing shape", async () => {
    if (process.env.RUN_DB_TESTS !== "1") {
      expect(true).toBe(true);
      return;
    }
    const { testPrisma, createTestProduct } = await import("../../helpers/db");
    const p = await createTestProduct({ stock: 5 });
    await testPrisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: p.id }, data: { stock: { decrement: 2 } } });
      await tx.transaction.create({
        data: {
          type: "INCOMING",
          amount: 300,
          description: "Order #TX",
          category: "Sales",
        },
      });
    });
    const fresh = await testPrisma.product.findUnique({ where: { id: p.id } });
    expect(fresh?.stock).toBe(3);
  });

  it("rollback keeps db unchanged on failure", async () => {
    if (process.env.RUN_DB_TESTS !== "1") {
      expect(true).toBe(true);
      return;
    }
    const { testPrisma, createTestProduct } = await import("../../helpers/db");
    const p = await createTestProduct({ stock: 2 });
    await expect(
      testPrisma.$transaction(async (tx) => {
        await tx.product.update({ where: { id: p.id }, data: { stock: { decrement: 1 } } });
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
    const fresh = await testPrisma.product.findUnique({ where: { id: p.id } });
    expect(fresh?.stock).toBe(2);
  });
});
