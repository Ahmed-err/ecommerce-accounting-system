import { beforeEach, describe, expect, it, vi } from "vitest";

const db: any = {
  coupon: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  order: { groupBy: vi.fn() },
  review: { findMany: vi.fn(), count: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
};
const session = { user: { id: "a1", role: "ADMIN", name: "Admin" } };
const contact = {
  getContactMessageById: vi.fn(),
  replyToContactMessage: vi.fn(),
  listContactMessagesAdmin: vi.fn(),
  markContactMessageRead: vi.fn(),
  deleteContactMessage: vi.fn(),
};
const sendContactReplyEmail = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma: db, db }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => session) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/contact", () => contact);
vi.mock("@/lib/senders", () => ({ sendContactReplyEmail }));
vi.mock("@/lib/reviews", async (orig) => ({ ...(await orig<any>()), getAdminReviewStats: vi.fn(async () => ({})) }));
vi.mock("@/lib/notifications", () => ({ createAdminBroadcastNotification: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  session.user.role = "ADMIN";
  contact.getContactMessageById.mockResolvedValue({ id: "m1", email: "c@x.com", subject: "Hi", status: "READ" });
});

describe("contact replies", () => {
  it("escapes the reply in the email", async () => {
    sendContactReplyEmail.mockResolvedValue(true);
    const { replyContactMessageAction } = await import("@/app/actions/contact-admin");
    await replyContactMessageAction("m1", { reply: "Price <b>5 & 6</b>\nthanks" });
    expect(sendContactReplyEmail.mock.calls[0][2]).toBe("<p>Price &lt;b&gt;5 &amp; 6&lt;/b&gt;<br/>thanks</p>");
    expect(contact.replyToContactMessage).toHaveBeenCalledWith("m1", "Price <b>5 & 6</b>\nthanks", true);
  });

  it("an unsent reply is saved but not marked replied, and the screen is told", async () => {
    sendContactReplyEmail.mockResolvedValue(false);
    const { replyContactMessageAction } = await import("@/app/actions/contact-admin");
    expect(await replyContactMessageAction("m1", { reply: "We have it in stock." })).toEqual({ ok: true, emailSent: false });
    expect(contact.replyToContactMessage).toHaveBeenCalledWith("m1", "We have it in stock.", false);
  });
});

describe("coupons", () => {
  it("expiry typed on the shop clock (Khartoum) is stored as that instant", async () => {
    const { createCouponAdmin } = await import("@/app/actions/coupons-admin");
    expect((await createCouponAdmin({ code: "eid", percentOff: 10, expiresAt: "2026-10-20T23:59" })).success).toBe(true);
    const { data } = db.coupon.create.mock.calls[0][0];
    expect(data.code).toBe("EID");
    expect(data.expiresAt.toISOString()).toBe("2026-10-20T21:59:00.000Z");
  });

  it("the list shows how many live orders used each coupon", async () => {
    db.coupon.findMany.mockResolvedValue([{ id: "c1", code: "EID" }, { id: "c2", code: "NEW" }]);
    db.coupon.count.mockResolvedValue(2);
    db.order.groupBy.mockResolvedValue([{ couponCode: "EID", _count: { _all: 3 } }]);
    const { listCouponsAdmin } = await import("@/app/actions/coupons-admin");
    const res = await listCouponsAdmin({});
    expect(res.rows.map((r: any) => r.uses)).toEqual([3, 0]);
    expect(db.order.groupBy.mock.calls[0][0].where).toMatchObject({ couponCode: { in: ["EID", "NEW"] }, status: { not: "CANCELLED" } });
  });
});

describe("reviews", () => {
  it("search covers Arabic product names and review text, paged on the server", async () => {
    db.review.findMany.mockResolvedValue([]);
    db.review.count.mockResolvedValue(45);
    const { getAdminReviewsAction } = await import("@/app/actions/reviews");
    const res = await getAdminReviewsAction({ search: "مثقاب", page: 3 });
    const args = db.review.findMany.mock.calls[0][0];
    expect(args.skip).toBe(40);
    expect(JSON.stringify(args.where)).toContain("nameAr");
    expect(JSON.stringify(args.where)).toContain('"body"');
    expect(res).toMatchObject({ ok: true, total: 45, pages: 3, page: 3 });
  });

  it("a cashier can't moderate", async () => {
    session.user.role = "CASHIER";
    const { adminSetReviewStatusAction } = await import("@/app/actions/reviews");
    expect((await adminSetReviewStatusAction({ ids: ["r1"], status: "APPROVED" })).success).toBe(false);
    expect(db.review.updateMany).not.toHaveBeenCalled();
  });
});
