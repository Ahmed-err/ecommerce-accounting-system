import fs from "node:fs";
import path from "node:path";

const TOKENS = path.resolve(__dirname, "../../../src/app/styles/tokens.css");

function block(css: string, selector: string) {
  const re = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "g");
  const vars: Record<string, string> = {};
  for (const m of css.matchAll(re)) {
    for (const d of m[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
  }
  return vars;
}

export function readTokens(theme: "light" | "dark") {
  const css = fs.readFileSync(TOKENS, "utf8");
  const vars = { ...block(css, ":root"), ...(theme === "dark" ? block(css, ".dark") : {}) };
  const resolve = (v: string, depth = 0): string => {
    const ref = v.match(/^var\(--([\w-]+)\)$/);
    if (!ref || depth > 5) return v;
    return resolve(vars[ref[1]], depth + 1);
  };
  return Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, resolve(v)]));
}

export function contrast(a: string, b: string) {
  const lum = (h: string) => {
    const c = [1, 3, 5]
      .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
