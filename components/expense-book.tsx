"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createExpense,
  deleteExpense,
  fetchExpenses,
  updateExpense,
} from "@/lib/expenses";
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

function TrashIcon() {
  return (
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
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function ExpenseBook() {
  const [date, setDate] = useState(todayIsoDate);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

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

  function resetForm() {
    setDate(todayIsoDate());
    setAmount("");
    setDescription("");
    setEditingExpense(null);
    setError("");
  }

  function openEditScreen(expense: Expense) {
    setEditingExpense(expense);
    setDate(expense.date);
    setAmount(String(expense.amount));
    setDescription(expense.description);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
      if (editingExpense) {
        const updated = await updateExpense(editingExpense.id, {
          date,
          amount: parsedAmount,
          description: trimmedDescription,
        });

        setExpenses((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        resetForm();
      } else {
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
      }
    } catch {
      setError(
        editingExpense
          ? "지출 내역을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요."
          : "지출 내역을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteExpense(pendingDelete.id);
      setExpenses((current) =>
        current.filter((item) => item.id !== pendingDelete.id),
      );
      if (editingExpense?.id === pendingDelete.id) {
        resetForm();
      }
      setPendingDelete(null);
      setError("");
    } catch {
      setError("지출 내역을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setPendingDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }

  const inputClassName =
    "h-14 w-full min-w-0 rounded-xl bg-[#f7f7f7] px-4 text-[17px] text-[#222] outline-none transition touch-manipulation focus:bg-[#f2f2f2] focus-visible:ring-2 focus-visible:ring-[#e45b4c]/20 sm:h-12 sm:text-[15px]";

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col rounded-2xl bg-white px-5 py-6 sm:px-6 sm:py-7"
      >
        {editingExpense ? (
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-bold tracking-tight text-[#222] sm:text-base">
              지출 수정
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="h-10 px-2 text-[15px] font-medium text-[#9a9a9a] touch-manipulation hover:text-[#222]"
            >
              취소
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-semibold text-[#333] sm:text-sm">날짜</span>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
              }}
              onClick={(event) => {
                try {
                  event.currentTarget.showPicker();
                } catch {
                  // 브라우저가 이미 달력을 열었거나 showPicker를 지원하지 않는 경우
                }
              }}
              className={`date-input cursor-pointer ${inputClassName}`}
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
              }}
              className={`${inputClassName} placeholder:text-[#bdbdbd]`}
              required
            />
          </label>
        </div>

        {error ? (
          <p className="mt-5 text-[15px] font-medium text-[#e45b4c] sm:text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSaving}
          className="mt-7 h-14 w-full rounded-xl bg-[#e45b4c] text-[16px] font-semibold text-white transition-colors touch-manipulation hover:bg-[#d14e40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e45b4c]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:bg-[#d14e40] disabled:cursor-not-allowed disabled:bg-[#e45b4c]/40 sm:mt-6 sm:h-12 sm:text-[15px]"
        >
          {isSaving
            ? editingExpense
              ? "수정 중..."
              : "저장 중..."
            : editingExpense
              ? "수정하기"
              : "저장하기"}
        </button>
      </form>

      {editingExpense ? null : (
        <section className="rounded-2xl bg-white px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-end justify-between gap-4 border-b border-[#eeeeee] pb-4">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-[#e45b4c] sm:text-sm">
                지출 내역
              </h2>
              <p className="mt-1 text-[13px] text-[#9a9a9a]">
                카드를 누르면 수정할 수 있습니다.
              </p>
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
                  className={`flex items-center gap-2 py-2 ${
                    index === expenses.length - 1 ? "" : "border-b border-[#eeeeee]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openEditScreen(expense)}
                    className="flex min-h-14 min-w-0 flex-1 items-center justify-between gap-4 py-2 text-left touch-manipulation"
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
                  </button>
                  <button
                    type="button"
                    aria-label={`${expense.description} 삭제`}
                    onClick={() => setPendingDelete(expense)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#9a9a9a] touch-manipulation hover:bg-[#f7f7f7] hover:text-[#e45b4c]"
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          role="presentation"
          onClick={() => {
            if (!isDeleting) {
              setPendingDelete(null);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-warning-title"
            aria-describedby="delete-warning-desc"
            className="w-full max-w-sm rounded-2xl bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              id="delete-warning-title"
              className="text-[17px] font-bold tracking-tight text-[#222]"
            >
              이 지출 내역을 삭제할까요?
            </h3>
            <p id="delete-warning-desc" className="mt-2 text-[15px] leading-6 text-[#9a9a9a]">
              {pendingDelete.description} {formatAmount(pendingDelete.amount)}원을 삭제합니다.
              삭제하면 되돌릴 수 없습니다.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setPendingDelete(null)}
                className="h-12 rounded-xl bg-[#f2f2f2] text-[15px] font-semibold text-[#222] touch-manipulation hover:bg-[#ececec] disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  void handleConfirmDelete();
                }}
                className="h-12 rounded-xl bg-[#e45b4c] text-[15px] font-semibold text-white touch-manipulation hover:bg-[#d14e40] disabled:opacity-50"
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
