import { describe, expect, it } from "vitest";
// @ts-expect-error plain ESM script
import { transformClassString, transformSource } from "../../../scripts/codemods/brand-classes.mjs";

describe("transformClassString", () => {
  it("swaps amber text for the accessible accent token", () => {
    expect(transformClassString("text-sm text-amber-500 font-bold").value).toBe("text-sm text-accent-text font-bold");
    expect(transformClassString("hover:text-amber-600 underline").value).toBe("hover:text-accent-text underline");
  });

  it("removes amber glows", () => {
    expect(transformClassString("rounded-xl shadow-lg shadow-amber-500/30").value).toBe("rounded-xl shadow-lg");
    expect(transformClassString("group-hover:shadow-amber-500/50 p-2").value).toBe("p-2");
  });

  it("leaves amber text that already has a dark pair", () => {
    const r = transformClassString("text-amber-600 dark:text-amber-400");
    expect(r.value).toBe("text-amber-600 dark:text-amber-400");
    expect(r.skipped).toHaveLength(1);
  });

  it("leaves amber text on dark or solid amber backgrounds", () => {
    expect(transformClassString("bg-slate-900 text-amber-400").value).toBe("bg-slate-900 text-amber-400");
    expect(transformClassString("bg-amber-500 text-amber-950").value).toBe("bg-amber-500 text-amber-950");
  });

  it("converts amber text on light amber tints", () => {
    expect(transformClassString("bg-amber-500/10 text-amber-500").value).toBe("bg-amber-500/10 text-accent-text");
  });

  it("reports opacity forms instead of guessing", () => {
    const r = transformClassString("text-amber-500/80");
    expect(r.value).toBe("text-amber-500/80");
    expect(r.skipped).toEqual(["text-amber-500/80"]);
  });

  it("keeps whitespace and interpolations intact", () => {
    expect(transformClassString("a  text-amber-500\n  ${x ? 'b' : 'c'}").value).toBe("a  text-accent-text\n  ${x ? 'b' : 'c'}");
  });
});

describe("transformClassString with convertDarkPairs", () => {
  it("converts the light half of a light/dark pair on a light page", () => {
    expect(transformClassString("text-amber-600 dark:text-amber-400", { convertDarkPairs: true }).value).toBe(
      "text-accent-text dark:text-amber-400"
    );
  });

  it("still leaves amber text on dark backgrounds", () => {
    expect(transformClassString("bg-slate-900 text-amber-400 dark:text-amber-300", { convertDarkPairs: true }).value).toBe(
      "bg-slate-900 text-amber-400 dark:text-amber-300"
    );
  });
});

describe("transformSource", () => {
  it("rewrites class strings in all quote styles and leaves other code alone", () => {
    const src = [
      `<p className="text-amber-500">x</p>`,
      `cn('shadow-amber-500/25 p-2', ok && "text-amber-400")`,
      "const s = `flex ${a} text-amber-600`;",
      `const label = "amber-500 is a colour";`,
    ].join("\n");
    const out = transformSource(src);
    expect(out.code).toBe(
      [
        `<p className="text-accent-text">x</p>`,
        `cn('p-2', ok && "text-accent-text")`,
        "const s = `flex ${a} text-accent-text`;",
        `const label = "amber-500 is a colour";`,
      ].join("\n")
    );
    expect(out.changes).toHaveLength(4);
  });
});
