export default function robots() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_URL || "https://essamnasr.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/contact", "/shop", "/products", "/login", "/register", "/terms", "/privacy"],
        disallow: ["/admin", "/admin/*", "/api", "/api/*", "/account", "/account/*", "/_next", "/_next/*"],
      },
    ],
    sitemap: `${base.replace(/\/$/, "")}/sitemap.xml`,
  };
}
