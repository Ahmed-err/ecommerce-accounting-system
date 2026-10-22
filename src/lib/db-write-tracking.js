import { AsyncLocalStorage } from "node:async_hooks";

// Clears cache tags after database writes, from one place, so no mutation can forget to.
// A write outside a transaction clears its tags as soon as it returns. Writes inside
// prisma.$transaction are collected and cleared only after the transaction commits:
// clearing earlier would let a concurrent read re-cache the pre-commit rows.

const WRITE_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
]);

export function isWriteOperation(operation) {
  return WRITE_OPERATIONS.has(operation);
}

/**
 * @param {Record<string, string[]>} modelTags model name -> tags its writes clear
 * @param {(tags: Iterable<string>) => void} invalidate
 */
export function createWriteTracker(modelTags, invalidate) {
  const pending = new AsyncLocalStorage();

  function noteWrite(model) {
    const tags = modelTags[model];
    if (!tags?.length) return;
    const inTransaction = pending.getStore();
    if (inTransaction) {
      for (const tag of tags) inTransaction.add(tag);
    } else {
      invalidate(tags);
    }
  }

  // Prisma client extension: runs every model query and notes the writes.
  const extension = {
    name: "cache-invalidation",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const result = await query(args);
          if (isWriteOperation(operation)) noteWrite(model);
          return result;
        },
      },
    },
  };

  // Wraps a client so $transaction clears the collected tags after it commits.
  function withCommitInvalidation(client) {
    return new Proxy(client, {
      get(target, prop) {
        const value = Reflect.get(target, prop);
        if (prop === "$transaction") {
          return async (...args) => {
            if (pending.getStore()) return value.apply(target, args);
            const tags = new Set();
            const result = await pending.run(tags, () => value.apply(target, args));
            if (tags.size) invalidate(tags);
            return result;
          };
        }
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }

  return { extension, noteWrite, withCommitInvalidation };
}
