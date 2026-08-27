export type ChatIntent = "expense" | "question";

const QUESTION_MARKERS = [
  "얼마",
  "얼마나",
  "뭐",
  "뭘",
  "무엇",
  "어떻게",
  "어떤",
  "어디",
  "언제",
  "왜",
  "몇",
  "알려",
  "궁금",
  "보여줘",
  "총지출",
  "총 지출",
  "가장",
  "제일",
];

function hasExpenseAmount(text: string): boolean {
  const compact = text.replace(/,/g, "");
  if (/\d+\s*원/.test(compact)) {
    return true;
  }
  if (/\d+\s*만(\s*원)?/.test(compact)) {
    return true;
  }
  if (/(만|천|억)\s*원/.test(compact)) {
    return true;
  }
  if (/[일이삼사오육칠팔구십백]+[만천억]/.test(compact) && /원/.test(compact)) {
    return true;
  }
  return false;
}

function hasQuestionCue(text: string): boolean {
  if (/[?？]/.test(text)) {
    return true;
  }
  if (QUESTION_MARKERS.some((marker) => text.includes(marker))) {
    return true;
  }
  return /(?:야|까|니|나|가요|나요|더라|지)\s*$/.test(text);
}

export function classifyChatIntent(message: string): ChatIntent {
  if (hasExpenseAmount(message)) {
    return "expense";
  }
  if (hasQuestionCue(message)) {
    return "question";
  }
  return "expense";
}
