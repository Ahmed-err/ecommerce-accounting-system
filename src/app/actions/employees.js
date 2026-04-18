"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { logAction } from "@/lib/audit";
import { z } from "zod";

const attendanceSchema = z.object({
  userId: z.string().min(1),
  date: z.string().min(1),
  checkIn: z.string().optional().nullable(),
  checkOut: z.string().optional().nullable(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "HALF_DAY", "HOLIDAY"]),
  notes: z.string().max(500).optional().nullable(),
});

function normalizeAttendanceCalendarDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 1970 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const cal = new Date(y, mo - 1, d, 12, 0, 0, 0);
  if (cal.getFullYear() !== y || cal.getMonth() !== mo - 1 || cal.getDate() !== d) return null;
  return cal;
}

function dayBoundsFromCalendarDate(calDate) {
  const y = calDate.getFullYear();
  const m = calDate.getMonth();
  const d = calDate.getDate();
  return {
    dayStart: new Date(y, m, d, 0, 0, 0, 0),
    dayEnd: new Date(y, m, d, 23, 59, 59, 999),
  };
}

function dateToLocalHHMM(dt) {
  if (!dt) return "";
  const x = new Date(dt);
  const h = String(x.getHours()).padStart(2, "0");
  const min = String(x.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

function parseClockOnDay(calDate, timeOrIso) {
  if (timeOrIso == null) return null;
  const s = String(timeOrIso).trim();
  if (!s) return null;
  if (s.includes("T")) {
    const dt = new Date(s);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const hm = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!hm) return null;
  const h = Number(hm[1]);
  const min = Number(hm[2]);
  if (h > 23 || min > 59) return null;
  return new Date(calDate.getFullYear(), calDate.getMonth(), calDate.getDate(), h, min, 0, 0);
}

function resolveStatusAndClocks(status, calDate, rawIn, rawOut) {
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
  const checkIn = parseClockOnDay(calDate, rawIn);
  const checkOut = parseClockOnDay(calDate, rawOut);
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

async function hasApprovedLeaveOnCalendarDay(userId, calDate) {
  const { dayStart, dayEnd } = dayBoundsFromCalendarDate(calDate);
  const n = await db.leaveRequest.count({
    where: {
      userId,
      status: "APPROVED",
      fromDate: { lte: dayEnd },
      toDate: { gte: dayStart },
    },
  });
  return n > 0;
}

function attendanceLeaveConflict(status, onLeave) {
  if (!onLeave) return null;
  if (status === "ABSENT") return "LEAVE_ABSENT";
  if (status === "PRESENT" || status === "LATE") return "LEAVE_PRESENT";
  return null;
}

const salarySchema = z.object({
  userId: z.string().min(1),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  baseSalary: z.coerce.number().positive(),
  bonuses: z.coerce.number().min(0),
  deductions: z.coerce.number().min(0),
  notes: z.string().max(1000).optional().nullable(),
});

const leaveSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(["ANNUAL", "SICK", "EMERGENCY", "UNPAID"]),
  fromDate: z.string().min(1),
  toDate: z.string().min(1),
  reason: z.string().max(2000).optional().nullable(),
});

async function ensureAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Only Admins can manage employees.");
  }
  return session.user;
}

export async function getEmployees({
  search = "",
  role = "all",
  department = "",
  page = 1,
  limit = 10,
} = {}) {
  try {
     const session = await auth();
     if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
        return { employees: [], total: 0 };
     }
    const where = {
      role: { not: "CUSTOMER" },
      isActive: true,
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
    if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
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
    if (!data.email || !data.firstName || !data.lastName || !data.password) {
      return { success: false, error: "Missing required fields." };
    }

    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return { success: false, error: "A user with this email already exists." };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const employee = await db.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        password: hashedPassword,
        phone: data.phone || null,
        role: data.role || "CASHIER",
        salary: data.salary ? parseFloat(data.salary) : null,
        hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
        department: data.department || null,
      },
    });

    await logAction("CREATE_EMPLOYEE", { employeeId: employee.id, name: employee.name, role: employee.role });

    revalidatePath("/admin/employees");
    return { success: true, employee };
  } catch (error) {
    console.error("Failed to create employee:", error);
    return { success: false, error: error.message };
  }
}

export async function updateEmployee(id, data) {
  try {
    await ensureAdmin();
    const updateData = {
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${data.firstName} ${data.lastName}`,
      phone: data.phone || null,
      role: data.role,
      salary: data.salary ? parseFloat(data.salary) : null,
      hireDate: data.hireDate ? new Date(data.hireDate) : null,
      department: data.department || null,
    };

    // Only update password if provided
    if (data.password && data.password.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(data.password, salt);
    }

    const employee = await db.user.update({
      where: { id },
      data: updateData,
    });

    await logAction("UPDATE_EMPLOYEE", { employeeId: id, updatedFields: Object.keys(updateData) });

    revalidatePath("/admin/employees");
    return { success: true, employee };
  } catch (error) {
    console.error("Failed to update employee:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteEmployee(id) {
  try {
    const admin = await ensureAdmin();
    if (admin.id === id) {
      return { success: false, error: "You cannot delete your own admin account." };
    }
    const target = await db.user.findFirst({
      where: { id, role: { not: "CUSTOMER" } },
      select: { id: true },
    });
    if (!target) {
      return { success: false, error: "Employee not found." };
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
    const now = new Date();
    const month = query.month ? parseInt(query.month) : now.getMonth() + 1;
    const year = query.year ? parseInt(query.year) : now.getFullYear();

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
    const dateOnly = normalizeAttendanceCalendarDate(p.date);
    if (!dateOnly) {
      return { success: false, error: "Invalid date.", errorCode: "INVALID_DATE" };
    }

    const staff = await ensureAttendanceStaffUser(p.userId);
    if (!staff) {
      return { success: false, error: "Invalid or inactive employee.", errorCode: "INVALID_EMPLOYEE" };
    }

    const { checkIn, checkOut, errorCode } = resolveStatusAndClocks(
      p.status,
      dateOnly,
      p.checkIn,
      p.checkOut
    );
    if (errorCode) {
      return { success: false, error: "Attendance validation failed.", errorCode };
    }

    const onLeave = await hasApprovedLeaveOnCalendarDay(p.userId, dateOnly);
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

    const calFromExisting = new Date(existing.date);
    const dateOnly =
      p.date != null && p.date !== ""
        ? normalizeAttendanceCalendarDate(p.date)
        : new Date(calFromExisting.getFullYear(), calFromExisting.getMonth(), calFromExisting.getDate(), 12, 0, 0, 0);
    if (!dateOnly) {
      return { success: false, error: "Invalid date.", errorCode: "INVALID_DATE" };
    }

    const status = p.status ?? existing.status;
    const rawIn =
      p.checkIn !== undefined ? p.checkIn : dateToLocalHHMM(existing.checkIn);
    const rawOut =
      p.checkOut !== undefined ? p.checkOut : dateToLocalHHMM(existing.checkOut);

    const { checkIn, checkOut, errorCode } = resolveStatusAndClocks(status, dateOnly, rawIn, rawOut);
    if (errorCode) {
      return { success: false, error: "Attendance validation failed.", errorCode };
    }

    const userId = existing.userId;
    const staff = await ensureAttendanceStaffUser(userId);
    if (!staff) {
      return { success: false, error: "Invalid or inactive employee.", errorCode: "INVALID_EMPLOYEE" };
    }

    const onLeave = await hasApprovedLeaveOnCalendarDay(userId, dateOnly);
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
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
    const p = parsed.data;
    const net = p.baseSalary + p.bonuses - p.deductions;

    const record = await db.salaryRecord.upsert({
      where: { userId_month_year: { userId: p.userId, month: p.month, year: p.year } },
      update: {
        baseSalary: p.baseSalary,
        bonuses: p.bonuses,
        deductions: p.deductions,
        netSalary: net,
        notes: p.notes || null,
      },
      create: {
        userId: p.userId,
        month: p.month,
        year: p.year,
        baseSalary: p.baseSalary,
        bonuses: p.bonuses,
        deductions: p.deductions,
        netSalary: net,
        notes: p.notes || null,
        status: "PENDING",
      },
    });

    await logAction("CREATE_SALARY", { salaryId: record.id, userId: p.userId });
    revalidatePath("/admin/employees");
    return { success: true, record };
  } catch (error) {
    console.error("createSalaryRecord:", error);
    return { success: false, error: error.message };
  }
}

export async function markSalaryPaid(id) {
  try {
    await ensureAdmin();
    const existing = await db.salaryRecord.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return { success: false, error: "Salary record not found." };
    if (existing.status === "PAID") return { success: false, error: "Already marked as paid." };
    const record = await db.salaryRecord.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date() },
    });
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
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
    const p = parsed.data;
    const from = new Date(p.fromDate);
    const to = new Date(p.toDate);
    const days = Math.max(1, Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1);

    const leave = await db.leaveRequest.create({
      data: {
        userId: p.userId,
        type: p.type,
        fromDate: from,
        toDate: to,
        days,
        reason: p.reason || null,
        status: "PENDING",
      },
    });

    await logAction("CREATE_LEAVE", { leaveId: leave.id, userId: p.userId });
    revalidatePath("/admin/employees");
    return { success: true, leave };
  } catch (error) {
    console.error("createLeaveRequest:", error);
    return { success: false, error: error.message };
  }
}

export async function reviewLeaveRequest(id, action, notes) {
  try {
    await ensureAdmin();
    const status = action === "approve" ? "APPROVED" : "REJECTED";
    const leave = await db.leaveRequest.update({
      where: { id },
      data: { status, adminNotes: notes || null, reviewedAt: new Date() },
    });
    await logAction(action === "approve" ? "APPROVE_LEAVE" : "REJECT_LEAVE", { leaveId: id });
    revalidatePath("/admin/employees");
    return { success: true, leave };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function bulkMarkAttendance(entries) {
  try {
    await ensureAdmin();
    const results = await Promise.allSettled(entries.map((e) => createAttendance(e)));
    const failed = results.filter(
      (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value?.success)
    ).length;
    revalidatePath("/admin/employees");
    return { success: true, total: entries.length, failed };
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

function clockToHHMMOnTargetDay(prevDt, targetCalDate) {
  if (!prevDt) return "";
  const s = new Date(prevDt);
  const t = new Date(
    targetCalDate.getFullYear(),
    targetCalDate.getMonth(),
    targetCalDate.getDate(),
    s.getHours(),
    s.getMinutes(),
    0,
    0
  );
  return dateToLocalHHMM(t);
}

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
    const dateOnly = normalizeAttendanceCalendarDate(p.date);
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

    const dayStart = new Date(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate(), 0, 0, 0, 0);

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

      const onLeave = await hasApprovedLeaveOnCalendarDay(userId, dateOnly);

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
          checkIn = clockToHHMMOnTargetDay(prev.checkIn, dateOnly);
          checkOut = clockToHHMMOnTargetDay(prev.checkOut, dateOnly);
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
