"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createExpense, fetchExpenses } from "@/lib/expenses";
import type { Expense } from "@/lib/types";

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

export function ExpenseBook() {
  const [date, setDate] = useState(todayIsoDate);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadExpenses() {
      try {
        const rows = await fetchExpenses();
        if (!cancelled) {
          setExpenses(rows);
          setError("");
        }
      } catch {
        if (!cancelled) {
          setError("지출 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
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

  const totalAmount = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);

    const trimmedDescription = description.trim();
    const parsedAmount = Number(amount);

    if (!date) {
      setError("날짜를 선택해 주세요.");
      return;
    }
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("금액을 올바르게 입력해 주세요.");
      return;
    }
    if (!Number.isInteger(parsedAmount)) {
      setError("금액은 정수로 입력해 주세요.");
      return;
    }
    if (!trimmedDescription) {
      setError("내용을 입력해 주세요.");
      return;
    }

    setIsSaving(true);

    try {
      const nextExpense = await createExpense({
        date,
        amount: parsedAmount,
        description: trimmedDescription,
      });

      setExpenses((current) => [nextExpense, ...current]);
      setDate(todayIsoDate());
      setAmount("");
      setDescription("");
      setError("");
      setSaved(true);
    } catch {
      setError("지출 내역을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col rounded-2xl bg-white px-5 py-6 sm:px-6 sm:py-7"
      >
        <h2 className="mb-6 text-[17px] font-bold tracking-tight text-[#222] sm:text-base">
          오늘 쓴 돈을 남겨 주세요
        </h2>

        <div className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-semibold text-[#333] sm:text-sm">날짜</span>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setSaved(false);
              }}
              onClick={(event) => {
                try {
                  event.currentTarget.showPicker();
                } catch {
                  // 브라우저가 이미 달력을 열었거나 showPicker를 지원하지 않는 경우
                }
              }}
              className="date-input h-14 w-full min-w-0 cursor-pointer rounded-xl bg-[#f7f7f7] px-4 text-[17px] text-[#222] outline-none transition touch-manipulation focus:bg-[#f2f2f2] focus-visible:ring-2 focus-visible:ring-[#e45b4c]/20 sm:h-12 sm:text-[15px]"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-semibold text-[#333] sm:text-sm">금액</span>
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setSaved(false);
              }}
              className="amount h-14 w-full min-w-0 appearance-none rounded-xl bg-[#f7f7f7] px-4 text-right text-[22px] font-semibold text-[#e45b4c] outline-none transition touch-manipulation [appearance:textfield] focus:bg-[#f2f2f2] focus-visible:ring-2 focus-visible:ring-[#e45b4c]/20 sm:h-12 sm:text-xl [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-semibold text-[#333] sm:text-sm">내용</span>
            <input
              type="text"
              placeholder="예: 점심 식사"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setSaved(false);
              }}
              className="h-14 w-full min-w-0 rounded-xl bg-[#f7f7f7] px-4 text-[17px] text-[#222] outline-none transition touch-manipulation placeholder:text-[#bdbdbd] focus:bg-[#f2f2f2] focus-visible:ring-2 focus-visible:ring-[#e45b4c]/20 sm:h-12 sm:text-[15px]"
              required
            />
          </label>
        </div>

        {error ? (
          <p className="mt-5 text-[15px] font-medium text-[#e45b4c] sm:text-sm" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="mt-5 text-[15px] font-medium text-[#4caf7a] sm:text-sm" role="status">
            지출 내역을 저장했습니다.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSaving}
          className="mt-7 h-14 w-full rounded-xl bg-[#e45b4c] text-[16px] font-semibold text-white transition-colors touch-manipulation hover:bg-[#d14e40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e45b4c]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:bg-[#d14e40] disabled:cursor-not-allowed disabled:bg-[#e45b4c]/40 sm:mt-6 sm:h-12 sm:text-[15px]"
        >
          {isSaving ? "저장 중..." : "저장하기"}
        </button>
      </form>

      <section className="rounded-2xl bg-white px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-end justify-between gap-4 border-b border-[#eeeeee] pb-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-[#e45b4c] sm:text-sm">지출 내역</h2>
            <p className="mt-1 text-[13px] text-[#9a9a9a]">저장한 기록이 아래에 표시됩니다.</p>
          </div>
          <p className="flex shrink-0 items-baseline justify-end gap-0.5">
            <span className="amount text-[22px] font-semibold leading-none text-[#e45b4c] sm:text-xl">
              {formatAmount(totalAmount)}
            </span>
            <span className="text-[13px] font-medium text-[#e45b4c]">원</span>
          </p>
        </div>

        {isLoading ? (
          <p className="py-12 text-center text-[15px] text-[#9a9a9a] sm:text-sm">
            지출 내역을 불러오는 중입니다.
          </p>
        ) : expenses.length === 0 ? (
          <p className="py-12 text-center text-[15px] text-[#9a9a9a] sm:text-sm">
            아직 기록된 지출이 없습니다.
          </p>
        ) : (
          <ul>
            {expenses.map((expense, index) => (
              <li
                key={expense.id}
                className={`flex items-center justify-between gap-4 py-4 ${
                  index === expenses.length - 1 ? "" : "border-b border-[#eeeeee]"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold text-[#222] sm:text-[15px]">
                    {expense.description}
                  </p>
                  <p className="mt-0.5 text-[13px] text-[#9a9a9a]">
                    {formatDateLabel(expense.date)}
                  </p>
                </div>
                <p className="flex shrink-0 items-baseline justify-end gap-0.5">
                  <span className="amount text-[17px] font-semibold text-[#e45b4c] sm:text-base">
                    {formatAmount(expense.amount)}
                  </span>
                  <span className="text-[13px] font-medium text-[#e45b4c]">원</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
