import { getAbsoluteSiteUrl } from "@/lib/site-url";

// Block only private areas. /_next must stay crawlable so search engines can load CSS and JS;
// sign-in pages stay crawlable so their noindex tag is seen.
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/pos", "/api/", "/account", "/my-orders", "/orders/", "/settings", "/checkout", "/cart", "/order-confirmation", "/styleguide"],
      },
    ],
    sitemap: `${getAbsoluteSiteUrl()}/sitemap.xml`,
  };
}
