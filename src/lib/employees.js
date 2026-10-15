import { prisma as db } from "@/lib/prisma";
import { shopAddDays, shopToday } from "@/lib/shop-time";

/**
 * Attendance and leave rows are keyed by calendar date (UTC noon / midnight of that date), so
 * ranges are whole calendar dates; "today" comes from the shop's clock.
 */
function dayRange(from, to = from) {
  return { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T23:59:59.999Z`) };
}

function monthDays(year, month) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return [`${year}-${mm}-01`, `${year}-${mm}-${String(last).padStart(2, "0")}`];
}

function n(v) {
  if (v == null) return 0;
  if (typeof v?.toNumber === "function") return v.toNumber();
  return Number(v) || 0;
}

const STAFF_ROLES = { not: "CUSTOMER" };

export async function getEmployeeKpis() {
  const today = shopToday();
  const { gte: todayStart, lte: todayEnd } = dayRange(today);

  const [total, leaveRows, absentToday, upcomingLeaves, staffRows, attendanceTodayDistinct] =
    await Promise.all([
      db.user.count({ where: { role: STAFF_ROLES, isActive: true } }),
      db.leaveRequest.findMany({
        where: {
          status: "APPROVED",
          fromDate: { lte: todayEnd },
          toDate: { gte: todayStart },
        },
        select: { userId: true },
        distinct: ["userId"],
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
          fromDate: dayRange(shopAddDays(today, 1), shopAddDays(today, 7)),
        },
        include: { user: { select: { firstName: true, lastName: true, role: true, avatar: true } } },
        orderBy: { fromDate: "asc" },
        take: 8,
      }),
      db.user.findMany({
        where: { role: STAFF_ROLES, isActive: true },
        select: { id: true },
      }),
      db.attendance.findMany({
        where: { date: { gte: todayStart, lte: todayEnd } },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);

  const onLeaveToday = leaveRows.length;
  const leaveUserIds = new Set(leaveRows.map((r) => r.userId));
  const recordedUserIds = new Set(attendanceTodayDistinct.map((r) => r.userId));
  let missingAttendanceToday = 0;
  for (const { id } of staffRows) {
    if (leaveUserIds.has(id)) continue;
    if (!recordedUserIds.has(id)) missingAttendanceToday++;
  }

  const active = Math.max(0, total - onLeaveToday);

  return {
    total,
    active,
    onLeaveToday,
    absentToday,
    missingAttendanceToday,
    upcomingLeaves,
  };
}

export async function getAttendanceLast30Days() {
  const today = shopToday();
  const records = await db.attendance.groupBy({
    by: ["date", "status"],
    where: { date: dayRange(shopAddDays(today, -29), today) },
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
  const where = {
    date: dayRange(...monthDays(year, month)),
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
  // Leaves that touch the month, including ones that started before it.
  const range = month && year ? dayRange(...monthDays(year, month)) : null;
  const where = {
    ...(range ? { fromDate: { lte: range.lte }, toDate: { gte: range.gte } } : {}),
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
