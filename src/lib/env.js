const requiredInProd = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "NEXT_PUBLIC_URL",
];

let validated = false;

export function validateEnv() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }
  if (validated) return;

  const missing = requiredInProd.filter((key) => {
    const value = process.env[key];
    return !value || !String(value).trim();
  });

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  validated = true;
}
