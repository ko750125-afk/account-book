export const ALLOWED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
] as const;

export function isAllowedReceiptType(type: string): boolean {
  return (ALLOWED_RECEIPT_TYPES as readonly string[]).includes(type);
}
