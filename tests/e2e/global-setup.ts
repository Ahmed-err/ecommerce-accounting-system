import fs from "node:fs/promises";
import path from "node:path";

export default async function globalSetup() {
  const creds = {
    admin: { email: "admin@test.local", password: "Admin123!" },
    customer: { email: "customer@test.local", password: "Customer123!" },
  };

  const p = path.join(process.cwd(), "tests/e2e/.auth.json");
  await fs.writeFile(p, JSON.stringify(creds, null, 2), "utf8");
}
