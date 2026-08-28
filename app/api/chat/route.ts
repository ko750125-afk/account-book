import { CATEGORY_PROMPT } from "@/lib/categories";
import { isChatHistory, toGeminiHistory, type ChatTurn } from "@/lib/chat-history";
import { classifyChatIntent } from "@/lib/chat-intent";
import { getKstDateContext } from "@/lib/date-kst";
import {
  formatSavedReply,
  parseExpense,
  parseModelJson,
} from "@/lib/expense-parse";
import { createExpense, fetchExpenses } from "@/lib/expenses";
import { createGeminiJsonModel, missingGeminiKeyResponse } from "@/lib/gemini";
import type { Expense } from "@/lib/types";

interface ChatRequestBody {
  message?: unknown;
  history?: unknown;
}

function toAnalysisRows(expenses: Expense[]): {
  date: string;
  amount: number;
  description: string;
  category: string;
}[] {
  return expenses.map((expense) => ({
    date: expense.date,
    amount: expense.amount,
    description: expense.description,
    category: expense.category,
  }));
}

async function handleExpenseInput(
  apiKey: string,
  message: string,
  history: ChatTurn[],
): Promise<Response> {
  const dates = getKstDateContext();
  const model = createGeminiJsonModel(
    apiKey,
    `당신은 한국어 가계부 비서입니다. 사용자의 자연어에서 지출을 추출합니다.
오늘 날짜는 ${dates.today} (YYYY-MM-DD)입니다.
- "오늘"은 ${dates.today}
- "어제"는 ${dates.yesterday}
- 날짜가 없으면 오늘
- 금액은 원 단위 정수. "2만 원"은 20000
- 내용(description)은 짧은 명사. 예: 택시, 점심
${CATEGORY_PROMPT}

정보가 충분하면 expense에 { date, amount, description, category }를 넣고 reply는 짧게 둡니다.
날짜나 금액을 모르면 expense는 null로 두고, 다시 물어보는 한국어 질문을 reply에 넣습니다.
예: "금액이 얼마였는지 알려 주세요."

반드시 JSON만 반환합니다.`,
  );

  const chat = model.startChat({
    history: toGeminiHistory(history),
  });
  const result = await chat.sendMessage(message);
  const parsed = parseModelJson(result.response.text());
  const extracted = parseExpense(parsed.expense);

  if (!extracted) {
    return Response.json({
      reply:
        parsed.reply ||
        "날짜나 금액을 파악하지 못했어요. 예: 어제 택시 2만 원",
      expense: null,
    });
  }

  const expense = await createExpense(extracted);

  return Response.json({
    reply: formatSavedReply(extracted),
    expense,
  });
}

async function handleStatsQuestion(
  apiKey: string,
  message: string,
  history: ChatTurn[],
): Promise<Response> {
  const dates = getKstDateContext();
  const expenses = await fetchExpenses();
  const model = createGeminiJsonModel(
    apiKey,
    `당신은 친근한 한국어 가계부 비서입니다. 저장된 지출 데이터만 보고 질문에 답합니다.
오늘(KST)은 ${dates.today}입니다.
- 어제: ${dates.yesterday}
- 이번 달: ${dates.thisMonthStart} ~ ${dates.thisMonthEnd}
- 지난주(월~일): ${dates.lastWeekStart} ~ ${dates.lastWeekEnd}

지출 데이터(JSON):
${JSON.stringify(toAnalysisRows(expenses))}

규칙:
- 이 데이터에 없는 지출은 지어내지 마세요.
- 금액은 원 단위로 보기 쉽게 말해 주세요. 예: 20,000원
- 답이 없으면 없다고 편하게 말해 주세요.
- 식비/학원비/장보기/교통비/쇼핑/기타 카테고리가 있으면 그 값을 우선 사용하세요.
- 말투는 자연스럽고 친근하게, 2~4문장 안으로.
- 지출을 새로 저장하지 마세요.

반드시 JSON만 반환합니다. expense는 항상 null입니다.`,
  );

  const chat = model.startChat({
    history: toGeminiHistory(history),
  });
  const result = await chat.sendMessage(message);
  const parsed = parseModelJson(result.response.text());

  return Response.json({
    reply:
      parsed.reply ||
      "저장된 지출을 기준으로 답변하기 어려웠어요. 질문을 조금 다르게 해 주시겠어요?",
    expense: null,
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return missingGeminiKeyResponse();
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 500) {
    return Response.json({ error: "메시지를 입력해 주세요." }, { status: 400 });
  }

  const history = isChatHistory(body.history) ? body.history.slice(-12) : [];

  try {
    const intent = classifyChatIntent(message);
    if (intent === "question") {
      return await handleStatsQuestion(apiKey, message, history);
    }
    return await handleExpenseInput(apiKey, message, history);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown";
    console.error("chat route failed:", detail);
    return Response.json(
      {
        error: "Gemini API 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 500 },
    );
  }
}
