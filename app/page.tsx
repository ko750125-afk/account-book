import { ExpenseBook } from "@/components/expense-book";

export default function Home() {
  return (
    <div className="flex min-w-0 flex-1 flex-col bg-[#f2f2f2]">
      <header className="mx-auto w-full max-w-[560px] px-5 pt-12 pb-6 sm:px-6 sm:pt-16 sm:pb-8">
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-[#222] sm:text-[2rem]">
          나의 스마트 가계부
        </h1>
        <p className="mt-3 max-w-sm text-[15px] leading-6 text-[#9a9a9a]">
          날짜, 금액, 내용만 입력하면 지출을 바로 기록할 수 있습니다.
        </p>
      </header>

      <main className="mx-auto flex w-full min-w-0 max-w-[560px] flex-1 px-4 pb-[max(5rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-20">
        <ExpenseBook />
      </main>
    </div>
  );
}
