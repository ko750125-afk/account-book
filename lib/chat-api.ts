import type { Expense } from "@/lib/types";

export async function readAssistantPayload(
  response: Response,
  fallbackError: string,
): Promise<{ reply: string; expense: Expense | null }> {
  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null) {
    throw new Error(fallbackError);
  }

  const data = payload as {
    reply?: unknown;
    expense?: Expense | null;
    error?: unknown;
  };

  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : fallbackError);
  }

  if (typeof data.reply !== "string") {
    throw new Error(typeof data.error === "string" ? data.error : fallbackError);
  }

  return {
    reply: data.reply,
    expense: data.expense && typeof data.expense === "object" ? data.expense : null,
  };
}
