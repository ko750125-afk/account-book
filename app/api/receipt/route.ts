import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { CATEGORY_PROMPT } from "@/lib/categories";
import { isAllowedReceiptType } from "@/lib/receipt-types";
import { getKstDateContext } from "@/lib/date-kst";
import {
  formatSavedReply,
  parseModelJson,
  parseReceiptExpense,
} from "@/lib/expense-parse";
import { createExpense } from "@/lib/expenses";

const MAX_BYTES = 4 * 1024 * 1024;

export const maxDuration = 30;

function toBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Gemini API 키가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return Response.json({ error: "영수증 사진을 올려 주세요." }, { status: 400 });
  }

  if (!isAllowedReceiptType(file.type)) {
    return Response.json(
      { error: "JPEG, PNG, WEBP 형식의 사진만 올릴 수 있어요." },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "사진이 너무 커요. 더 작은 이미지로 올려 주세요." },
      { status: 400 },
    );
  }

  const dates = getKstDateContext();

  try {
    const base64 = toBase64(await file.arrayBuffer());
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      systemInstruction: `당신은 영수증을 읽는 한국어 가계부 비서입니다.
오늘 날짜는 ${dates.today} (YYYY-MM-DD)입니다.

이미지에서 다음을 추출하세요.
- date: 영수증 날짜. YYYY-MM-DD. 연도가 없으면 올해로 보완. 날짜가 전혀 없으면 ${dates.today}
- amount: 결제 총액(합계, 받을금액, 결제금액). 개별 품목 합이 아니라 최종 지불 금액. 원 단위 정수
- description: 가게 이름. 짧고 명확하게. 없으면 "영수증"
${CATEGORY_PROMPT}

금액을 읽지 못하면 expense는 null로 두고, 다시 찍어 달라고 reply에 적습니다.

반드시 JSON만 반환합니다.`,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            reply: { type: SchemaType.STRING },
            expense: {
              type: SchemaType.OBJECT,
              nullable: true,
              properties: {
                date: { type: SchemaType.STRING },
                amount: { type: SchemaType.INTEGER },
                description: { type: SchemaType.STRING },
                category: { type: SchemaType.STRING },
              },
              required: ["date", "amount", "description", "category"],
            },
          },
          required: ["reply"],
        },
      },
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: file.type || "image/jpeg",
          data: base64,
        },
      },
      "이 영수증에서 결제 총액, 날짜, 가게 이름, 카테고리를 추출하세요.",
    ]);

    const parsed = parseModelJson(result.response.text());
    const expensePayload = parseReceiptExpense(parsed.expense, dates.today);

    if (!expensePayload) {
      return Response.json({
        reply:
          parsed.reply ||
          "영수증에서 금액을 읽지 못했어요. 더 선명하게 찍거나 금액을 직접 알려 주세요.",
        expense: null,
      });
    }

    const expense = await createExpense(expensePayload);

    return Response.json({
      reply: formatSavedReply(expensePayload),
      expense,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown";
    console.error("receipt route failed:", detail);
    return Response.json(
      {
        error: "영수증을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 500 },
    );
  }
}
