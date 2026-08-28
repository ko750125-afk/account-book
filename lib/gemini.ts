import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export const GEMINI_MODEL = "gemini-3.5-flash-lite";

export const EXPENSE_REPLY_SCHEMA = {
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
};

export function createGeminiJsonModel(apiKey: string, systemInstruction: string) {
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: EXPENSE_REPLY_SCHEMA,
    },
  });
}

export function missingGeminiKeyResponse(): Response {
  return Response.json(
    { error: "Gemini API 키가 설정되지 않았습니다." },
    { status: 500 },
  );
}
