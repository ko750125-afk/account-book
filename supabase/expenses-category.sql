-- expenses 테이블에 카테고리 칼럼 추가
alter table public.expenses
  add column if not exists category text not null default '기타';
