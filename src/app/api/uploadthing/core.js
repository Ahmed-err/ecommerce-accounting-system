import { createUploadthing } from "uploadthing/next";
import { auth } from "@/auth";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  productImage: f({ image: { maxFileSize: "4MB", maxFileCount: 4 } })
    // Auth check: only staff can upload product images
    .middleware(async () => {
      const session = await auth();
      if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
        throw new Error("Unauthorized: Only Admins or Managers can upload product images.");
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete: ", file.url);
      return { url: file.url };
    }),
  paymentProof: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    // Allow guest users to upload payment proof (no auth required)
    .middleware(async () => {
      const session = await auth();
      // Guests can upload - return guest marker or userId if logged in
      return { userId: session?.user?.id || "guest" };
    })
    .onUploadComplete(async ({ file }) => {
      console.log("Payment proof upload complete: ", file.url);
      return { url: file.url };
    }),
};
