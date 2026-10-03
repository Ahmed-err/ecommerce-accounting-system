#!/usr/bin/env node
// Renders the committed brand SVGs to PNG/ICO. Run by hand after changing an icon:
//   node scripts/brand/render-icons.mjs
// Uses the `sharp` that Next.js installs (no new dependency).
import fs from "node:fs";
import sharp from "sharp";

const SMALL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="104" fill="#0E1A2B"/><path d="M290 40 L130 292 H246 L198 472 L386 208 H272 L330 40 Z" fill="#F2A20C"/></svg>`;
const big = fs.readFileSync("public/icons/icon-512.svg");

const png = (svg, size) => sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toBuffer();

// ICO with a single embedded 48×48 PNG (valid for all current browsers).
function ico(pngBuf) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(48, 6);
  header.writeUInt8(48, 7);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(pngBuf.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, pngBuf]);
}

const out = {
  "public/icons/icon-512.png": await png(big, 512),
  "public/icons/icon-192.png": await png(big, 192),
  "public/favicon.png": await png(big, 192),
  "public/favicon-48.png": await png(SMALL, 48),
};
for (const [file, buf] of Object.entries(out)) fs.writeFileSync(file, buf);
fs.writeFileSync("public/favicon.ico", ico(out["public/favicon-48.png"]));
console.log("rendered", Object.keys(out).length + 1, "files");
