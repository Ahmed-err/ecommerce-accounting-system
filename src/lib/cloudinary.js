import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const folderMap = {
  products: "products",
  banners: "banners",
  avatars: "avatars",
  employees: "employees",
  store: "store",
  expenses: "expenses",
  reviews: "reviews",
};

const transforms = {
  products: [{ width: 1200, crop: "limit" }, { quality: "auto", fetch_format: "auto" }],
  banners: [{ width: 1920, crop: "limit" }, { quality: "auto", fetch_format: "auto" }],
  avatars: [
    { width: 400, height: 400, crop: "fill", gravity: "face" },
    { quality: "auto", fetch_format: "auto" },
  ],
  employees: [
    { width: 400, height: 400, crop: "fill" },
    { quality: "auto", fetch_format: "auto" },
  ],
  store: [{ quality: "auto", fetch_format: "auto" }],
  expenses: [{ width: 1200, crop: "limit" }, { quality: "auto", fetch_format: "auto" }],
  reviews: [{ width: 1200, crop: "limit" }, { quality: "auto", fetch_format: "auto" }],
};

export function resolveFolder(folder) {
  return folderMap[folder] || null;
}

export function folderTransformations(folder) {
  return transforms[folder] || [{ quality: "auto", fetch_format: "auto" }];
}

function toDataUri(buffer, mimeType) {
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

export async function uploadImage(file, folder) {
  const resolved = resolveFolder(folder);
  if (!resolved) throw new Error("Invalid upload folder");

  const bytes = await file.arrayBuffer();
  const dataUri = toDataUri(bytes, file.type);
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: resolved,
    resource_type: "image",
    transformation: folderTransformations(folder),
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

export async function deleteImage(publicId) {
  if (!publicId) return { skipped: true };
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });
  return result;
}

export function getPublicIdFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+(?:\?.*)?$/);
  return match?.[1] || null;
}
