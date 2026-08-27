import { ExpenseChat } from "@/components/expense-chat";

export default function Home() {
  return (
    <div className="mx-auto flex h-dvh w-full min-w-0 max-w-[560px] flex-col bg-[#b2c7d9]">
      <header className="shrink-0 border-b border-[#9eb4c7] bg-[#b2c7d9] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="text-center text-[18px] font-bold tracking-tight text-[#191919]">
          AI 가계부 챗봇
        </h1>
      </header>
      <ExpenseChat />
    </div>
  );
}
