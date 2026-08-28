import type { ChatMessage } from "@/lib/types";

export type ChatTurn = Pick<ChatMessage, "role" | "text">;

export function isChatHistory(value: unknown): value is ChatTurn[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }
    const row = item as Record<string, unknown>;
    return (
      (row.role === "user" || row.role === "assistant") &&
      typeof row.text === "string"
    );
  });
}

export function toGeminiHistory(
  history: ChatTurn[],
): { role: "user" | "model"; parts: { text: string }[] }[] {
  const items = [...history];
  while (items[0]?.role === "assistant") {
    items.shift();
  }

  return items.map((item) => ({
    role: item.role === "assistant" ? "model" : "user",
    parts: [{ text: item.text }],
  }));
}
