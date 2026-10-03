// JSON for <script type="application/ld+json"> via dangerouslySetInnerHTML.
// JSON.stringify leaves "<" as-is, so a value like "</script><script>…" (e.g. a
// customer's name on a review) would close the tag and run as inline script.
// Escaping "<" (and the JS line separators U+2028/U+2029) keeps the JSON identical once parsed.
const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);
const UNSAFE = new RegExp(`[<${LINE_SEP}${PARA_SEP}]`, "g");

export function jsonLdHtml(data) {
  return JSON.stringify(data).replace(UNSAFE, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
