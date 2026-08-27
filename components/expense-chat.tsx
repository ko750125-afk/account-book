"use client";

import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ReceiptCamera } from "@/components/receipt-camera";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { prefersNativeCameraCapture } from "@/lib/camera";
import { compressReceiptImage } from "@/lib/compress-image";
import { fetchExpenses } from "@/lib/expenses";
import { isAllowedReceiptType } from "@/lib/receipt-types";
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

function createMessage(
  role: ChatMessage["role"],
  text: string,
  imageUrl?: string,
): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    imageUrl,
  };
}

export function ExpenseChat() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      "assistant",
      "안녕하세요. 오늘 쓴 돈을 말씀해 주세요.\n예: 점심 8,000원\n영수증 사진을 올려도 자동으로 기록해요.",
    ),
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendingLabel, setSendingLabel] = useState("입력 중...");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const sendMessageRef = useRef<(text: string) => void>(() => {});

  const { isListening, toggle: toggleSpeech } = useSpeechToText({
    enabled: !isSending,
    onInterim: (text) => {
      setInput(text);
      setError("");
    },
    onFinal: (text) => {
      sendMessageRef.current(text);
    },
    onError: (message) => {
      setError(message);
    },
  });

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
    setSendingLabel("입력 중...");
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

  async function sendReceipt(file: File) {
    if (isSending || isListening) {
      return;
    }

    if (file.type && !isAllowedReceiptType(file.type)) {
      setError("JPEG, PNG, WEBP 형식의 사진만 올릴 수 있어요.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("사진이 너무 커요. 더 작은 이미지로 올려 주세요.");
      return;
    }

    setError("");
    setSendingLabel("영수증을 읽고 있어요...");
    setIsSending(true);

    try {
      let imageBlob: Blob;
      try {
        imageBlob = await compressReceiptImage(file);
      } catch {
        imageBlob = file;
      }

      const previewUrl = URL.createObjectURL(imageBlob);
      setMessages((current) => [
        ...current,
        createMessage("user", "영수증을 올렸어요", previewUrl),
      ]);

      const body = new FormData();
      body.append(
        "image",
        new File([imageBlob], "receipt.jpg", {
          type: imageBlob.type || "image/jpeg",
        }),
      );

      const response = await fetch("/api/receipt", {
        method: "POST",
        body,
      });

      const payload: unknown = await response.json();
      if (typeof payload !== "object" || payload === null) {
        throw new Error("영수증을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.");
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
            : "영수증을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }

      if (typeof data.reply !== "string") {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "영수증을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.",
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
          : "영수증을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.";
      setError(notice);
      setMessages((current) => [...current, createMessage("assistant", notice)]);
    } finally {
      setIsSending(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
    }
  }

  sendMessageRef.current = (text) => {
    void sendMessage(text);
  };

  function handleMicClick() {
    if (isSending) {
      return;
    }
    toggleSpeech();
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

  function handleImageClick() {
    if (isSending || isListening) {
      return;
    }
    setPickerOpen(true);
  }

  function handlePickAlbum() {
    setPickerOpen(false);
    fileInputRef.current?.click();
  }

  function handlePickCamera() {
    setPickerOpen(false);
    if (prefersNativeCameraCapture()) {
      cameraInputRef.current?.click();
      return;
    }
    setCameraOpen(true);
  }

  function handleCameraCapture(file: File) {
    setCameraOpen(false);
    void sendReceipt(file);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    void sendReceipt(file);
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
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
              {message.imageUrl ? (
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[78%] overflow-hidden rounded-[18px] rounded-tr-md bg-[#fee500] text-[16px] leading-6 text-[#191919]"
                      : "max-w-[78%] overflow-hidden rounded-[18px] rounded-tl-md bg-white text-[16px] leading-6 text-[#191919] shadow-[0_1px_1px_rgba(0,0,0,0.04)]"
                  }
                >
                  <img
                    src={message.imageUrl}
                    alt="올린 영수증"
                    className="max-h-44 w-full object-cover"
                  />
                  <p className="px-3.5 py-2.5">{message.text}</p>
                </div>
              ) : (
                <p
                  className={
                    message.role === "user"
                      ? "max-w-[78%] whitespace-pre-wrap rounded-[18px] rounded-tr-md bg-[#fee500] px-3.5 py-2.5 text-[16px] leading-6 text-[#191919]"
                      : "max-w-[78%] whitespace-pre-wrap rounded-[18px] rounded-tl-md bg-white px-3.5 py-2.5 text-[16px] leading-6 text-[#191919] shadow-[0_1px_1px_rgba(0,0,0,0.04)]"
                  }
                >
                  {message.text}
                </p>
              )}
            </li>
          ))}
          {isSending ? (
            <li className="flex justify-start">
              <p className="rounded-[18px] rounded-tl-md bg-white px-3.5 py-2.5 text-[15px] text-[#8a97a3]">
                {sendingLabel}
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
        {isListening ? (
          <p className="mb-2 px-1 text-[13px] text-[#3c4a57]">듣고 있어요...</p>
        ) : error ? (
          <p className="mb-2 px-1 text-[13px] text-[#e45b4c]" role="alert">
            {error}
          </p>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={handleFileChange}
        />
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={handleImageClick}
            disabled={isSending || isListening}
            aria-label="영수증 사진 올리기"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#191919] shadow-[0_1px_1px_rgba(0,0,0,0.06)] transition-colors touch-manipulation hover:bg-[#f2f2f2] disabled:bg-[#e5e5e5] disabled:text-[#b0b8c1]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
              <path d="m21 15-4.5-4.5L9 18" />
            </svg>
          </button>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "말씀해 주세요" : "메시지, 마이크 또는 영수증"}
            rows={1}
            disabled={isSending || isListening}
            className="max-h-28 min-h-12 flex-1 resize-none rounded-[22px] bg-white px-4 py-3 text-[16px] leading-5 text-[#222] outline-none placeholder:text-[#b0b8c1] focus-visible:ring-2 focus-visible:ring-[#fee500]/80"
          />
          <button
            type="button"
            onClick={handleMicClick}
            disabled={isSending}
            aria-label={isListening ? "음성 입력 중지" : "음성 입력"}
            aria-pressed={isListening}
            className={
              isListening
                ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e45b4c] text-white animate-pulse touch-manipulation"
                : "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#191919] shadow-[0_1px_1px_rgba(0,0,0,0.06)] transition-colors touch-manipulation hover:bg-[#f2f2f2] disabled:bg-[#e5e5e5] disabled:text-[#b0b8c1]"
            }
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
            >
              <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
            </svg>
          </button>
          <button
            type="submit"
            disabled={isSending || isListening || !input.trim()}
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

      {pickerOpen ? (
        <div
          className="absolute inset-0 z-30 flex items-end bg-black/40"
          role="presentation"
          onClick={() => setPickerOpen(false)}
        >
          <div
            role="dialog"
            aria-label="영수증 사진 선택"
            className="w-full rounded-t-2xl bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={handlePickCamera}
              className="flex h-14 w-full items-center justify-center text-[17px] font-medium text-[#191919] touch-manipulation"
            >
              카메라로 촬영
            </button>
            <div className="h-px bg-[#eee]" />
            <button
              type="button"
              onClick={handlePickAlbum}
              className="flex h-14 w-full items-center justify-center text-[17px] font-medium text-[#191919] touch-manipulation"
            >
              앨범에서 선택
            </button>
            <div className="h-px bg-[#eee]" />
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="flex h-14 w-full items-center justify-center text-[17px] font-medium text-[#8a97a3] touch-manipulation"
            >
              취소
            </button>
          </div>
        </div>
      ) : null}

      {cameraOpen ? (
        <ReceiptCamera
          onCapture={handleCameraCapture}
          onClose={() => setCameraOpen(false)}
        />
      ) : null}
    </div>
  );
}
