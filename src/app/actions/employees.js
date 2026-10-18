"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { logAction } from "@/lib/audit";
import { z } from "zod";
import { bookSalaryPayment } from "@/lib/ledger";
import { isStrongPassword, normalizeEmail } from "@/lib/auth-identity";
import { STAFF_ROLES } from "@/lib/staff-access";
import { shopClock, shopClockOf, shopDayBounds, shopDaysBetween, shopToday } from "@/lib/shop-time";


const attendanceSchema = z.object({
  userId: z.string().min(1),
  date: z.string().min(1),
  checkIn: z.string().optional().nullable(),
  checkOut: z.string().optional().nullable(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "HALF_DAY", "HOLIDAY"]),
  notes: z.string().max(500).optional().nullable(),
});

/**
 * Attendance rows key a calendar day as noon UTC of that date (what production already stores);
 * leave rows store midnight UTC. Clock times are on the shop's clock (`shop-time`).
 */
function dayKeyDate(day) {
  return typeof day === "string" && shopDayBounds(day.slice(0, 10)) ? new Date(`${day.slice(0, 10)}T12:00:00.000Z`) : null;
}

function dayOf(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function parseClock(day, timeOrIso) {
  const s = timeOrIso == null ? "" : String(timeOrIso).trim();
  if (!s) return null;
  if (s.includes("T")) {
    const dt = new Date(s);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  return shopClock(day, s.slice(0, 5));
}

function resolveStatusAndClocks(status, day, rawIn, rawOut) {
  if (status === "ABSENT" || status === "HOLIDAY") {
    return { checkIn: null, checkOut: null, errorCode: null };
  }
  const hasIn = rawIn != null && String(rawIn).trim() !== "";
  const hasOut = rawOut != null && String(rawOut).trim() !== "";
  if (hasIn !== hasOut) {
    return { checkIn: null, checkOut: null, errorCode: "ONE_CLOCK" };
  }
  if (!hasIn && !hasOut) {
    return { checkIn: null, checkOut: null, errorCode: null };
  }
  const checkIn = parseClock(day, rawIn);
  const checkOut = parseClock(day, rawOut);
  if (!checkIn || !checkOut) {
    return { checkIn: null, checkOut: null, errorCode: "BAD_TIME" };
  }
  if (checkOut.getTime() <= checkIn.getTime()) {
    return { checkIn: null, checkOut: null, errorCode: "CHECKOUT_ORDER" };
  }
  return { checkIn, checkOut, errorCode: null };
}

async function ensureAttendanceStaffUser(userId) {
  const u = await db.user.findFirst({
    where: { id: userId, role: { not: "CUSTOMER" }, isActive: true },
    select: { id: true },
  });
  return u;
}

/** Approved leave overlapping the days `from`..`to` ("YYYY-MM-DD"), optionally ignoring one leave. */
async function approvedLeaveCount(userId, from, to, exceptId) {
  return db.leaveRequest.count({
    where: {
      userId,
      status: "APPROVED",
      fromDate: { lte: new Date(`${to}T23:59:59.999Z`) },
      toDate: { gte: new Date(`${from}T00:00:00.000Z`) },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
  });
}

async function hasApprovedLeaveOnDay(userId, day) {
  return (await approvedLeaveCount(userId, day, day)) > 0;
}

function attendanceLeaveConflict(status, onLeave) {
  if (!onLeave) return null;
  if (status === "ABSENT") return "LEAVE_ABSENT";
  if (status === "PRESENT" || status === "LATE") return "LEAVE_PRESENT";
  return null;
}

const money = z.coerce.number().min(0).max(1e10);

const salarySchema = z.object({
  userId: z.string().min(1),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  baseSalary: z.coerce.number().positive().max(1e10),
  bonuses: money,
  deductions: money,
  notes: z.string().max(1000).optional().nullable(),
});

const leaveSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(["ANNUAL", "SICK", "EMERGENCY", "UNPAID"]),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(2000).optional().nullable(),
});

const employeeSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(30).optional().nullable(),
  role: z.enum(STAFF_ROLES),
  salary: z.union([z.literal(""), z.coerce.number().min(0).max(1e10)]).optional().nullable(),
  hireDate: z.string().optional().nullable(),
  department: z.string().trim().max(80).optional().nullable(),
  password: z.string().max(128).optional().nullable(),
});

function employeeData(p) {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    name: `${p.firstName} ${p.lastName}`,
    phone: p.phone || null,
    role: p.role,
    salary: p.salary === "" || p.salary == null ? null : p.salary,
    hireDate: p.hireDate ? new Date(p.hireDate) : null,
    department: p.department || null,
  };
}

async function ensureAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Only Admins can manage employees.");
  }
  return session.user;
}

/** Other active admins besides `id` — the shop must always keep one. */
function otherActiveAdmins(id) {
  return db.user.count({ where: { role: "ADMIN", isActive: true, id: { not: id } } });
}

export async function getEmployees({
  search = "",
  role = "all",
  department = "",
  status = "active",
  page = 1,
  limit = 10,
} = {}) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { employees: [], total: 0 };
    const where = {
      role: { not: "CUSTOMER" },
      isActive: status !== "inactive",
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(role && role !== "all" ? { role: role.toUpperCase() } : {}),
      ...(department && department !== "all"
        ? { department: { equals: department, mode: "insensitive" } }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [employees, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          salary: true,
          hireDate: true,
          department: true,
          avatar: true,
          createdAt: true,
        },
      }),
      db.user.count({ where }),
    ]);

    return { employees, total };
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    return { employees: [], total: 0 };
  }
}

export async function getDepartments() {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return [];
    }
    const rows = await db.user.findMany({
      where: { role: { not: "CUSTOMER" }, isActive: true, department: { not: null } },
      select: { department: true },
      distinct: ["department"],
      orderBy: { department: "asc" },
    });
    return rows.map((r) => r.department).filter(Boolean);
  } catch (error) {
    console.error("Failed to fetch departments:", error);
    return [];
  }
}

export async function createEmployee(data) {
  try {
    await ensureAdmin();
    const parsed = employeeSchema.safeParse(data || {});
    const email = normalizeEmail(data?.email || "");
    if (!parsed.success || !email.includes("@")) {
      return { success: false, error: "Missing or invalid fields.", errorCode: "VALIDATION" };
    }
    if (!isStrongPassword(parsed.data.password)) {
      return { success: false, error: "Weak password.", errorCode: "WEAK_PASSWORD" };
    }

    const existing = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (existing) {
      return { success: false, error: "A user with this email already exists.", errorCode: "EMAIL_TAKEN" };
    }

    const employee = await db.user.create({
      data: {
        ...employeeData(parsed.data),
        hireDate: parsed.data.hireDate ? new Date(parsed.data.hireDate) : new Date(),
        email,
        password: await bcrypt.hash(parsed.data.password, 10),
      },
    });

    await logAction("CREATE_EMPLOYEE", { employeeId: employee.id, name: employee.name, role: employee.role });

    revalidatePath("/admin/employees");
    return { success: true, employee: { id: employee.id } };
  } catch (error) {
    console.error("Failed to create employee:", error);
    return { success: false, error: error.message };
  }
}

export async function updateEmployee(id, data) {
  try {
    const admin = await ensureAdmin();
    const parsed = employeeSchema.safeParse(data || {});
    if (!parsed.success) return { success: false, error: "Missing or invalid fields.", errorCode: "VALIDATION" };
    const p = parsed.data;

    const target = await db.user.findFirst({
      where: { id, role: { not: "CUSTOMER" } },
      select: { id: true, role: true, isActive: true },
    });
    if (!target) return { success: false, error: "Employee not found.", errorCode: "NOT_FOUND" };
    if (target.role !== p.role) {
      if (id === admin.id) return { success: false, error: "You can't change your own role.", errorCode: "OWN_ROLE" };
      if (target.role === "ADMIN" && target.isActive && (await otherActiveAdmins(id)) === 0) {
        return { success: false, error: "The shop needs at least one admin.", errorCode: "LAST_ADMIN" };
      }
    }

    const updateData = employeeData(p);
    if (p.password) {
      if (!isStrongPassword(p.password)) return { success: false, error: "Weak password.", errorCode: "WEAK_PASSWORD" };
      updateData.password = await bcrypt.hash(p.password, 10);
      // Ends the employee's open sessions (auth-session-guard).
      updateData.passwordChangedAt = new Date();
    }

    await db.user.update({ where: { id }, data: updateData });

    await logAction("UPDATE_EMPLOYEE", { employeeId: id, updatedFields: Object.keys(updateData).filter((k) => k !== "password") });

    revalidatePath("/admin/employees");
    return { success: true };
  } catch (error) {
    console.error("Failed to update employee:", error);
    return { success: false, error: error.message };
  }
}

/** "Delete" deactivates: the person can't sign in, history stays, and they can be reactivated. */
export async function deleteEmployee(id) {
  try {
    const admin = await ensureAdmin();
    if (admin.id === id) {
      return { success: false, error: "You cannot delete your own admin account.", errorCode: "SELF" };
    }
    const target = await db.user.findFirst({
      where: { id, role: { not: "CUSTOMER" } },
      select: { id: true, role: true, isActive: true },
    });
    if (!target) {
      return { success: false, error: "Employee not found.", errorCode: "NOT_FOUND" };
    }
    if (target.role === "ADMIN" && target.isActive && (await otherActiveAdmins(id)) === 0) {
      return { success: false, error: "The shop needs at least one admin.", errorCode: "LAST_ADMIN" };
    }
    await db.user.update({ where: { id }, data: { isActive: false } });
    await logAction("DELETE_EMPLOYEE", { employeeId: id });
    revalidatePath("/admin/employees");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete employee:", error);
    return { success: false, error: error.message };
  }
}

export async function reactivateEmployee(id) {
  try {
    await ensureAdmin();
    const target = await db.user.findFirst({ where: { id, role: { not: "CUSTOMER" } }, select: { id: true } });
    if (!target) return { success: false, error: "Employee not found.", errorCode: "NOT_FOUND" };
    await db.user.update({ where: { id }, data: { isActive: true } });
    await logAction("REACTIVATE_EMPLOYEE", { employeeId: id });
    revalidatePath("/admin/employees");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getEmployeeHrData(query = {}) {
  try {
    await ensureAdmin();
    const {
      getEmployeeKpis,
      getAttendanceLast30Days,
      getDepartmentBreakdown,
      getRoleBreakdown,
      getRecentHrActivity,
      getAttendanceSummary,
      getPayrollSummary,
      getLeaveSummary,
    } = await import("@/lib/employees");

    const tab = query.tab || "overview";
    const [thisYear, thisMonth] = shopToday().split("-").map(Number);
    const month = Number(query.month) || thisMonth;
    const year = Number(query.year) || thisYear;

    switch (tab) {
      case "overview": {
        const [kpis, attendance30d, deptBreakdown, roleBreakdown, activity] = await Promise.all([
          getEmployeeKpis(),
          getAttendanceLast30Days(),
          getDepartmentBreakdown(),
          getRoleBreakdown(),
          getRecentHrActivity(10),
        ]);
        return { ok: true, tab, kpis, attendance30d, deptBreakdown, roleBreakdown, activity };
      }
      case "attendance": {
        const summary = await getAttendanceSummary({
          userId: query.userId || null,
          month,
          year,
        });
        return { ok: true, tab, ...summary, month, year };
      }
      case "salaries": {
        const payroll = await getPayrollSummary({
          month,
          year,
          status: query.status || "all",
        });
        return { ok: true, tab, ...payroll, month, year };
      }
      case "leaves": {
        const leaves = await getLeaveSummary({
          month,
          year,
          userId: query.userId || null,
          status: query.status || "all",
          type: query.type || "all",
        });
        return { ok: true, tab, leaves, month, year };
      }
      case "reports": {
        const [summary, payroll] = await Promise.all([
          getAttendanceSummary({ month, year }),
          getPayrollSummary({ month, year, status: "all" }),
        ]);
        return { ok: true, tab, summary, payroll, month, year };
      }
      default:
        return { ok: true, tab };
    }
  } catch (error) {
    console.error("getEmployeeHrData:", error);
    return { ok: false, error: error.message };
  }
}

export async function createAttendance(raw) {
  try {
    await ensureAdmin();
    const parsed = attendanceSchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

    const p = parsed.data;
    const day = p.date.slice(0, 10);
    const dateOnly = dayKeyDate(day);
    if (!dateOnly) {
      return { success: false, error: "Invalid date.", errorCode: "INVALID_DATE" };
    }

    const staff = await ensureAttendanceStaffUser(p.userId);
    if (!staff) {
      return { success: false, error: "Invalid or inactive employee.", errorCode: "INVALID_EMPLOYEE" };
    }

    const { checkIn, checkOut, errorCode } = resolveStatusAndClocks(p.status, day, p.checkIn, p.checkOut);
    if (errorCode) {
      return { success: false, error: "Attendance validation failed.", errorCode };
    }

    const onLeave = await hasApprovedLeaveOnDay(p.userId, day);
    const leaveErr = attendanceLeaveConflict(p.status, onLeave);
    if (leaveErr) {
      return { success: false, error: "Conflicts with approved leave.", errorCode: leaveErr };
    }

    const record = await db.attendance.upsert({
      where: { userId_date: { userId: p.userId, date: dateOnly } },
      update: {
        status: p.status,
        checkIn,
        checkOut,
        notes: p.notes || null,
      },
      create: {
        userId: p.userId,
        date: dateOnly,
        status: p.status,
        checkIn,
        checkOut,
        notes: p.notes || null,
      },
    });

    await logAction("CREATE_ATTENDANCE", { attendanceId: record.id, userId: p.userId });
    revalidatePath("/admin/employees");
    return { success: true, record };
  } catch (error) {
    console.error("createAttendance:", error);
    return { success: false, error: error.message };
  }
}

export async function updateAttendance(id, raw) {
  try {
    await ensureAdmin();
    const parsed = attendanceSchema.partial().safeParse(raw);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
    const p = parsed.data;

    const existing = await db.attendance.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Attendance record not found." };
    }

    // The row's day stays; only status, times and notes change.
    const day = dayOf(existing.date);
    const status = p.status ?? existing.status;
    const rawIn = p.checkIn !== undefined ? p.checkIn : shopClockOf(existing.checkIn);
    const rawOut = p.checkOut !== undefined ? p.checkOut : shopClockOf(existing.checkOut);

    const { checkIn, checkOut, errorCode } = resolveStatusAndClocks(status, day, rawIn, rawOut);
    if (errorCode) {
      return { success: false, error: "Attendance validation failed.", errorCode };
    }

    const userId = existing.userId;
    const staff = await ensureAttendanceStaffUser(userId);
    if (!staff) {
      return { success: false, error: "Invalid or inactive employee.", errorCode: "INVALID_EMPLOYEE" };
    }

    const onLeave = await hasApprovedLeaveOnDay(userId, day);
    const leaveErr = attendanceLeaveConflict(status, onLeave);
    if (leaveErr) {
      return { success: false, error: "Conflicts with approved leave.", errorCode: leaveErr };
    }

    const record = await db.attendance.update({
      where: { id },
      data: {
        status,
        checkIn,
        checkOut,
        ...(p.notes !== undefined ? { notes: p.notes || null } : {}),
      },
    });

    await logAction("UPDATE_ATTENDANCE", { attendanceId: id, userId });
    revalidatePath("/admin/employees");
    return { success: true, record };
  } catch (error) {
    console.error("updateAttendance:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAttendance(id) {
  try {
    await ensureAdmin();
    await db.attendance.delete({ where: { id } });
    revalidatePath("/admin/employees");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function createSalaryRecord(raw) {
  try {
    await ensureAdmin();
    const parsed = salarySchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message, errorCode: "VALIDATION" };
    const p = parsed.data;
    const net = Math.round((p.baseSalary + p.bonuses - p.deductions) * 100) / 100;
    if (net < 0) return { success: false, error: "Deductions exceed the salary.", errorCode: "NEGATIVE_NET" };

    const key = { userId_month_year: { userId: p.userId, month: p.month, year: p.year } };
    const existing = await db.salaryRecord.findUnique({ where: key, select: { status: true } });
    // A paid month is in the cash book already; changing it would leave the two disagreeing.
    if (existing?.status === "PAID") return { success: false, error: "This month is already paid.", errorCode: "SALARY_PAID" };
    if (!(await ensureAttendanceStaffUser(p.userId))) {
      return { success: false, error: "Invalid or inactive employee.", errorCode: "INVALID_EMPLOYEE" };
    }

    const amounts = { baseSalary: p.baseSalary, bonuses: p.bonuses, deductions: p.deductions, netSalary: net, notes: p.notes || null };
    const record = await db.salaryRecord.upsert({
      where: key,
      update: amounts,
      create: { userId: p.userId, month: p.month, year: p.year, ...amounts, status: "PENDING" },
    });

    await logAction("CREATE_SALARY", { salaryId: record.id, userId: p.userId });
    revalidatePath("/admin/employees");
    return { success: true, record: { id: record.id } };
  } catch (error) {
    console.error("createSalaryRecord:", error);
    return { success: false, error: error.message };
  }
}

/** Pending salaries for every active employee with a salary on file; months already entered are left alone. */
export async function prepareMonthSalaries(raw) {
  try {
    await ensureAdmin();
    const parsed = salarySchema.pick({ month: true, year: true }).safeParse(raw);
    if (!parsed.success) return { success: false, error: "Invalid month.", errorCode: "VALIDATION" };
    const { month, year } = parsed.data;

    const [staff, existing] = await Promise.all([
      db.user.findMany({ where: { role: { not: "CUSTOMER" }, isActive: true }, select: { id: true, salary: true } }),
      db.salaryRecord.findMany({ where: { month, year }, select: { userId: true } }),
    ]);
    const has = new Set(existing.map((r) => r.userId));
    const due = staff.filter((u) => !has.has(u.id) && Number(u.salary) > 0);
    const noSalary = staff.filter((u) => !has.has(u.id) && !(Number(u.salary) > 0)).length;

    const res = due.length
      ? await db.salaryRecord.createMany({
          data: due.map((u) => ({
            userId: u.id,
            month,
            year,
            baseSalary: Number(u.salary),
            bonuses: 0,
            deductions: 0,
            netSalary: Number(u.salary),
            status: "PENDING",
          })),
          skipDuplicates: true,
        })
      : { count: 0 };

    await logAction("PREPARE_SALARIES", { month, year, created: res.count });
    revalidatePath("/admin/employees");
    return { success: true, created: res.count, skipped: has.size, noSalary };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function markSalaryPaid(id) {
  try {
    await ensureAdmin();
    const existing = await db.salaryRecord.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return { success: false, error: "Salary record not found." };
    if (existing.status === "PAID") return { success: false, error: "Already marked as paid." };
    const record = await db.$transaction(async (tx) => {
      const res = await tx.salaryRecord.updateMany({
        where: { id, status: { not: "PAID" } },
        data: { status: "PAID", paidAt: new Date() },
      });
      if (res.count === 0) throw new Error("Already marked as paid.");
      const paid = await tx.salaryRecord.findUnique({ where: { id }, include: { user: { select: { name: true } } } });
      await bookSalaryPayment(tx, paid);
      return paid;
    });
    revalidatePath("/admin/accounting");
    await logAction("MARK_SALARY_PAID", { salaryId: id });
    revalidatePath("/admin/employees");
    return { success: true, record };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function createLeaveRequest(raw) {
  try {
    await ensureAdmin();
    const parsed = leaveSchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message, errorCode: "VALIDATION" };
    const p = parsed.data;
    const days = shopDaysBetween(p.fromDate, p.toDate);
    if (!days) return { success: false, error: "The leave ends before it starts.", errorCode: "LEAVE_DATES" };
    if (!(await ensureAttendanceStaffUser(p.userId))) {
      return { success: false, error: "Invalid or inactive employee.", errorCode: "INVALID_EMPLOYEE" };
    }

    const leave = await db.leaveRequest.create({
      data: {
        userId: p.userId,
        type: p.type,
        fromDate: new Date(`${p.fromDate}T00:00:00.000Z`),
        toDate: new Date(`${p.toDate}T00:00:00.000Z`),
        days,
        reason: p.reason || null,
        status: "PENDING",
      },
    });

    await logAction("CREATE_LEAVE", { leaveId: leave.id, userId: p.userId });
    revalidatePath("/admin/employees");
    return { success: true, leave: { id: leave.id } };
  } catch (error) {
    console.error("createLeaveRequest:", error);
    return { success: false, error: error.message };
  }
}

/** Approve or reject a pending leave, once. Approval is refused if it overlaps another approved leave. */
export async function reviewLeaveRequest(id, action, notes) {
  try {
    await ensureAdmin();
    if (action !== "approve" && action !== "reject") return { success: false, error: "Invalid action.", errorCode: "VALIDATION" };
    const leave = await db.leaveRequest.findUnique({ where: { id } });
    if (!leave) return { success: false, error: "Leave not found.", errorCode: "NOT_FOUND" };
    if (leave.status !== "PENDING") return { success: false, error: "Already reviewed.", errorCode: "LEAVE_REVIEWED" };

    const status = action === "approve" ? "APPROVED" : "REJECTED";
    const result = await db.$transaction(async (tx) => {
      if (status === "APPROVED") {
        const overlap = await tx.leaveRequest.count({
          where: {
            userId: leave.userId,
            status: "APPROVED",
            id: { not: id },
            fromDate: { lte: leave.toDate },
            toDate: { gte: leave.fromDate },
          },
        });
        if (overlap > 0) return "LEAVE_OVERLAP";
      }
      const res = await tx.leaveRequest.updateMany({
        where: { id, status: "PENDING" },
        data: { status, adminNotes: notes ? String(notes).slice(0, 2000) : null, reviewedAt: new Date() },
      });
      return res.count === 0 ? "LEAVE_REVIEWED" : null;
    });
    if (result) return { success: false, error: result === "LEAVE_OVERLAP" ? "Overlaps another approved leave." : "Already reviewed.", errorCode: result };

    await logAction(status === "APPROVED" ? "APPROVE_LEAVE" : "REJECT_LEAVE", { leaveId: id });
    revalidatePath("/admin/employees");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

const quickFillSchema = z.object({
  date: z.string().min(1),
  mode: z.enum(["PRESENT_DEFAULT", "ABSENT", "COPY_PREVIOUS"]),
  checkIn: z.string().optional().nullable(),
  checkOut: z.string().optional().nullable(),
  onlyMissing: z.boolean().optional().default(true),
});

/**
 * Fill attendance for every active staff member for one calendar day in one action.
 * Respects approved leave (skips) and optional "only missing" to avoid overwriting rows.
 */
export async function quickFillAttendanceForDate(raw) {
  try {
    await ensureAdmin();
    const parsed = quickFillSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid input." };
    }
    const p = parsed.data;
    const day = p.date.slice(0, 10);
    const dateOnly = dayKeyDate(day);
    if (!dateOnly) {
      return { success: false, error: "Invalid date.", errorCode: "INVALID_DATE" };
    }

    const staff = await db.user.findMany({
      where: { role: { not: "CUSTOMER" }, isActive: true },
      select: { id: true },
    });

    let created = 0;
    let skippedAlready = 0;
    let skippedLeave = 0;
    let skippedNoPrevious = 0;
    let failed = 0;

    const dayStart = new Date(`${day}T00:00:00.000Z`);

    for (const { id: userId } of staff) {
      if (p.onlyMissing) {
        const exists = await db.attendance.findUnique({
          where: { userId_date: { userId, date: dateOnly } },
        });
        if (exists) {
          skippedAlready++;
          continue;
        }
      }

      const onLeave = await hasApprovedLeaveOnDay(userId, day);

      if (p.mode === "PRESENT_DEFAULT") {
        if (onLeave) {
          skippedLeave++;
          continue;
        }
        const cin = (p.checkIn && String(p.checkIn).trim()) || "09:00";
        const cout = (p.checkOut && String(p.checkOut).trim()) || "17:00";
        const res = await createAttendance({
          userId,
          date: p.date,
          status: "PRESENT",
          checkIn: cin,
          checkOut: cout,
          notes: null,
        });
        if (res.success) created++;
        else failed++;
        continue;
      }

      if (p.mode === "ABSENT") {
        if (onLeave) {
          skippedLeave++;
          continue;
        }
        const res = await createAttendance({
          userId,
          date: p.date,
          status: "ABSENT",
          checkIn: "",
          checkOut: "",
          notes: null,
        });
        if (res.success) created++;
        else failed++;
        continue;
      }

      if (p.mode === "COPY_PREVIOUS") {
        if (onLeave) {
          skippedLeave++;
          continue;
        }
        const prev = await db.attendance.findFirst({
          where: { userId, date: { lt: dayStart } },
          orderBy: { date: "desc" },
        });
        if (!prev) {
          skippedNoPrevious++;
          continue;
        }

        const status = prev.status;
        let checkIn = "";
        let checkOut = "";
        if (status !== "ABSENT" && status !== "HOLIDAY") {
          checkIn = shopClockOf(prev.checkIn);
          checkOut = shopClockOf(prev.checkOut);
        }

        const res = await createAttendance({
          userId,
          date: p.date,
          status,
          checkIn,
          checkOut,
          notes: prev.notes || null,
        });
        if (res.success) created++;
        else failed++;
      }
    }

    revalidatePath("/admin/employees");
    return {
      success: true,
      created,
      skippedAlready,
      skippedLeave,
      skippedNoPrevious,
      failed,
      totalStaff: staff.length,
    };
  } catch (error) {
    console.error("quickFillAttendanceForDate:", error);
    return { success: false, error: error.message };
  }
}

export async function getAllStaff() {
  try {
    await ensureAdmin();
    const staff = await db.user.findMany({
      where: { role: { not: "CUSTOMER" }, isActive: true },
      select: { id: true, firstName: true, lastName: true, role: true, salary: true, avatar: true },
      orderBy: { firstName: "asc" },
    });
    return staff;
  } catch (error) {
    return [];
  }
}
