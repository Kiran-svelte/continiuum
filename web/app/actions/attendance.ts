"use server";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================================
// TYPES
// ============================================================================

export interface AttendanceEntry {
  type: string;
  time: string;
}

export interface TodayAttendance {
  id: string | null;
  status: "not_checked_in" | "checked_in" | "on_break" | "checked_out";
  checkIn: string | null;
  checkOut: string | null;
  totalHours: number | null;
  lateMinutes: number;
  overtimeMinutes: number;
  isWfh: boolean;
  shiftName: string | null;
  activities: AttendanceEntry[];
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get the effective shift for an employee on a given date.
 * Falls back to company defaults if no shift assigned.
 */
async function getEffectiveShift(empId: string, date: Date) {
  // Try to find an active employee shift assignment
  const assignment = await prisma.employeeShift.findFirst({
    where: {
      emp_id: empId,
      is_active: true,
      effective_from: { lte: date },
      OR: [
        { effective_to: null },
        { effective_to: { gte: date } },
      ],
    },
    include: { shift: true },
    orderBy: { effective_from: "desc" },
  });

  if (assignment?.shift) {
    return {
      shiftId: assignment.shift.id,
      shiftName: assignment.shift.name,
      startTime: assignment.shift.start_time,
      endTime: assignment.shift.end_time,
      graceMinutes: assignment.shift.grace_minutes,
      breakMinutes: assignment.shift.break_minutes,
      isOvernight: assignment.shift.is_overnight,
    };
  }

  // Look for the company's default shift
  const employee = await prisma.employee.findUnique({
    where: { emp_id: empId },
    select: { org_id: true },
  });

  if (employee?.org_id) {
    const defaultShift = await prisma.shift.findFirst({
      where: {
        company_id: employee.org_id,
        is_default: true,
        is_active: true,
        deleted_at: null,
      },
    });

    if (defaultShift) {
      return {
        shiftId: defaultShift.id,
        shiftName: defaultShift.name,
        startTime: defaultShift.start_time,
        endTime: defaultShift.end_time,
        graceMinutes: defaultShift.grace_minutes,
        breakMinutes: defaultShift.break_minutes,
        isOvernight: defaultShift.is_overnight,
      };
    }

    // Fall back to company settings
    const company = await prisma.company.findUnique({
      where: { id: employee.org_id },
      select: {
        work_start_time: true,
        work_end_time: true,
        grace_period_mins: true,
      },
    });

    return {
      shiftId: null,
      shiftName: "Default",
      startTime: company?.work_start_time || "09:00",
      endTime: company?.work_end_time || "18:00",
      graceMinutes: company?.grace_period_mins || 15,
      breakMinutes: 60,
      isOvernight: false,
    };
  }

  // Absolute fallback
  return {
    shiftId: null,
    shiftName: "Default",
    startTime: "09:00",
    endTime: "18:00",
    graceMinutes: 15,
    breakMinutes: 60,
    isOvernight: false,
  };
}

/**
 * Parse a time string like "09:00" into hours and minutes.
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(":").map(Number);
  return { hours: h || 0, minutes: m || 0 };
}

/**
 * Calculate late minutes based on check-in time vs shift start + grace.
 */
function calculateLateMinutes(
  checkIn: Date,
  shiftStart: string,
  graceMinutes: number
): number {
  const { hours, minutes } = parseTime(shiftStart);
  const threshold = new Date(checkIn);
  threshold.setHours(hours, minutes + graceMinutes, 0, 0);

  if (checkIn > threshold) {
    return Math.ceil((checkIn.getTime() - threshold.getTime()) / (1000 * 60));
  }
  return 0;
}

/**
 * Calculate overtime minutes based on check-out time vs shift end.
 */
function calculateOvertimeMinutes(
  checkOut: Date,
  shiftEnd: string,
  breakMinutes: number
): number {
  const { hours, minutes } = parseTime(shiftEnd);
  const endTime = new Date(checkOut);
  endTime.setHours(hours, minutes, 0, 0);

  if (checkOut > endTime) {
    // Subtract any break time that overlaps
    const rawOvertime = Math.ceil(
      (checkOut.getTime() - endTime.getTime()) / (1000 * 60)
    );
    return Math.max(0, rawOvertime);
  }
  return 0;
}

// ============================================================================
// GET TODAY'S ATTENDANCE
// ============================================================================

export async function getTodayAttendance(): Promise<{
  success: boolean;
  data?: TodayAttendance;
  error?: string;
}> {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
    });
    if (!employee) return { success: false, error: "Employee not found" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findUnique({
      where: {
        emp_id_date: { emp_id: employee.emp_id, date: today },
      },
    });

    // Get shift info
    const shift = await getEffectiveShift(employee.emp_id, today);

    const activities: AttendanceEntry[] = [];
    if (attendance?.check_in) {
      activities.push({ type: "Check In", time: attendance.check_in.toISOString() });
    }
    if (attendance?.check_out) {
      activities.push({ type: "Check Out", time: attendance.check_out.toISOString() });
    }

    let status: TodayAttendance["status"] = "not_checked_in";
    if (attendance?.check_in && attendance?.check_out) {
      status = "checked_out";
    } else if (attendance?.check_in && !attendance?.check_out) {
      status = attendance.status === "ON_BREAK" ? "on_break" : "checked_in";
    }

    return {
      success: true,
      data: {
        id: attendance?.id || null,
        status,
        checkIn: attendance?.check_in?.toISOString() || null,
        checkOut: attendance?.check_out?.toISOString() || null,
        totalHours: attendance?.total_hours ? Number(attendance.total_hours) : null,
        lateMinutes: attendance?.late_minutes || 0,
        overtimeMinutes: attendance?.overtime_minutes || 0,
        isWfh: attendance?.is_wfh || false,
        shiftName: shift.shiftName,
        activities: activities.reverse(),
      },
    };
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return { success: false, error: "Failed to fetch attendance" };
  }
}

// ============================================================================
// CLOCK IN (with shift-based late detection & WFH/location support)
// ============================================================================

export async function clockIn(options?: {
  isWfh?: boolean;
  location?: { lat: number; lng: number; address?: string };
}): Promise<{ success: boolean; error?: string; lateMinutes?: number }> {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      include: { company: true },
    });
    if (!employee) return { success: false, error: "Employee not found" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    // Get effective shift for today
    const shift = await getEffectiveShift(employee.emp_id, today);

    // Check if today is a work day
    const workDays = (employee.company?.work_days as number[]) || [1, 2, 3, 4, 5];
    const todayDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    if (!workDays.includes(todayDayOfWeek)) {
      return { success: false, error: "Today is not a scheduled work day" };
    }

    // Calculate lateness based on shift start + grace
    const lateMinutes = calculateLateMinutes(
      now,
      shift.startTime,
      shift.graceMinutes
    );
    const status = lateMinutes > 0 ? "LATE" : "PRESENT";

    try {
      const existing = await prisma.attendance.findUnique({
        where: {
          emp_id_date: { emp_id: employee.emp_id, date: today },
        },
      });

      if (existing?.check_in) {
        return { success: false, error: "Already clocked in today" };
      }

      await prisma.attendance.upsert({
        where: {
          emp_id_date: { emp_id: employee.emp_id, date: today },
        },
        create: {
          emp_id: employee.emp_id,
          date: today,
          check_in: now,
          status,
          shift_id: shift.shiftId,
          late_minutes: lateMinutes,
          is_wfh: options?.isWfh || false,
          check_in_location: options?.location || undefined,
        },
        update: {
          check_in: now,
          status,
          shift_id: shift.shiftId,
          late_minutes: lateMinutes,
          is_wfh: options?.isWfh || false,
          check_in_location: options?.location || undefined,
        },
      });
    } catch (dbError: any) {
      if (dbError?.code === "P2002") {
        return { success: false, error: "Already clocked in today" };
      }
      throw dbError;
    }

    revalidatePath("/employee/attendance");
    return { success: true, lateMinutes };
  } catch (error) {
    console.error("Error clocking in:", error);
    return { success: false, error: "Failed to clock in" };
  }
}

// ============================================================================
// CLOCK OUT (with overtime calculation)
// ============================================================================

export async function clockOut(options?: {
  location?: { lat: number; lng: number; address?: string };
}): Promise<{
  success: boolean;
  error?: string;
  totalHours?: number;
  overtimeMinutes?: number;
}> {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      include: { company: true },
    });
    if (!employee) return { success: false, error: "Employee not found" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const attendance = await prisma.attendance.findUnique({
      where: {
        emp_id_date: { emp_id: employee.emp_id, date: today },
      },
    });

    if (!attendance) return { success: false, error: "Not clocked in today" };
    if (attendance.check_out) return { success: false, error: "Already clocked out" };

    // Get shift for overtime calculation
    const shift = await getEffectiveShift(employee.emp_id, today);

    const halfDayHours = Number(employee.company?.half_day_hours) || 4;
    const fullDayHours = Number(employee.company?.full_day_hours) || 8;

    const checkIn = attendance.check_in!;
    const diffMs = now.getTime() - checkIn.getTime();
    const totalHours = diffMs / (1000 * 60 * 60);

    // Calculate overtime based on shift end
    const overtime = calculateOvertimeMinutes(
      now,
      shift.endTime,
      shift.breakMinutes
    );

    // Determine final status
    let status = attendance.status;
    if (totalHours < halfDayHours) {
      status = "HALF_DAY";
    } else if (totalHours >= fullDayHours) {
      status = status === "LATE" ? "LATE" : "PRESENT";
    }

    const roundedHours = Math.round(totalHours * 100) / 100;

    await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        check_out: now,
        total_hours: roundedHours,
        status,
        overtime_minutes: overtime,
        check_out_location: options?.location || undefined,
      },
    });

    revalidatePath("/employee/attendance");
    return { success: true, totalHours: roundedHours, overtimeMinutes: overtime };
  } catch (error) {
    console.error("Error clocking out:", error);
    return { success: false, error: "Failed to clock out" };
  }
}

// ============================================================================
// BREAK MANAGEMENT
// ============================================================================

export async function startBreak(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
    });
    if (!employee) return { success: false, error: "Employee not found" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findUnique({
      where: {
        emp_id_date: { emp_id: employee.emp_id, date: today },
      },
    });

    if (!attendance || attendance.check_out) {
      return { success: false, error: "Not currently checked in" };
    }

    await prisma.attendance.update({
      where: { id: attendance.id },
      data: { status: "ON_BREAK" },
    });

    revalidatePath("/employee/attendance");
    return { success: true };
  } catch (error) {
    console.error("Error starting break:", error);
    return { success: false, error: "Failed to start break" };
  }
}

export async function endBreak(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
    });
    if (!employee) return { success: false, error: "Employee not found" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findUnique({
      where: {
        emp_id_date: { emp_id: employee.emp_id, date: today },
      },
    });

    if (!attendance || attendance.status !== "ON_BREAK") {
      return { success: false, error: "Not currently on break" };
    }

    await prisma.attendance.update({
      where: { id: attendance.id },
      data: { status: "PRESENT" },
    });

    revalidatePath("/employee/attendance");
    return { success: true };
  } catch (error) {
    console.error("Error ending break:", error);
    return { success: false, error: "Failed to end break" };
  }
}

// ============================================================================
// ATTENDANCE HISTORY (enhanced with shift/overtime/WFH data)
// ============================================================================

export async function getAttendanceHistory(days: number = 30): Promise<{
  success: boolean;
  data?: Array<{
    date: string;
    checkIn: string | null;
    checkOut: string | null;
    totalHours: number | null;
    status: string;
    lateMinutes: number;
    overtimeMinutes: number;
    isWfh: boolean;
    shiftId: string | null;
  }>;
  error?: string;
}> {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
    });
    if (!employee) return { success: false, error: "Employee not found" };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const attendances = await prisma.attendance.findMany({
      where: {
        emp_id: employee.emp_id,
        date: { gte: startDate },
      },
      orderBy: { date: "desc" },
    });

    return {
      success: true,
      data: attendances.map((a) => ({
        date: a.date.toISOString(),
        checkIn: a.check_in?.toISOString() || null,
        checkOut: a.check_out?.toISOString() || null,
        totalHours: a.total_hours ? Number(a.total_hours) : null,
        status: a.status,
        lateMinutes: a.late_minutes,
        overtimeMinutes: a.overtime_minutes,
        isWfh: a.is_wfh,
        shiftId: a.shift_id,
      })),
    };
  } catch (error) {
    console.error("Error fetching attendance history:", error);
    return { success: false, error: "Failed to fetch attendance history" };
  }
}
