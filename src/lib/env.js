// Each entry is satisfied by any one of its names (the site URL has two accepted names).
const requiredInProd = [["DATABASE_URL"], ["AUTH_SECRET"], ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_URL"]];

let validated = false;

export function validateEnv() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }
  if (validated) return;

  const missing = requiredInProd.filter((names) => !names.some((key) => String(process.env[key] || "").trim()));

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.map((n) => n.join(" or ")).join(", ")}`);
  }
  validated = true;
}
