-- 월 예산. expenses와 같이 public 스키마에서 관리합니다.
create table if not exists public.budgets (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  month text not null unique,
  amount integer not null check (amount > 0)
);

alter table public.budgets enable row level security;

drop policy if exists "Allow all budgets" on public.budgets;
create policy "Allow all budgets"
  on public.budgets
  for all
  using (true)
  with check (true);
