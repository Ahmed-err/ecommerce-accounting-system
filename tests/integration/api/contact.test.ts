import { vi } from "vitest";
import { makeJsonRequest } from "../../helpers/http";

vi.mock("@/lib/rate-limit", () => ({
  getClientIP: vi.fn(async () => "127.0.0.1"),
  checkRateLimit: vi.fn(async () => true),
}));
vi.mock("@/lib/contact", () => ({ createContactMessageRecord: vi.fn(async () => ({ id: "m1" })) }));
vi.mock("@/lib/senders", () => ({
  sendContactAdminNotification: vi.fn(async () => true),
  sendContactAutoReply: vi.fn(async () => true),
}));

describe("integration/api/contact", () => {
  it("POST /api/contact accepts valid payload", async () => {
    const { POST } = await import("@/app/api/contact/route");
    const req = makeJsonRequest("http://localhost/api/contact", "POST", {
      name: "Ahmed",
      email: "a@test.local",
      phone: "0912345678",
      subject: "GENERAL",
      message: "This is a valid message with enough length.",
      lang: "en",
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
  });
});
