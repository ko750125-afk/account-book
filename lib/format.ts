export function formatAmount(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function formatDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) {
    return isoDate;
  }
  return `${year}.${month}.${day}`;
}

export function formatMonthLabel(month: string): string {
  const [, monthPart] = month.split("-");
  return `${Number(monthPart)}월`;
}
