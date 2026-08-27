import type { NewExpense } from "@/lib/types";

export function formatSavedReply(expense: NewExpense): string {
  const [, month, day] = expense.date.split("-");
  const amount = new Intl.NumberFormat("ko-KR").format(expense.amount);
  return `${Number(month)}월 ${Number(day)}일 ${expense.description} ${amount}원을 저장했어요!`;
}

export function parseExpense(value: unknown): NewExpense | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const date = typeof row.date === "string" ? row.date.trim() : "";
  const description =
    typeof row.description === "string" ? row.description.trim() : "";
  const amount = typeof row.amount === "number" ? row.amount : Number(row.amount);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return null;
  }
  if (!description) {
    return null;
  }

  return { date, amount, description };
}

export function parseReceiptExpense(
  value: unknown,
  fallbackDate: string,
): NewExpense | null {
  if (value === null || value === undefined || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const rawDate = typeof row.date === "string" ? row.date.trim() : "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : fallbackDate;
  const description =
    typeof row.description === "string" && row.description.trim()
      ? row.description.trim()
      : "영수증";
  const amount = typeof row.amount === "number" ? row.amount : Number(row.amount);

  if (!Number.isInteger(amount) || amount <= 0) {
    return null;
  }

  return { date, amount, description };
}

export function parseModelJson(text: string): {
  reply: string;
  expense: unknown;
} {
  const trimmed = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const parsed: unknown = JSON.parse(trimmed);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("모델 응답 형식이 올바르지 않습니다.");
  }

  const row = parsed as Record<string, unknown>;
  return {
    reply: typeof row.reply === "string" ? row.reply.trim() : "",
    expense: row.expense,
  };
}
