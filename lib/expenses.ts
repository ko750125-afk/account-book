import { getSupabase } from "@/lib/supabase";
import type { Expense, NewExpense } from "@/lib/types";

function isExpense(value: unknown): value is Expense {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "number" &&
    typeof item.created_at === "string" &&
    typeof item.date === "string" &&
    typeof item.amount === "number" &&
    typeof item.description === "string"
  );
}

export async function fetchExpenses(): Promise<Expense[]> {
  const { data, error } = await getSupabase()
    .from("expenses")
    .select("id, created_at, date, amount, description")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).filter(isExpense);
}

export async function createExpense(expense: NewExpense): Promise<Expense> {
  const { data, error } = await getSupabase()
    .from("expenses")
    .insert(expense)
    .select("id, created_at, date, amount, description")
    .single();

  if (error) {
    throw error;
  }

  if (!isExpense(data)) {
    throw new Error("저장된 지출 데이터 형식이 올바르지 않습니다.");
  }

  return data;
}
