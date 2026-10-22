import { describe, expect, it, vi } from "vitest";

const { unstable_cache } = vi.hoisted(() => ({
  unstable_cache: vi.fn((fn: unknown, _keys: unknown, _opts: unknown) => fn),
}));
vi.mock("next/cache", () => ({ unstable_cache, revalidateTag: vi.fn() }));

import { cachedQuery } from "@/lib/cached-query";
import { CACHE_TTL, MODEL_TAGS, TAGS, invalidateTags } from "@/lib/cache-tags";
import { revalidateTag } from "next/cache";

describe("cachedQuery", () => {
  it("wraps the loader with unstable_cache, tags and TTL", async () => {
    const load = vi.fn(async (x: number) => x * 2);
    const get = cachedQuery(load, ["k1"], { tags: [TAGS.catalog], revalidate: CACHE_TTL.catalog });
    expect(unstable_cache).toHaveBeenCalledWith(load, ["k1"], { tags: ["catalog"], revalidate: 3600 });
    expect(await get(2)).toBe(4);
  });

  it("reads directly when there is no Next.js request cache (scripts, tests)", async () => {
    unstable_cache.mockImplementationOnce(() => async () => {
      throw new Error("Invariant: incrementalCache missing in unstable_cache");
    });
    const get = cachedQuery(async () => "fresh", ["k2"], { tags: ["t"], revalidate: 1 });
    expect(await get()).toBe("fresh");
  });

  it("does not swallow the loader's own errors", async () => {
    unstable_cache.mockImplementationOnce((fn: unknown) => fn);
    const get = cachedQuery(async () => Promise.reject(new Error("db down")), ["k3"], { tags: ["t"], revalidate: 1 });
    await expect(get()).rejects.toThrow("db down");
  });
});

describe("cache tags", () => {
  it("clears catalog, stock and homepage on product writes (POS stock, storefront)", () => {
    expect(MODEL_TAGS.Product).toEqual(expect.arrayContaining([TAGS.catalog, TAGS.stock, TAGS.homepage]));
  });

  it("clears the auth user cache on user writes (deactivation, role, password)", () => {
    expect(MODEL_TAGS.User).toContain(TAGS.authUsers);
  });

  it("expires tags immediately and never throws", () => {
    vi.mocked(revalidateTag).mockImplementationOnce(() => {
      throw new Error("outside request");
    });
    expect(() => invalidateTags(["a", "b"])).not.toThrow();
    expect(revalidateTag).toHaveBeenCalledWith("b", { expire: 0 });
  });
});
