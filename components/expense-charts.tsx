"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORY_COLORS, isExpenseCategory } from "@/lib/categories";
import { toCategoryTotals, toMonthlyTotals } from "@/lib/expense-stats";
import { formatAmount } from "@/lib/format";
import type { Expense } from "@/lib/types";

const PIE_COLORS = [
  "#e45b4c",
  "#f59e0b",
  "#4b8fe3",
  "#4caf7a",
  "#8b5cf6",
  "#ec4899",
  "#8a97a3",
];

function pieColor(name: string, index: number): string {
  if (isExpenseCategory(name)) {
    return CATEGORY_COLORS[name];
  }
  return PIE_COLORS[index % PIE_COLORS.length];
}

interface ExpenseChartsProps {
  expenses: Expense[];
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function ExpenseCharts({ expenses }: ExpenseChartsProps) {
  const monthly = toMonthlyTotals(expenses);
  const categories = toCategoryTotals(expenses);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-[13px] font-semibold text-[#3c4a57]">월별 총 지출</h3>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#8a97a3" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                width={36}
                tick={{ fontSize: 11, fill: "#8a97a3" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => formatCompact(value)}
              />
              <Tooltip
                cursor={{ fill: "rgba(228, 91, 76, 0.08)" }}
                formatter={(value) => [`${formatAmount(Number(value))}원`, "지출"]}
                contentStyle={{
                  borderRadius: 12,
                  border: "none",
                  fontSize: 13,
                }}
              />
              <Bar dataKey="amount" fill="#e45b4c" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[13px] font-semibold text-[#3c4a57]">카테고리별 비중</h3>
        <div className="flex items-center gap-2">
          <div className="h-40 min-w-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={62}
                  paddingAngle={2}
                >
                  {categories.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={pieColor(entry.name, index)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${formatAmount(Number(value))}원`,
                    String(name),
                  ]}
                  contentStyle={{
                    borderRadius: 12,
                    border: "none",
                    fontSize: 13,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex w-[42%] shrink-0 flex-col gap-1.5">
            {categories.map((entry, index) => (
              <li key={entry.name} className="flex items-center gap-1.5 text-[12px] text-[#3c4a57]">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: pieColor(entry.name, index) }}
                />
                <span className="min-w-0 truncate">{entry.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
