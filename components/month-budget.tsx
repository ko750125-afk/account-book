"use client";

import { FormEvent, useState } from "react";

interface MonthBudgetProps {
  monthLabel: string;
  spent: number;
  budget: number | null;
  onSave: (amount: number) => Promise<void>;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function MonthBudget({ monthLabel, spent, budget, onSave }: MonthBudgetProps) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(budget ? String(budget) : "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const ratio = budget ? Math.min(spent / budget, 1) : 0;
  const percent = budget ? Math.round((spent / budget) * 100) : 0;
  const over = Boolean(budget && spent >= budget);
  const warn = Boolean(budget && !over && spent / budget >= 0.8);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(input.replace(/,/g, ""));
    if (!Number.isInteger(amount) || amount <= 0) {
      setError("예산은 1원 이상 정수로 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await onSave(amount);
      setEditing(false);
    } catch {
      setError("예산을 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mb-3 rounded-xl bg-[#f7f8fa] px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-[#3c4a57]">{monthLabel} 예산</h3>
        <button
          type="button"
          onClick={() => {
            setInput(budget ? String(budget) : "");
            setError("");
            setEditing(true);
          }}
          className="h-8 px-1 text-[13px] font-medium text-[#3c4a57] touch-manipulation hover:text-[#191919]"
        >
          {budget ? "수정" : "설정"}
        </button>
      </div>

      {budget ? (
        <>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e6ebf0]">
            <div
              className={
                over
                  ? "h-full rounded-full bg-[#c2410c]"
                  : warn
                    ? "h-full rounded-full bg-[#d97706]"
                    : "h-full rounded-full bg-[#e45b4c]"
              }
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
          <p className="mt-2 flex items-baseline justify-between gap-2 text-[13px] text-[#3c4a57]">
            <span>
              <span className="amount font-semibold text-[#222]">{formatAmount(spent)}</span>
              <span> / {formatAmount(budget)}원</span>
            </span>
            <span className={over || warn ? "font-semibold text-[#e45b4c]" : "font-medium"}>
              {percent}%
            </span>
          </p>
          {over ? (
            <p className="mt-2 rounded-lg bg-[#fdecea] px-2.5 py-2 text-[13px] font-medium text-[#c2410c]" role="alert">
              이번 달 예산을 초과했어요.
            </p>
          ) : warn ? (
            <p className="mt-2 rounded-lg bg-[#fff4e5] px-2.5 py-2 text-[13px] font-medium text-[#b45309]" role="alert">
              예산의 80% 이상을 사용 중이에요.
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-[13px] leading-5 text-[#8a97a3]">
          이번 달 예산을 정하면 지출 비율과 초과 경고를 보여 드려요.
        </p>
      )}

      {editing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          role="presentation"
          onClick={() => {
            if (!isSaving) {
              setEditing(false);
            }
          }}
        >
          <form
            role="dialog"
            aria-labelledby="budget-title"
            className="w-full max-w-sm rounded-2xl bg-white p-5"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h4 id="budget-title" className="text-[17px] font-bold text-[#222]">
              {monthLabel} 예산 설정
            </h4>
            <label className="mt-4 flex flex-col gap-2">
              <span className="text-[14px] font-medium text-[#3c4a57]">금액</span>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="amount h-12 rounded-xl bg-[#f7f7f7] px-4 text-right text-[18px] font-semibold text-[#222] outline-none focus-visible:ring-2 focus-visible:ring-[#e45b4c]/20"
                required
              />
            </label>
            {error ? (
              <p className="mt-3 text-[13px] text-[#e45b4c]" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setEditing(false)}
                className="h-12 rounded-xl bg-[#f2f2f2] text-[15px] font-semibold text-[#222] touch-manipulation"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="h-12 rounded-xl bg-[#e45b4c] text-[15px] font-semibold text-white touch-manipulation disabled:opacity-50"
              >
                {isSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
