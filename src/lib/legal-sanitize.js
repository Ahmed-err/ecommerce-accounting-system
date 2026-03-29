export function sanitizeLegalHtml(html) {
  if (!html || typeof html !== "string") return "";
  let s = html.replace(/<\/(?:script|iframe|object|embed|form)[^>]*>/gi, "");
  s = s.replace(/<(script|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1>/gi, "");
  s = s.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/javascript:/gi, "");
  s = s.replace(/data:text\/html/gi, "");
  return s;
}
