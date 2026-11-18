import { describe, expect, it } from "vitest";
import { splitPhones, telHref, whatsappDigits } from "@/lib/phones";

describe("contact phones", () => {
  it("splits several numbers and keeps their spacing for display", () => {
    expect(splitPhones("0116881128 / 012 400 2234")).toEqual(["0116881128", "012 400 2234"]);
    expect(splitPhones("0912345678، 0911111111")).toEqual(["0912345678", "0911111111"]);
    expect(splitPhones("")).toEqual([]);
    expect(splitPhones(null)).toEqual([]);
  });

  it("builds tel links without spaces", () => {
    expect(telHref("012 400 2234")).toBe("tel:0124002234");
    expect(telHref("+249 91 000")).toBe("tel:+24991000");
  });

  it("builds international WhatsApp digits", () => {
    expect(whatsappDigits("0116881128")).toBe("249116881128");
    expect(whatsappDigits("+249 912 345 678")).toBe("249912345678");
    expect(whatsappDigits("00249912345678")).toBe("249912345678");
  });
});
