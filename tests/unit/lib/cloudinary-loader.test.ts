import { describe, expect, it } from "vitest";
import cloudinaryLoader, { isCloudinary } from "@/lib/cloudinary-loader";

const src = "https://res.cloudinary.com/dmnqypzhs/image/upload/v1787848376/products/abc.jpg";

describe("cloudinaryLoader", () => {
  it("asks Cloudinary for an auto-format image at a snapped width", () => {
    expect(cloudinaryLoader({ src, width: 300 })).toBe(
      "https://res.cloudinary.com/dmnqypzhs/image/upload/f_auto,q_auto,c_limit,w_320/v1787848376/products/abc.jpg"
    );
    expect(cloudinaryLoader({ src, width: 3840 })).toContain("w_1200/");
  });

  it("only handles Cloudinary uploads", () => {
    expect(isCloudinary(src)).toBe(true);
    expect(isCloudinary("https://images.unsplash.com/photo-1")).toBe(false);
    expect(isCloudinary(undefined)).toBe(false);
  });
});
