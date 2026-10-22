import { describe, expect, it } from "vitest";
import imageLoader from "@/lib/image-loader";

describe("image loader", () => {
  it("lets Cloudinary resize and convert product photos", () => {
    expect(
      imageLoader({ src: "https://res.cloudinary.com/demo/image/upload/v17/products/drill.jpg", width: 640, quality: 75 })
    ).toBe("https://res.cloudinary.com/demo/image/upload/f_auto,q_75,w_640,c_limit/v17/products/drill.jpg");
  });

  it("chains with a transformation already in the stored URL", () => {
    expect(
      imageLoader({ src: "https://res.cloudinary.com/demo/image/upload/c_fill,h_200/v1/a.png", width: 384 })
    ).toBe("https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_384,c_limit/c_fill,h_200/v1/a.png");
  });

  it("uses Unsplash's own resizing", () => {
    const url = new URL(imageLoader({ src: "https://images.unsplash.com/photo-1?fit=crop", width: 828, quality: 90 }));
    expect(url.searchParams.get("w")).toBe("828");
    expect(url.searchParams.get("q")).toBe("90");
    expect(url.searchParams.get("fit")).toBe("crop");
  });

  it("serves local files as-is with a distinct srcset entry per width", () => {
    expect(imageLoader({ src: "/images/home/hero.jpg", width: 1080 })).toBe("/images/home/hero.jpg?w=1080");
  });

  it("leaves data:, blob: and other hosts untouched", () => {
    expect(imageLoader({ src: "data:image/png;base64,AAA", width: 64 })).toBe("data:image/png;base64,AAA");
    expect(imageLoader({ src: "blob:https://x/1", width: 64 })).toBe("blob:https://x/1");
    expect(imageLoader({ src: "https://placehold.co/600x400", width: 64 })).toBe("https://placehold.co/600x400");
  });
});
