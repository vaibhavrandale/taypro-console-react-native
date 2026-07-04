import type { RobotUptimeDay, RobotUptimeSummary } from '../types/robotUptime';
import type { ThemeColors } from '../theme/colors';

export function formatMonthYear(month: number, year: number) {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function getMonthLabel(month: number) {
  return formatMonthYear(month, 2000).replace(' 2000', '');
}

export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const month = index + 1;
  return {
    value: month,
    label: getMonthLabel(month),
  };
});

export function getYearOptions(yearsBack = 8) {
  const currentYear = getCurrentMonthYear().year;
  return Array.from({ length: yearsBack + 1 }, (_, index) => currentYear - index);
}

export function getMonthOptionsForYear(year: number) {
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();

  return MONTH_OPTIONS.map((option) => ({
    ...option,
    disabled:
      year > currentYear ||
      (year === currentYear && option.value > currentMonth),
  }));
}

export function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function getDayOfMonth(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return String(date.getDate());
}

export function isRainOrNoRunDay(day: RobotUptimeDay) {
  return (
    day.cleaning_uptime_percentage === 0 &&
    day.success_count === 0 &&
    day.failure_count === 0
  );
}

export function isPerfectCleaningDay(day: RobotUptimeDay) {
  return day.cleaning_uptime_percentage >= 100;
}

export function getUptimeTone(
  value: number,
  colors: ThemeColors,
): { color: string; variant: 'success' | 'warning' | 'error' | 'neutral' | 'info' } {
  if (value >= 95) {
    return { color: colors.primary, variant: 'success' };
  }
  if (value >= 80) {
    return { color: colors.badge.info.text, variant: 'info' };
  }
  if (value >= 50) {
    return { color: colors.badge.warning.text, variant: 'warning' };
  }
  if (value > 0) {
    return { color: colors.danger, variant: 'error' };
  }
  return { color: colors.textMuted, variant: 'neutral' };
}

export function getHeatmapColor(value: number, colors: ThemeColors) {
  if (value >= 95) return colors.primary;
  if (value >= 80) return colors.badge.info.text;
  if (value >= 50) return colors.badge.warning.text;
  if (value > 0) return colors.danger;
  return colors.backgroundTertiary;
}

export function buildUptimeSummary(
  days: RobotUptimeDay[],
  totals: {
    totalAssignedRobots: number;
    monthlyCleaningUptime: number;
    monthlyAvailabilityUptime: number;
    averageSuccess: number;
    averageFailure: number;
  },
): RobotUptimeSummary {
  return {
    totalAssignedRobots: totals.totalAssignedRobots,
    monthlyCleaningUptime: totals.monthlyCleaningUptime,
    monthlyAvailabilityUptime: totals.monthlyAvailabilityUptime,
    averageSuccess: totals.averageSuccess,
    averageFailure: totals.averageFailure,
    operationalDays: days.filter((day) => day.cleaning_uptime_percentage > 0).length,
    rainDays: days.filter(isRainOrNoRunDay).length,
    perfectDays: days.filter(isPerfectCleaningDay).length,
  };
}

export function shiftMonth(month: number, year: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

export function getCurrentMonthYear() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export function getPreviousMonthYear() {
  return shiftMonth(getCurrentMonthYear().month, getCurrentMonthYear().year, -1);
}

export function toMonthDate(month: number, year: number) {
  return new Date(year, month - 1, 1);
}

export function fromMonthDate(date: Date) {
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

export function getLatestSelectableMonthDate() {
  return toMonthDate(getCurrentMonthYear().month, getCurrentMonthYear().year);
}

export function isFutureMonth(month: number, year: number) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  if (year > currentYear) return true;
  if (year === currentYear && month > currentMonth) return true;
  return false;
}
