import type { Expense } from "@/lib/types";

export interface MonthTotal {
  month: string;
  label: string;
  amount: number;
}

export interface CategoryTotal {
  name: string;
  amount: number;
}

function monthLabel(month: string, showYear: boolean): string {
  const year = month.slice(2, 4);
  const monthNumber = Number(month.slice(5, 7));
  if (showYear) {
    return `${year}.${String(monthNumber).padStart(2, "0")}`;
  }
  return `${monthNumber}월`;
}

export function toMonthlyTotals(expenses: Expense[]): MonthTotal[] {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    const month = expense.date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      continue;
    }
    totals.set(month, (totals.get(month) ?? 0) + expense.amount);
  }

  const months = [...totals.keys()].sort((left, right) => left.localeCompare(right));
  const years = new Set(months.map((month) => month.slice(0, 4)));
  const showYear = years.size > 1;

  return months.map((month) => ({
    month,
    label: monthLabel(month, showYear),
    amount: totals.get(month) ?? 0,
  }));
}

export function toCategoryTotals(expenses: Expense[]): CategoryTotal[] {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    const name = expense.description.trim() || "기타";
    totals.set(name, (totals.get(name) ?? 0) + expense.amount);
  }

  const rows = [...totals.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([name, amount]) => ({ name, amount }));

  if (rows.length <= 6) {
    return rows;
  }

  const top = rows.slice(0, 5);
  const rest = rows.slice(5).reduce((sum, row) => sum + row.amount, 0);
  return [...top, { name: "기타", amount: rest }];
}
