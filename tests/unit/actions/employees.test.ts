import { beforeEach, describe, expect, it, vi } from "vitest";

const db: any = {
  user: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
  attendance: { upsert: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  salaryRecord: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), createMany: vi.fn() },
  leaveRequest: { count: vi.fn(), create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
};
db.$transaction = vi.fn(async (fn: any) => fn(db));
const session = { user: { id: "a1", role: "ADMIN", name: "Admin" } };

vi.mock("@/lib/prisma", () => ({ prisma: db, db }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => session) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn(async () => null) }));
vi.mock("@/lib/ledger", () => ({ bookSalaryPayment: vi.fn(async () => null) }));

const A = () => import("@/app/actions/employees");

beforeEach(() => {
  vi.clearAllMocks();
  session.user.role = "ADMIN";
  db.user.findFirst.mockResolvedValue({ id: "u1", role: "CASHIER", isActive: true });
  db.leaveRequest.count.mockResolvedValue(0);
  db.attendance.upsert.mockImplementation(async ({ create }: any) => ({ id: "at1", ...create }));
});

describe("attendance", () => {
  it("stores times on the shop clock (Khartoum), keyed by the calendar day", async () => {
    const { createAttendance } = await A();
    const res = await createAttendance({ userId: "u1", date: "2026-10-15", status: "PRESENT", checkIn: "08:00", checkOut: "16:30" });
    expect(res.success).toBe(true);
    const { create } = db.attendance.upsert.mock.calls[0][0];
    expect(create.date.toISOString()).toBe("2026-10-15T12:00:00.000Z");
    expect(create.checkIn.toISOString()).toBe("2026-10-15T06:00:00.000Z");
    expect(create.checkOut.toISOString()).toBe("2026-10-15T14:30:00.000Z");
  });
});

describe("salaries", () => {
  const ok = { userId: "u1", month: 10, year: 2026, baseSalary: 1000, bonuses: 0, deductions: 0 };

  it("a paid month can't be changed", async () => {
    db.salaryRecord.findUnique.mockResolvedValue({ id: "s1", status: "PAID" });
    const { createSalaryRecord } = await A();
    expect(await createSalaryRecord(ok)).toMatchObject({ success: false, errorCode: "SALARY_PAID" });
    expect(db.salaryRecord.upsert).not.toHaveBeenCalled();
  });

  it("deductions can't take the net below zero", async () => {
    db.salaryRecord.findUnique.mockResolvedValue(null);
    const { createSalaryRecord } = await A();
    expect(await createSalaryRecord({ ...ok, deductions: 1500 })).toMatchObject({ success: false, errorCode: "NEGATIVE_NET" });
  });

  it("preparing a month adds pending salaries for active staff with a salary, skipping existing ones", async () => {
    db.user.findMany.mockResolvedValue([
      { id: "u1", salary: 1000 },
      { id: "u2", salary: 800 },
      { id: "u3", salary: null },
    ]);
    db.salaryRecord.findMany.mockResolvedValue([{ userId: "u1" }]);
    db.salaryRecord.createMany.mockResolvedValue({ count: 1 });
    const { prepareMonthSalaries } = await A();
    const res = await prepareMonthSalaries({ month: 10, year: 2026 });
    expect(res).toMatchObject({ success: true, created: 1, skipped: 1, noSalary: 1 });
    expect(db.salaryRecord.createMany.mock.calls[0][0].data).toEqual([
      expect.objectContaining({ userId: "u2", baseSalary: 800, netSalary: 800, status: "PENDING", month: 10, year: 2026 }),
    ]);
  });
});

describe("leave", () => {
  const leave = { userId: "u1", type: "ANNUAL", fromDate: "2026-10-20", toDate: "2026-10-22" };

  it("can't end before it starts; days count inclusively", async () => {
    const { createLeaveRequest } = await A();
    expect(await createLeaveRequest({ ...leave, toDate: "2026-10-19" })).toMatchObject({ success: false, errorCode: "LEAVE_DATES" });
    db.leaveRequest.create.mockImplementation(async ({ data }: any) => data);
    await createLeaveRequest(leave);
    expect(db.leaveRequest.create.mock.calls[0][0].data.days).toBe(3);
  });

  it("only a pending leave can be reviewed", async () => {
    db.leaveRequest.findUnique.mockResolvedValue({ id: "l1", userId: "u1", status: "APPROVED", fromDate: new Date("2026-10-20"), toDate: new Date("2026-10-22") });
    const { reviewLeaveRequest } = await A();
    expect(await reviewLeaveRequest("l1", "reject")).toMatchObject({ success: false, errorCode: "LEAVE_REVIEWED" });
    expect(db.leaveRequest.updateMany).not.toHaveBeenCalled();
  });

  it("approval is refused when it overlaps another approved leave", async () => {
    db.leaveRequest.findUnique.mockResolvedValue({ id: "l1", userId: "u1", status: "PENDING", fromDate: new Date("2026-10-20"), toDate: new Date("2026-10-22") });
    db.leaveRequest.count.mockResolvedValue(1);
    const { reviewLeaveRequest } = await A();
    expect(await reviewLeaveRequest("l1", "approve")).toMatchObject({ success: false, errorCode: "LEAVE_OVERLAP" });
  });

  it("an unknown review action is rejected", async () => {
    const { reviewLeaveRequest } = await A();
    expect((await reviewLeaveRequest("l1", "maybe")).success).toBe(false);
    expect(db.leaveRequest.updateMany).not.toHaveBeenCalled();
  });
});

describe("employees", () => {
  const base = { firstName: "Sara", lastName: "H", email: " Sara@Shop.com ", password: "Strong123", role: "CASHIER" };

  it("needs a strong password and a known role; email is normalised", async () => {
    db.user.findFirst.mockResolvedValue(null);
    db.user.create.mockImplementation(async ({ data }: any) => ({ id: "n1", ...data }));
    const { createEmployee } = await A();
    expect((await createEmployee({ ...base, password: "short1" })).success).toBe(false);
    expect((await createEmployee({ ...base, role: "CUSTOMER" })).success).toBe(false);
    expect((await createEmployee(base)).success).toBe(true);
    expect(db.user.create.mock.calls[0][0].data.email).toBe("sara@shop.com");
  });

  it("the last active admin can't be demoted or deactivated", async () => {
    db.user.findFirst.mockResolvedValue({ id: "a2", role: "ADMIN", isActive: true });
    db.user.count.mockResolvedValue(0);
    const { updateEmployee, deleteEmployee } = await A();
    expect(await updateEmployee("a2", { firstName: "X", lastName: "Y", role: "MANAGER" })).toMatchObject({ success: false, errorCode: "LAST_ADMIN" });
    expect(await deleteEmployee("a2")).toMatchObject({ success: false, errorCode: "LAST_ADMIN" });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("an admin can't change their own role", async () => {
    db.user.findFirst.mockResolvedValue({ id: "a1", role: "ADMIN", isActive: true });
    db.user.count.mockResolvedValue(3);
    const { updateEmployee } = await A();
    expect(await updateEmployee("a1", { firstName: "X", lastName: "Y", role: "CASHIER" })).toMatchObject({ success: false, errorCode: "OWN_ROLE" });
  });

  it("customers can't be edited here", async () => {
    db.user.findFirst.mockResolvedValue(null);
    const { updateEmployee } = await A();
    expect((await updateEmployee("c1", { firstName: "X", lastName: "Y", role: "ADMIN" })).success).toBe(false);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("a new password from the admin signs the employee out everywhere", async () => {
    db.user.update.mockImplementation(async ({ data }: any) => ({ id: "u1", ...data }));
    const { updateEmployee } = await A();
    expect((await updateEmployee("u1", { firstName: "S", lastName: "H", role: "CASHIER", password: "NewStrong1" })).success).toBe(true);
    expect(db.user.update.mock.calls[0][0].data.passwordChangedAt).toBeInstanceOf(Date);
  });

  it("a deactivated employee can be reactivated", async () => {
    db.user.findFirst.mockResolvedValue({ id: "u1", role: "CASHIER", isActive: false });
    db.user.update.mockResolvedValue({ id: "u1" });
    const { reactivateEmployee } = await A();
    expect((await reactivateEmployee("u1")).success).toBe(true);
    expect(db.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { isActive: true } });
  });

  it("only admins manage staff", async () => {
    session.user.role = "MANAGER";
    const { reactivateEmployee } = await A();
    expect((await reactivateEmployee("u1")).success).toBe(false);
    expect(db.user.update).not.toHaveBeenCalled();
  });
});
