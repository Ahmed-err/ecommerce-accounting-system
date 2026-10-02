import { defineConfig } from "vitest/config";
import { transformWithOxc, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Components under src/ use JSX in .js files (Next.js allows it), but Vite's oxc
// transform infers the language from the extension and rejects JSX in .js.
const jsxInJs: Plugin = {
  name: "jsx-in-js",
  enforce: "pre",
  async transform(code, id) {
    if (!/\/src\/.*\.js$/.test(id.split("?")[0])) return null;
    return transformWithOxc(code, id, { lang: "jsx", jsx: { runtime: "automatic" } });
  },
};

export default defineConfig({
  plugins: [jsxInJs, react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
    exclude: ["tests/e2e/**"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/app/api/**", "src/components/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
