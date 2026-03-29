import { prisma as db } from "@/lib/prisma";

function n(v) {
  if (v == null) return 0;
  if (typeof v?.toNumber === "function") return v.toNumber();
  return Number(v) || 0;
}

const STAFF_ROLES = { not: "CUSTOMER" };

export async function getEmployeeKpis() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [total, onLeaveToday, absentToday, upcomingLeaves] = await Promise.all([
    db.user.count({ where: { role: STAFF_ROLES, isActive: true } }),
    db.leaveRequest.count({
      where: {
        status: "APPROVED",
        fromDate: { lte: todayEnd },
        toDate: { gte: todayStart },
      },
    }),
    db.attendance.count({
      where: {
        status: "ABSENT",
        date: { gte: todayStart, lte: todayEnd },
      },
    }),
    db.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        fromDate: { gte: now, lte: weekEnd },
      },
      include: { user: { select: { firstName: true, lastName: true, role: true, avatar: true } } },
      orderBy: { fromDate: "asc" },
      take: 8,
    }),
  ]);

  const active = total - onLeaveToday;

  return { total, active, onLeaveToday, absentToday, upcomingLeaves };
}

export async function getAttendanceLast30Days() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);

  const records = await db.attendance.groupBy({
    by: ["date", "status"],
    where: { date: { gte: start, lte: end } },
    _count: { id: true },
  });

  const byDate = new Map();
  for (const r of records) {
    const d = r.date.toISOString().split("T")[0];
    if (!byDate.has(d)) byDate.set(d, { date: d, present: 0, absent: 0, late: 0 });
    const b = byDate.get(d);
    if (r.status === "PRESENT") b.present += r._count.id;
    else if (r.status === "ABSENT") b.absent += r._count.id;
    else if (r.status === "LATE") b.late += r._count.id;
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getDepartmentBreakdown() {
  const rows = await db.user.groupBy({
    by: ["department"],
    where: { role: STAFF_ROLES, isActive: true },
    _count: { id: true },
  });
  return rows
    .filter((r) => r.department)
    .map((r) => ({ name: r.department || "Other", value: r._count.id }));
}

export async function getRoleBreakdown() {
  const rows = await db.user.groupBy({
    by: ["role"],
    where: { isActive: true, role: STAFF_ROLES },
    _count: { id: true },
  });
  return rows.map((r) => ({ name: r.role, value: r._count.id }));
}

export async function getRecentHrActivity(limit = 10) {
  const logs = await db.auditLog.findMany({
    where: {
      action: {
        in: [
          "CREATE_EMPLOYEE",
          "UPDATE_EMPLOYEE",
          "DELETE_EMPLOYEE",
          "CREATE_ATTENDANCE",
          "UPDATE_ATTENDANCE",
          "CREATE_LEAVE",
          "APPROVE_LEAVE",
          "REJECT_LEAVE",
          "CREATE_SALARY",
          "MARK_SALARY_PAID",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  return logs;
}

export async function getAttendanceSummary({ userId, month, year }) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const where = {
    date: { gte: start, lte: end },
    ...(userId && userId !== "all" ? { userId } : {}),
  };

  const rows = await db.attendance.findMany({
    where,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
    },
    orderBy: [{ date: "desc" }, { userId: "asc" }],
  });

  const byEmployee = new Map();
  for (const r of rows) {
    const eid = r.userId;
    if (!byEmployee.has(eid)) {
      byEmployee.set(eid, {
        userId: eid,
        name: `${r.user.firstName || ""} ${r.user.lastName || ""}`.trim(),
        avatar: r.user.avatar,
        present: 0,
        absent: 0,
        late: 0,
        halfDay: 0,
        holiday: 0,
        totalDays: 0,
      });
    }
    const e = byEmployee.get(eid);
    e.totalDays++;
    if (r.status === "PRESENT") e.present++;
    else if (r.status === "ABSENT") e.absent++;
    else if (r.status === "LATE") e.late++;
    else if (r.status === "HALF_DAY") e.halfDay++;
    else if (r.status === "HOLIDAY") e.holiday++;
  }

  const alert3Absent = Array.from(byEmployee.values()).filter((e) => e.absent >= 3);

  return {
    rows,
    summaryByEmployee: Array.from(byEmployee.values()),
    alert3Absent,
  };
}

export async function getPayrollSummary({ month, year, status }) {
  const where = {
    month,
    year,
    ...(status && status !== "all" ? { status } : {}),
  };

  const records = await db.salaryRecord.findMany({
    where,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totals = records.reduce(
    (acc, r) => {
      acc.totalBase += n(r.baseSalary);
      acc.totalBonuses += n(r.bonuses);
      acc.totalDeductions += n(r.deductions);
      acc.totalNet += n(r.netSalary);
      return acc;
    },
    { totalBase: 0, totalBonuses: 0, totalDeductions: 0, totalNet: 0 }
  );

  return { records, totals };
}

export async function getLeaveSummary({ month, year, userId, status, type }) {
  const start = month && year ? new Date(year, month - 1, 1) : undefined;
  const end = month && year ? new Date(year, month, 0, 23, 59, 59, 999) : undefined;

  const where = {
    ...(start && end ? { fromDate: { gte: start, lte: end } } : {}),
    ...(userId && userId !== "all" ? { userId } : {}),
    ...(status && status !== "all" ? { status } : {}),
    ...(type && type !== "all" ? { type } : {}),
  };

  const leaves = await db.leaveRequest.findMany({
    where,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return leaves;
}

export async function getEmployeeLeaveBalance(userId) {
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const leaves = await db.leaveRequest.findMany({
    where: {
      userId,
      status: "APPROVED",
      fromDate: { gte: yearStart },
    },
  });

  const used = { ANNUAL: 0, SICK: 0, EMERGENCY: 0, UNPAID: 0 };
  for (const l of leaves) used[l.type] = (used[l.type] || 0) + l.days;

  return {
    ANNUAL: { used: used.ANNUAL, total: 21, remaining: Math.max(0, 21 - used.ANNUAL) },
    SICK: { used: used.SICK, total: 15, remaining: Math.max(0, 15 - used.SICK) },
    EMERGENCY: { used: used.EMERGENCY, total: 3, remaining: Math.max(0, 3 - used.EMERGENCY) },
    UNPAID: { used: used.UNPAID, total: 999, remaining: 999 },
  };
}
