import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { uploadImage } from "@/lib/cloudinary";

const ACCEPTED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function maxSizeForFolder(folder) {
  if (folder === "avatars" || folder === "employees") return 2 * 1024 * 1024;
  if (folder === "store") return 5 * 1024 * 1024;
  return 5 * 1024 * 1024;
}

export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowed = await checkRateLimit(`upload:${session.user.id}`, 30, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json({ error: "Too many uploads, try later" }, { status: 429 });
    }

    const formData = await req.formData();
    const folder = String(formData.get("folder") || "").trim();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!ACCEPTED.has(file.type)) {
      return NextResponse.json(
        { error: "Only jpg, jpeg, png, webp are allowed" },
        { status: 400 }
      );
    }

    const maxSize = maxSizeForFolder(folder);
    if (file.size > maxSize) {
      const mb = Math.floor(maxSize / (1024 * 1024));
      return NextResponse.json(
        { error: `File too large. Max ${mb}MB for this upload.` },
        { status: 400 }
      );
    }

    const uploaded = await uploadImage(file, folder);
    return NextResponse.json(uploaded);
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    return NextResponse.json(
      { error: "Upload failed, please try again" },
      { status: 500 }
    );
  }
}
