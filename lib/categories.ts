export const EXPENSE_CATEGORIES = [
  "식비",
  "학원비",
  "장보기",
  "교통비",
  "쇼핑",
  "기타",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  식비: "#e45b4c",
  학원비: "#8b5cf6",
  장보기: "#4caf7a",
  교통비: "#4b8fe3",
  쇼핑: "#f59e0b",
  기타: "#8a97a3",
};

export const CATEGORY_PROMPT = `category는 다음 중 하나만 고르세요: 식비, 학원비, 장보기, 교통비, 쇼핑, 기타
- 식비: 밥, 점심, 저녁, 아침, 카페, 커피, 배달, 식당, 술, 회식
- 학원비: 학원, 과외, 수강료, 수업
- 장보기: 마트, 시장, 식재료, 장보기
- 교통비: 버스, 지하철, 택시, 주유, 주차
- 쇼핑: 옷, 잡화, 생활용품, 온라인 쇼핑(식재료 제외)
- 기타: 위에 없으면`;

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

export function parseCategory(value: unknown): ExpenseCategory {
  if (typeof value === "string" && isExpenseCategory(value.trim())) {
    return value.trim();
  }
  return "기타";
}

export function inferCategory(description: string): ExpenseCategory {
  const text = description.replace(/\s/g, "");

  if (/학원|과외|수강|교습/.test(text)) {
    return "학원비";
  }
  if (/마트|장보기|시장|이마트|홈플러스|코스트코|식재료/.test(text)) {
    return "장보기";
  }
  if (/택시|버스|지하철|교통|주유|주차|기차/.test(text)) {
    return "교통비";
  }
  if (/점심|저녁|아침|식사|밥|커피|카페|배달|식당|치킨|피자|회식|술/.test(text)) {
    return "식비";
  }
  if (/쇼핑|옷|패션|쿠팡|무신|백화점/.test(text)) {
    return "쇼핑";
  }
  return "기타";
}

export function resolveCategory(value: unknown, description: string): ExpenseCategory {
  if (typeof value === "string" && isExpenseCategory(value.trim())) {
    return value.trim();
  }
  return inferCategory(description);
}
