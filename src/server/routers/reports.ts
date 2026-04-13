import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';

// -----------------------------------------------------------------------
// Shared helpers
// -----------------------------------------------------------------------

/** Compute seniority in years from startDate to referenceDate (default: now). */
function seniorityYears(startDate: Date, referenceDate: Date = new Date()): number {
  const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
  return parseFloat(((referenceDate.getTime() - new Date(startDate).getTime()) / msPerYear).toFixed(1));
}

/** Format a date as a monthly label "YYYY-MM". */
function toMonthLabel(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

type SalaryEntry = {
  effectiveDate?: string;
  salaryAmount?: string;
  salaryCurrency?: string;
  salaryType?: string;
  contractType?: string;
  note?: string;
};

/**
 * Get the most recent salary entry on or before referenceDate.
 * Falls back to the first entry if none qualify (e.g. all future entries).
 */
function getCurrentSalaryEntry(history: SalaryEntry[], referenceDate: Date = new Date()): SalaryEntry | null {
  if (!history || history.length === 0) return null;
  const past = history
    .filter(e => e.effectiveDate && new Date(e.effectiveDate) <= referenceDate)
    .sort((a, b) => new Date(b.effectiveDate!).getTime() - new Date(a.effectiveDate!).getTime());
  return past[0] ?? history[0];
}

function parseSalaryHistory(workInfo: string): SalaryEntry[] {
  try {
    const wi = JSON.parse(workInfo || '{}');
    return Array.isArray(wi.salaryHistory) ? wi.salaryHistory : [];
  } catch {
    return [];
  }
}

// -----------------------------------------------------------------------
// Input schemas
// -----------------------------------------------------------------------

const terminationReportSchema = z.object({
  department: z.string().optional(),
  startDate:  z.coerce.date().optional(),
  endDate:    z.coerce.date().optional(),
  role:       z.string().optional(),
});

const activeReportSchema = z.object({
  department: z.string().optional(),
  role:       z.string().optional(),
});

const salaryReportSchema = z.object({
  department:   z.string().optional(),
  role:         z.string().optional(),
  increaseType: z.string().optional(),
});

const totalCostSchema = z.object({
  startDate:    z.coerce.date(),
  endDate:      z.coerce.date(),
  department:   z.string().optional(),
  increaseType: z.string().optional(),
});

// -----------------------------------------------------------------------
// Helper: build department filter clause
// -----------------------------------------------------------------------
function deptFilter(department?: string) {
  if (!department) return undefined;
  return { name: { equals: department, mode: 'insensitive' as const } };
}

// -----------------------------------------------------------------------
// Router
// -----------------------------------------------------------------------

export const reportsRouter = router({
  // ------------------------------------------------------------------
  // 1. Termination Report
  // ------------------------------------------------------------------
  getTerminationReport: protectedProcedure
    .input(terminationReportSchema)
    .query(async ({ ctx, input }) => {
      const where: any = {
        companyId: ctx.user.companyId,
        status: 'TERMINATED',
      };
      if (input.department) where.department = deptFilter(input.department);
      if (input.startDate || input.endDate) {
        where.endDate = {};
        if (input.startDate) where.endDate.gte = input.startDate;
        if (input.endDate)   where.endDate.lte = input.endDate;
      }

      const employees = await ctx.db.employee.findMany({
        where,
        include: { department: { select: { name: true } } },
        orderBy: { endDate: 'desc' },
      });

      const rows = employees.map((emp: any) => {
        const workInfo = JSON.parse(emp.workInfo || '{}');
        return {
          name: `${emp.firstName} ${emp.lastName}`,
          department: emp.department?.name ?? '',
          seniorityYears: emp.endDate
            ? seniorityYears(emp.startDate, new Date(emp.endDate))
            : seniorityYears(emp.startDate),
          terminationReason: workInfo.terminationReason ?? '',
          endDate: emp.endDate,
          role: workInfo.jobTitle ?? '',
        };
      });

      const filtered = input.role
        ? rows.filter((r: any) => r.role.toLowerCase().includes(input.role!.toLowerCase()))
        : rows;

      return { rows: filtered };
    }),

  // ------------------------------------------------------------------
  // 2. Active Employees Report
  // ------------------------------------------------------------------
  getActiveReport: protectedProcedure
    .input(activeReportSchema)
    .query(async ({ ctx, input }) => {
      const where: any = {
        companyId: ctx.user.companyId,
        status: 'ACTIVE',
      };
      if (input.department) where.department = deptFilter(input.department);

      const employees = await ctx.db.employee.findMany({
        where,
        include: { department: { select: { name: true } } },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });

      const now = new Date();
      const rows = employees.map((emp: any) => {
        const workInfo = JSON.parse(emp.workInfo || '{}');
        const salaryHistory = parseSalaryHistory(emp.workInfo);
        const currentEntry = getCurrentSalaryEntry(salaryHistory, now);
        const salary = parseFloat(currentEntry?.salaryAmount || '0') || 0;
        const currency = currentEntry?.salaryCurrency || '';
        return {
          name: `${emp.firstName} ${emp.lastName}`,
          department: emp.department?.name ?? '',
          startDate: emp.startDate,
          seniorityYears: seniorityYears(emp.startDate),
          salary,
          currency,
          role: workInfo.jobTitle ?? '',
        };
      });

      const filtered = input.role
        ? rows.filter((r: any) => r.role.toLowerCase().includes(input.role!.toLowerCase()))
        : rows;

      return { rows: filtered };
    }),

  // ------------------------------------------------------------------
  // 3. Salary Report (current salaries + future increases per employee)
  // ------------------------------------------------------------------
  getSalaryReport: protectedProcedure
    .input(salaryReportSchema)
    .query(async ({ ctx, input }) => {
      const where: any = {
        companyId: ctx.user.companyId,
        status: 'ACTIVE',
      };
      if (input.department) where.department = deptFilter(input.department);

      const employees = await ctx.db.employee.findMany({
        where,
        include: { department: { select: { name: true } } },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });

      const now = new Date();

      const rows = employees.map((emp: any) => {
        const workInfo = JSON.parse(emp.workInfo || '{}');
        const salaryHistory = parseSalaryHistory(emp.workInfo);
        const currentEntry = getCurrentSalaryEntry(salaryHistory, now);
        const currentSalary = parseFloat(currentEntry?.salaryAmount || '0') || 0;
        const currency = currentEntry?.salaryCurrency || '';

        let futureIncreases = salaryHistory.filter(
          e => e.effectiveDate && new Date(e.effectiveDate) > now
        );
        if (input.increaseType) {
          const type = input.increaseType.toUpperCase();
          futureIncreases = futureIncreases.filter(
            e => e.salaryType?.toUpperCase() === type || e.contractType?.toUpperCase() === type
          );
        }

        return {
          name: `${emp.firstName} ${emp.lastName}`,
          department: emp.department?.name ?? '',
          role: workInfo.jobTitle ?? '',
          currentSalary,
          currency,
          futureIncreases: futureIncreases.map(e => ({
            effectiveDate: e.effectiveDate ? new Date(e.effectiveDate) : null,
            type: e.salaryType || e.contractType || '',
            salary: parseFloat(e.salaryAmount || '0') || 0,
            currency: e.salaryCurrency || '',
            changeReason: e.note || '',
          })),
        };
      });

      const filtered = input.role
        ? rows.filter((r: any) => r.role.toLowerCase().includes(input.role!.toLowerCase()))
        : rows;

      return { rows: filtered };
    }),

  // ------------------------------------------------------------------
  // 4. Total Cost Report (monthly aggregation of salary history entries)
  // ------------------------------------------------------------------
  getTotalCostReport: protectedProcedure
    .input(totalCostSchema)
    .query(async ({ ctx, input }) => {
      const where: any = { companyId: ctx.user.companyId };
      if (input.department) where.department = deptFilter(input.department);

      const employees = await ctx.db.employee.findMany({
        where,
        select: {
          workInfo: true,
          department: { select: { name: true } },
        },
      });

      const monthMap: Record<string, { total: number; byDepartment: Record<string, number> }> = {};

      for (const emp of employees as any[]) {
        const salaryHistory = parseSalaryHistory(emp.workInfo);
        const dept = emp.department?.name ?? 'Unassigned';

        for (const entry of salaryHistory) {
          if (!entry.effectiveDate) continue;
          const date = new Date(entry.effectiveDate);
          if (date < input.startDate || date > input.endDate) continue;

          if (input.increaseType) {
            const type = input.increaseType.toUpperCase();
            if (
              entry.salaryType?.toUpperCase() !== type &&
              entry.contractType?.toUpperCase() !== type
            ) continue;
          }

          const amount = parseFloat(entry.salaryAmount || '0') || 0;
          if (amount === 0) continue;

          const label = toMonthLabel(date);
          if (!monthMap[label]) monthMap[label] = { total: 0, byDepartment: {} };
          monthMap[label].total += amount;
          monthMap[label].byDepartment[dept] = (monthMap[label].byDepartment[dept] ?? 0) + amount;
        }
      }

      const months = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ month, ...data }));

      return { months };
    }),
});
