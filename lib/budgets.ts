import { getSupabase } from "@/lib/supabase";

function localKey(month: string): string {
  return `account_book_budget_${month}`;
}

function parseAmount(value: unknown): number | null {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(amount) || amount <= 0) {
    return null;
  }
  return amount;
}

function readLocalBudget(month: string): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  return parseAmount(window.localStorage.getItem(localKey(month)));
}

function writeLocalBudget(month: string, amount: number): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(localKey(month), String(amount));
}

export async function fetchMonthBudget(month: string): Promise<number | null> {
  try {
    const { data, error } = await getSupabase()
      .from("budgets")
      .select("amount")
      .eq("month", month)
      .maybeSingle();

    if (!error) {
      const amount = parseAmount(
        data && typeof data === "object"
          ? (data as { amount?: unknown }).amount
          : null,
      );
      if (amount) {
        writeLocalBudget(month, amount);
        return amount;
      }
    }
  } catch {
    // 테이블이 없어도 로컬 예산은 사용할 수 있습니다.
  }

  return readLocalBudget(month);
}

export async function saveMonthBudget(month: string, amount: number): Promise<void> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("예산은 1원 이상 정수로 입력해 주세요.");
  }

  writeLocalBudget(month, amount);

  const { error } = await getSupabase()
    .from("budgets")
    .upsert({ month, amount }, { onConflict: "month" });

  if (error) {
    console.error("budget upsert skipped:", error.message);
  }
}

export function monthSpent(expenses: { date: string; amount: number }[], month: string): number {
  return expenses
    .filter((expense) => expense.date.startsWith(month))
    .reduce((sum, expense) => sum + expense.amount, 0);
}

export type BudgetAlert = "none" | "warn" | "over";

export function getBudgetAlert(spent: number, budget: number | null): BudgetAlert {
  if (!budget) {
    return "none";
  }
  if (spent >= budget) {
    return "over";
  }
  if (spent / budget >= 0.8) {
    return "warn";
  }
  return "none";
}

export function budgetAlertMessage(alert: BudgetAlert, percent: number): string | null {
  if (alert === "over") {
    return "이번 달 예산을 초과했어요. 지출을 한번 살펴봐 주세요.";
  }
  if (alert === "warn") {
    return `이번 달 예산의 ${percent}%를 사용 중이에요.`;
  }
  return null;
}
