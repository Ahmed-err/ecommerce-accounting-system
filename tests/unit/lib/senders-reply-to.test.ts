import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn(async () => ({}));
let storeEmail: string | null = "owner@hotmail.com";

vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail }) } }));
vi.mock("twilio", () => ({ default: vi.fn() }));
vi.mock("@/lib/site-url", () => ({ getAbsoluteSiteUrl: () => "https://shop.test" }));
vi.mock("@/lib/settings", () => ({
  getStoreSettingsForDisplay: vi.fn(async () => {
    if (storeEmail === "THROW") throw new Error("db down");
    return { contactEmail: storeEmail };
  }),
}));

describe("customer-facing mail Reply-To", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeEmail = "owner@hotmail.com";
    process.env.SMTP_USER = "sender@gmail.com";
  });

  it("replies go to the store contact email, not the SMTP mailbox", async () => {
    const { sendEmailVerification, sendResetEmail, sendContactAutoReply } = await import("@/lib/senders");
    await sendEmailVerification("c@x.com", "tok");
    await sendResetEmail("c@x.com", "tok");
    await sendContactAutoReply("c@x.com", "ar");
    expect(sendMail).toHaveBeenCalledTimes(3);
    for (const [opts] of sendMail.mock.calls as any[]) {
      expect(opts.replyTo).toBe("owner@hotmail.com");
      expect(opts.from).toContain("sender@gmail.com");
    }
  });

  it("still sends, without Reply-To, when the setting is empty, invalid or unreadable", async () => {
    const { sendEmailVerification } = await import("@/lib/senders");
    for (const v of ["", "not-an-email", "THROW"]) {
      storeEmail = v;
      sendMail.mockClear();
      await expect(sendEmailVerification("c@x.com", "tok")).resolves.toBe(true);
      expect((sendMail.mock.calls[0] as any)[0].replyTo).toBeUndefined();
    }
  });

  it("contact notification to the owner replies to the customer", async () => {
    process.env.CONTACT_NOTIFY_EMAIL = "owner@hotmail.com";
    const { sendContactAdminNotification } = await import("@/lib/senders");
    await sendContactAdminNotification({ name: "Ali", email: "ali@x.com", phone: "", subject: "Hi", message: "msg" });
    expect((sendMail.mock.calls[0] as any)[0].replyTo).toBe("ali@x.com");
  });
});
