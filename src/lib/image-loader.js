// next/image loader. Product, banner and review photos live on Cloudinary, which resizes and
// converts them (WebP/AVIF) itself, so Vercel's Image Optimization is not used for them: no
// Vercel transformations or optimized-image cache writes per size and photo.
// Everything else (files in /public, placeholders, data:/blob: previews) is served as-is.

const CLOUDINARY_UPLOAD = /^https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(.+)$/;

export default function imageLoader({ src, width, quality }) {
  if (typeof src !== "string" || !src) return src;

  const cloud = src.match(CLOUDINARY_UPLOAD);
  if (cloud) {
    // c_limit never upscales; f_auto picks WebP/AVIF per browser. Chains with any
    // transformation already in the stored URL.
    const q = quality ? `q_${quality}` : "q_auto";
    return `https://res.cloudinary.com/${cloud[1]}/image/upload/f_auto,${q},w_${width},c_limit/${cloud[2]}`;
  }

  if (src.startsWith("https://images.unsplash.com/")) {
    const url = new URL(src);
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality || 75));
    url.searchParams.set("auto", "format");
    return url.toString();
  }

  // Local /public files: the width query keeps srcset entries distinct; the file is static.
  if (src.startsWith("/") && !src.startsWith("//")) {
    return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
  }

  return src;
}
