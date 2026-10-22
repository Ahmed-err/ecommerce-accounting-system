import { describe, expect, it, vi } from "vitest";
import { createWriteTracker, isWriteOperation } from "@/lib/db-write-tracking";

const MODEL_TAGS = { Product: ["catalog", "stock"], Store: ["branding"] };

function setup() {
  const invalidate = vi.fn();
  const tracker = createWriteTracker(MODEL_TAGS, invalidate);
  const op = tracker.extension.query.$allModels.$allOperations;
  const run = (model: string, operation: string) =>
    op({ model, operation, args: {}, query: async () => ({ ok: true }) });
  // Minimal client: $transaction runs the callback (interactive) or awaits an array.
  const client = {
    marker: "base",
    async $transaction(arg: unknown) {
      if (typeof arg === "function") return (arg as (tx: unknown) => unknown)({});
      return Promise.all(arg as Promise<unknown>[]);
    },
    whoAmI() {
      return this.marker;
    },
  };
  const db = tracker.withCommitInvalidation(client);
  return { invalidate, run, db };
}

describe("db write tracking", () => {
  it("classifies write operations", () => {
    expect(isWriteOperation("update")).toBe(true);
    expect(isWriteOperation("upsert")).toBe(true);
    expect(isWriteOperation("deleteMany")).toBe(true);
    expect(isWriteOperation("findMany")).toBe(false);
    expect(isWriteOperation("count")).toBe(false);
  });

  it("clears a model's tags right after a write outside a transaction", async () => {
    const { invalidate, run } = setup();
    await run("Product", "update");
    expect(invalidate).toHaveBeenCalledWith(["catalog", "stock"]);
  });

  it("ignores reads and models without tags", async () => {
    const { invalidate, run } = setup();
    await run("Product", "findMany");
    await run("AuditLog", "create");
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("does not clear tags when the write fails", async () => {
    const invalidate = vi.fn();
    const op = createWriteTracker(MODEL_TAGS, invalidate).extension.query.$allModels.$allOperations;
    await expect(
      op({ model: "Product", operation: "update", args: {}, query: async () => Promise.reject(new Error("P2025")) })
    ).rejects.toThrow("P2025");
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("defers clearing until an interactive transaction commits", async () => {
    const { invalidate, run, db } = setup();
    await db.$transaction(async () => {
      await run("Product", "update");
      await run("Store", "update");
      expect(invalidate).not.toHaveBeenCalled();
    });
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect([...invalidate.mock.calls[0][0]].sort()).toEqual(["branding", "catalog", "stock"]);
  });

  it("clears nothing when the transaction rolls back", async () => {
    const { invalidate, run, db } = setup();
    await expect(
      db.$transaction(async () => {
        await run("Product", "update");
        throw new Error("rollback");
      })
    ).rejects.toThrow("rollback");
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("does not call invalidate for a transaction without tagged writes", async () => {
    const { invalidate, run, db } = setup();
    await db.$transaction(async () => {
      await run("AuditLog", "create");
    });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("passes other client members through, bound to the real client", () => {
    const { db } = setup();
    expect(db.marker).toBe("base");
    const fn = db.whoAmI;
    expect(fn()).toBe("base");
  });
});
