-- 배방·탕정 유치원 지도 — 일반 웹판 DB 전체 (새 Supabase 프로젝트에서 처음 설정할 때만. 지금 프로젝트는 2026-11-02_희망순서.sql)
-- 모으는 것: 희망 순서(지원할 3곳)만. 아이 설문·상담 기록·메모·출발지는 각자 기기에만 저장되고 여기 오지 않는다.
-- 원칙: 브라우저(공개 키)로는 직접 읽거나 쓸 수 없다. 쓰기는 서버 기능(functions/plan)만, 읽기·지우기는 관리자만.

-- 1) 관리자 목록 (Authentication에서 만든 계정의 id)
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text, added_at timestamptz not null default now()
);
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 2) 반복 요청 제한 기록 (IP 원문 대신 해시, 하루 뒤 삭제)
create table if not exists public.rate_log (
  id bigint generated always as identity primary key,
  ip_hash text not null, kind text not null, at timestamptz not null default now()
);
create index if not exists rate_log_idx on public.rate_log (ip_hash, kind, at);

-- 3) 희망 순서
create table if not exists public.plans (
  id text primary key check (id ~ '^P-[A-Z2-9]{10}$'),
  token_hash text not null,
  plan jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default '2027-03-31 23:59:59+09'
);
create index if not exists plans_updated_idx on public.plans (updated_at desc);

-- 4) 접근 규칙
alter table public.admins enable row level security;
alter table public.rate_log enable row level security;
alter table public.plans enable row level security;
revoke all on public.admins, public.rate_log, public.plans from anon;
revoke insert, update, delete on public.admins from authenticated;
revoke all on public.rate_log from authenticated;
revoke insert, update on public.plans from authenticated;
grant select on public.admins to authenticated;
grant select, delete on public.plans to authenticated;
grant select, insert, update, delete on public.admins, public.rate_log, public.plans to service_role;
grant usage, select on all sequences in schema public to service_role;
drop policy if exists admins_self on public.admins;
create policy admins_self on public.admins for select to authenticated using (user_id = auth.uid());
drop policy if exists plans_admin_select on public.plans;
create policy plans_admin_select on public.plans for select to authenticated using (public.is_admin());
drop policy if exists plans_admin_delete on public.plans;
create policy plans_admin_delete on public.plans for delete to authenticated using (public.is_admin());

-- 5) 매일 새벽 정리
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'kinder-purge';
select cron.schedule('kinder-purge', '17 18 * * *', $$
  delete from public.plans where expires_at < now();
  delete from public.rate_log where at < now() - interval '1 day';
$$);

-- 6) 관리자 등록 (계정을 만든 뒤 이메일만 바꿔서 실행)
-- insert into public.admins (user_id, note) select id, '운영자' from auth.users where email = '관리자이메일@example.com';
