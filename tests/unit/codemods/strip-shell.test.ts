import { expect, it } from "vitest";
// @ts-expect-error plain ESM script
import { stripShell } from "../../../scripts/codemods/strip-shell.mjs";

it("removes Navbar/Footer and turns the page <main> into a <div> without min-h-screen/dir", () => {
  const src = [
    'import Navbar from "@/components/Navbar";',
    'import Footer from "@/components/Footer";',
    "export default function P() {",
    "  return (",
    '    <main className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>',
    "      <Navbar />",
    "      <Content />",
    "      <Footer />",
    "    </main>",
    "  );",
    "}",
  ].join("\n");
  expect(stripShell(src).code).toBe(
    ["export default function P() {", "  return (", '    <div className="bg-background">', "      <Content />", "    </div>", "  );", "}"].join("\n")
  );
});
