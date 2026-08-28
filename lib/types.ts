import type { ExpenseCategory } from "@/lib/categories";

export type { ExpenseCategory };

export interface Expense {
  id: number;
  created_at: string;
  date: string;
  amount: number;
  description: string;
  category: ExpenseCategory;
}

export type NewExpense = Pick<Expense, "date" | "amount" | "description" | "category">;

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  imageUrl?: string;
}
