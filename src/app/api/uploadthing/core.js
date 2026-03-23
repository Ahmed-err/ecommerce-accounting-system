import { createUploadthing } from "uploadthing/next";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  productImage: f({ image: { maxFileSize: "4MB", maxFileCount: 4 } })
    // Add auth check here if needed:
    // .proxy(async ({ req }) => {
    //   const session = await auth();
    //   if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) throw new Error("Unauthorized");
    //   return { userId: session.user.id };
    // })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete: ", file.url);
      return { url: file.url };
    }),
};
