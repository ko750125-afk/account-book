function formatKstDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
  }).format(date);
}

export function todayKstDate(): string {
  return formatKstDate(new Date());
}

export function addKstDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00+09:00`);
  date.setTime(date.getTime() + days * 86_400_000);
  return formatKstDate(date);
}

function kstWeekday(isoDate: string): number {
  return new Date(`${isoDate}T12:00:00+09:00`).getUTCDay();
}

export interface KstDateContext {
  today: string;
  yesterday: string;
  thisMonthStart: string;
  thisMonthEnd: string;
  lastWeekStart: string;
  lastWeekEnd: string;
}

export function getKstDateContext(): KstDateContext {
  const today = todayKstDate();
  const daysSinceMonday = (kstWeekday(today) + 6) % 7;
  const thisMonday = addKstDays(today, -daysSinceMonday);

  return {
    today,
    yesterday: addKstDays(today, -1),
    thisMonthStart: `${today.slice(0, 7)}-01`,
    thisMonthEnd: today,
    lastWeekStart: addKstDays(thisMonday, -7),
    lastWeekEnd: addKstDays(thisMonday, -1),
  };
}

export function currentMonthKey(): string {
  return todayKstDate().slice(0, 7);
}
