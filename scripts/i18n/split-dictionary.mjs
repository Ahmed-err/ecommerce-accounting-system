#!/usr/bin/env node
// One-off (P0.4): writes src/lib/i18n/{ar,en}.js from the current src/lib/translations.js.
import fs from "node:fs";
import { translations } from "../../src/lib/translations.js";

fs.mkdirSync("src/lib/i18n", { recursive: true });
for (const lang of ["ar", "en"]) {
  const body = JSON.stringify(translations[lang], null, 2);
  fs.writeFileSync(
    `src/lib/i18n/${lang}.js`,
    `// ${lang === "ar" ? "Arabic" : "English"} UI dictionary. Client code reads it via useT(); server code via @/lib/translations.\nconst dictionary = ${body};\n\nexport default dictionary;\n`
  );
}
console.log("wrote src/lib/i18n/ar.js and en.js");
