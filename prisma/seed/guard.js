// The seed wipes every table. This guard makes sure it can only ever run
// against a local database, never production.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function refuse(reason) {
  throw new Error(`Refusing to seed: ${reason}`);
}

export function assertSafeSeedTarget({ databaseUrl, env }) {
  if (env.NODE_ENV === "production") refuse("NODE_ENV=production.");
  if (env.VERCEL) refuse("running on Vercel.");
  if (!databaseUrl) refuse("DATABASE_URL is not set.");

  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    refuse("DATABASE_URL is not a valid URL.");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const allowed = new Set([
    ...LOCAL_HOSTS,
    ...String(env.SEED_ALLOWED_HOSTS || "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean),
  ]);
  if (!allowed.has(host)) {
    refuse(`host "${host}" is not local. Add it to SEED_ALLOWED_HOSTS only if it is a disposable database.`);
  }

  return { host, database: url.pathname.replace(/^\//, "") };
}
