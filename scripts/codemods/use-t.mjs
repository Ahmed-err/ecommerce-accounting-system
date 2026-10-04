#!/usr/bin/env node
// P0.4 codemod: client components read the dictionary via useT() instead of importing both languages.
// Usage: node scripts/codemods/use-t.mjs [--write] <files…>
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const LOOKUP = /^(\s*)const (\w+) = translations\[[^\]]+\](?:\s*\|\|\s*translations(?:\.\w+|\[['"]\w+['"]\]))?;[ \t]*$/gm;
const IMPORT_ONLY = /^import \{\s*translations\s*\} from "@\/lib\/translations";\n/m;
const IMPORT_WITH_TC = /^import \{\s*translations,\s*translateCategory\s*\} from "@\/lib\/translations";$/m;
const LANG_IMPORT = /^import \{([^}]*)\} from "@\/context\/LanguageContext";$/m;

export function transformUseT(src) {
  LOOKUP.lastIndex = 0;
  if (!src.includes('"use client"') || !new RegExp(LOOKUP.source, "m").test(src)) return { code: src, changed: false, manual: [] };
  let code = src.replace(LOOKUP, "$1const $2 = useT();");
  code = code.replace(IMPORT_WITH_TC, 'import { translateCategory } from "@/lib/i18n/translate-category";');
  code = code.replace(IMPORT_ONLY, "");
  if (LANG_IMPORT.test(code)) {
    code = code.replace(LANG_IMPORT, (whole, names) => {
      const list = names.split(",").map((n) => n.trim()).filter(Boolean);
      if (list.includes("useT")) return whole;
      return `import { ${[...list, "useT"].join(", ")} } from "@/context/LanguageContext";`;
    });
  } else {
    const lines = code.split("\n");
    const lastImport = lines.reduce((acc, l, i) => (/^import /.test(l) ? i : acc), -1);
    lines.splice(lastImport + 1, 0, 'import { useT } from "@/context/LanguageContext";');
    code = lines.join("\n");
  }
  const manual = [...code.matchAll(/\btranslations(?:\.\w+)+|\btranslations\[[^\]]+\][\w.]*/g)].map((m) => m[0]);
  return { code, changed: true, manual };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const write = process.argv.includes("--write");
  for (const file of process.argv.slice(2).filter((a) => !a.startsWith("--"))) {
    const { code, changed, manual } = transformUseT(fs.readFileSync(file, "utf8"));
    if (!changed) {
      console.log(`skip   ${file}`);
      continue;
    }
    if (write) fs.writeFileSync(file, code);
    console.log(`${manual.length ? "MANUAL" : "ok    "} ${file}${manual.length ? "  " + manual.join(", ") : ""}`);
  }
}
