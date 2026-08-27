"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fetchExpenses } from "@/lib/expenses";
import type { ChatMessage, Expense } from "@/lib/types";

function formatAmount(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) {
    return isoDate;
  }
  return `${year}.${month}.${day}`;
}

function createMessage(role: ChatMessage["role"], text: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
  };
}

export function ExpenseChat() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      "assistant",
      "안녕하세요. 오늘 쓴 돈을 말씀해 주세요.\n예: 점심 8,000원\n이번 달 얼마 썼는지 같은 질문도 가능해요.",
    ),
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadExpenses() {
      try {
        const rows = await fetchExpenses();
        if (!cancelled) {
          setExpenses(rows);
        }
      } catch {
        if (!cancelled) {
          setError("지출 내역을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadExpenses();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const totalAmount = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  );

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) {
      return;
    }

    const userMessage = createMessage("user", trimmed);
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: messages.map((item) => ({
            role: item.role,
            text: item.text,
          })),
        }),
      });

      const payload: unknown = await response.json();
      if (typeof payload !== "object" || payload === null) {
        throw new Error("Gemini API 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }

      const data = payload as {
        reply?: unknown;
        expense?: Expense | null;
        error?: unknown;
      };

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Gemini API 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }

      if (typeof data.reply !== "string") {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Gemini API 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }

      setMessages((current) => [
        ...current,
        createMessage("assistant", data.reply as string),
      ]);

      if (data.expense && typeof data.expense === "object") {
        const saved = data.expense;
        setExpenses((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      }
    } catch (error) {
      const notice =
        error instanceof Error
          ? error.message
          : "메시지를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.";
      setError(notice);
      setMessages((current) => [...current, createMessage("assistant", notice)]);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section className="max-h-[34%] shrink-0 overflow-y-auto border-b border-[#d7e0e8] bg-white/80 px-4 py-3">
        <div className="mb-2 flex items-end justify-between gap-3">
          <h2 className="text-[13px] font-semibold text-[#3c4a57]">저장된 지출</h2>
          <p className="flex items-baseline gap-0.5 text-[#e45b4c]">
            <span className="amount text-lg font-semibold leading-none">
              {formatAmount(totalAmount)}
            </span>
            <span className="text-[12px] font-medium">원</span>
          </p>
        </div>

        {isLoading ? (
          <p className="py-4 text-center text-[14px] text-[#8a97a3]">불러오는 중...</p>
        ) : expenses.length === 0 ? (
          <p className="py-4 text-center text-[14px] text-[#8a97a3]">
            아직 기록된 지출이 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {expenses.map((expense) => (
              <li
                key={expense.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f8fa] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-[#222]">
                    {expense.description}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#8a97a3]">
                    {formatDateLabel(expense.date)}
                  </p>
                </div>
                <p className="flex shrink-0 items-baseline gap-0.5 text-[#e45b4c]">
                  <span className="amount text-[15px] font-semibold">
                    {formatAmount(expense.amount)}
                  </span>
                  <span className="text-[12px] font-medium">원</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <ul className="flex flex-col gap-3">
          {messages.map((message) => (
            <li
              key={message.id}
              className={
                message.role === "user"
                  ? "flex justify-end"
                  : "flex justify-start"
              }
            >
              <p
                className={
                  message.role === "user"
                    ? "max-w-[78%] whitespace-pre-wrap rounded-[18px] rounded-tr-md bg-[#fee500] px-3.5 py-2.5 text-[16px] leading-6 text-[#191919]"
                    : "max-w-[78%] whitespace-pre-wrap rounded-[18px] rounded-tl-md bg-white px-3.5 py-2.5 text-[16px] leading-6 text-[#191919] shadow-[0_1px_1px_rgba(0,0,0,0.04)]"
                }
              >
                {message.text}
              </p>
            </li>
          ))}
          {isSending ? (
            <li className="flex justify-start">
              <p className="rounded-[18px] rounded-tl-md bg-white px-3.5 py-2.5 text-[15px] text-[#8a97a3]">
                입력 중...
              </p>
            </li>
          ) : null}
        </ul>
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-[#d7e0e8] bg-[#f7f8fa] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        {error ? (
          <p className="mb-2 px-1 text-[13px] text-[#e45b4c]" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요"
            rows={1}
            disabled={isSending}
            className="max-h-28 min-h-12 flex-1 resize-none rounded-[22px] bg-white px-4 py-3 text-[16px] leading-5 text-[#222] outline-none placeholder:text-[#b0b8c1] focus-visible:ring-2 focus-visible:ring-[#fee500]/80"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            aria-label="전송"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fee500] text-[#191919] transition-colors touch-manipulation hover:bg-[#f5dc00] disabled:bg-[#e5e5e5] disabled:text-[#b0b8c1]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
            >
              <path d="M3.4 20.6 21 12 3.4 3.4l2.1 6.5L14 12l-8.5 2.1z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
