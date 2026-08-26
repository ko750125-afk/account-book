export interface Expense {
  id: number;
  created_at: string;
  date: string;
  amount: number;
  description: string;
}

export type NewExpense = Pick<Expense, "date" | "amount" | "description">;
