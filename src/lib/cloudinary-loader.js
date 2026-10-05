// next/image loader for Cloudinary photos: Cloudinary resizes and picks the format
// (WebP/AVIF), so Vercel's image optimizer isn't used. Widths snap to a few steps to
// keep the number of derived images (Cloudinary credits) small.
export const WIDTHS = [160, 320, 480, 640, 960, 1200];

export function isCloudinary(src) {
  return typeof src === "string" && /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(src);
}

export default function cloudinaryLoader({ src, width }) {
  const w = WIDTHS.find((s) => s >= width) || WIDTHS[WIDTHS.length - 1];
  return src.replace("/image/upload/", `/image/upload/f_auto,q_auto,c_limit,w_${w}/`);
}
