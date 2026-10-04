#!/usr/bin/env node
// P0.4: pages inside (store) get Navbar/Footer/<main> from the layout; strip them from the page.
// Usage: node scripts/codemods/strip-shell.mjs <files…>
import fs from "node:fs";
import { pathToFileURL } from "node:url";

export function stripShell(src) {
  let code = src
    .replace(/^import (Navbar|Footer) from "@\/components\/(Navbar|Footer)";\n/gm, "")
    .replace(/^[ \t]*<(Navbar|Footer)\s*\/>\n/gm, "");
  // First <main …> becomes <div …> without min-h-screen / dir; its closing tag too.
  code = code.replace(/<main\b([^>]*)>/, (whole, attrs) => {
    const cleaned = attrs
      .replace(/\sdir=\{[^}]*\}|\sdir="[^"]*"/, "")
      .replace(/className="([^"]*)"/, (m, c) => `className="${c.split(/\s+/).filter((x) => x && x !== "min-h-screen").join(" ")}"`)
      .replace(/\sclassName=""/, "");
    return `<div${cleaned}>`;
  });
  code = code.replace(/<\/main>(?![\s\S]*<\/main>)/, "</div>");
  return { code, changed: code !== src };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const file of process.argv.slice(2)) {
    const { code, changed } = stripShell(fs.readFileSync(file, "utf8"));
    if (changed) fs.writeFileSync(file, code);
    console.log(`${changed ? "stripped" : "same    "} ${file}`);
  }
}
