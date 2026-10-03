import { describe, expect, it } from "vitest";
import { assertSafeSeedTarget } from "../../../prisma/seed/guard.js";

const local = "postgresql://postgres@localhost:55432/store_dev?schema=public";

describe("assertSafeSeedTarget", () => {
  it("allows localhost, 127.0.0.1 and ::1", () => {
    expect(assertSafeSeedTarget({ databaseUrl: local, env: {} })).toEqual({ host: "localhost", database: "store_dev" });
    expect(assertSafeSeedTarget({ databaseUrl: "postgresql://u:p@127.0.0.1:5432/x", env: {} }).host).toBe("127.0.0.1");
    expect(assertSafeSeedTarget({ databaseUrl: "postgresql://u:p@[::1]:5432/x", env: {} }).host).toBe("::1");
  });

  it("refuses a remote host such as a Neon production database", () => {
    expect(() =>
      assertSafeSeedTarget({
        databaseUrl: "postgresql://user:secret@ep-cool-name-123.us-east-2.aws.neon.tech/neondb?sslmode=require",
        env: {},
      })
    ).toThrow(/^Refusing to seed: host "ep-cool-name-123\.us-east-2\.aws\.neon\.tech" is not local/);
  });

  it("does not leak the password in the error message", () => {
    try {
      assertSafeSeedTarget({ databaseUrl: "postgresql://user:secret@db.example.com/prod", env: {} });
      throw new Error("expected throw");
    } catch (e) {
      expect((e as Error).message).not.toContain("secret");
    }
  });

  it("allows a remote host only when listed in SEED_ALLOWED_HOSTS", () => {
    const url = "postgresql://u:p@db.staging.internal:5432/x";
    expect(() => assertSafeSeedTarget({ databaseUrl: url, env: {} })).toThrow(/not local/);
    expect(assertSafeSeedTarget({ databaseUrl: url, env: { SEED_ALLOWED_HOSTS: "other, db.staging.internal" } }).host).toBe(
      "db.staging.internal"
    );
  });

  it("refuses in production or on Vercel even for localhost", () => {
    expect(() => assertSafeSeedTarget({ databaseUrl: local, env: { NODE_ENV: "production" } })).toThrow(/NODE_ENV=production/);
    expect(() => assertSafeSeedTarget({ databaseUrl: local, env: { VERCEL: "1" } })).toThrow(/Vercel/);
  });

  it("refuses a missing or malformed DATABASE_URL", () => {
    expect(() => assertSafeSeedTarget({ databaseUrl: undefined, env: {} })).toThrow(/DATABASE_URL is not set/);
    expect(() => assertSafeSeedTarget({ databaseUrl: "not a url", env: {} })).toThrow(/not a valid URL/);
  });
});
