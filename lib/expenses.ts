import { parseCategory } from "@/lib/categories";
import { getSupabase } from "@/lib/supabase";
import type { Expense, NewExpense } from "@/lib/types";

const EXPENSE_COLUMNS = "id, created_at, date, amount, description, category";

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

function toExpense(value: unknown): Expense | null {
  if (!isExpense(value)) {
    return null;
  }
  return {
    ...value,
    category: parseCategory(value.category),
  };
}

export async function fetchExpenses(): Promise<Expense[]> {
  const { data, error } = await getSupabase()
    .from("expenses")
    .select(EXPENSE_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => toExpense(row))
    .filter((row): row is Expense => row !== null);
}

export async function createExpense(expense: NewExpense): Promise<Expense> {
  const { data, error } = await getSupabase()
    .from("expenses")
    .insert(expense)
    .select(EXPENSE_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  const saved = toExpense(data);
  if (!saved) {
    throw new Error("저장된 지출 데이터 형식이 올바르지 않습니다.");
  }

  return saved;
}

export async function updateExpense(
  id: number,
  expense: NewExpense,
): Promise<Expense> {
  const { data, error } = await getSupabase()
    .from("expenses")
    .update(expense)
    .eq("id", id)
    .select(EXPENSE_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  const saved = toExpense(data);
  if (!saved) {
    throw new Error("수정된 지출 데이터 형식이 올바르지 않습니다.");
  }

  return saved;
}

export async function deleteExpense(id: number): Promise<void> {
  const { error } = await getSupabase().from("expenses").delete().eq("id", id);

  if (error) {
    throw error;
  }
}
