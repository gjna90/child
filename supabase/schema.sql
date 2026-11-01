-- 배방·탕정 유치원 지도 — 테스트판 DB (Supabase SQL Editor에 통째로 붙여넣고 Run)
-- 원칙: 브라우저(공개 키)로는 이 표를 직접 읽거나 쓸 수 없다.
--   · 쓰기: 서버 기능(functions/submit, functions/delete)만 — 서버 안에서만 쓰는 비밀 키 사용
--   · 읽기·지우기: 로그인한 관리자(admins 표에 등록된 계정)만
-- 다시 실행해도 안전하게 작성(if not exists / or replace).

create extension if not exists pgcrypto;

-- 1) 설문 결과 (이름·연락처 없음. rid = 무작위 응답번호)
create table if not exists public.submissions (
  id           uuid primary key default gen_random_uuid(),
  rid          text not null unique check (rid ~ '^R-[A-Z2-9]{8}$'),
  code_hash    text not null,                 -- sha256(rid:삭제코드). 삭제코드 원문은 저장하지 않음
  consent_ver  text not null,
  birth_year   int  not null check (birth_year between 2015 and 2030),
  observer     text not null check (observer in ('부모', '교사')),
  answers      jsonb not null,                -- {"1":"자주", ...} 24문항
  picks        text[] not null default '{}',  -- 설문에서 고른 지원
  plan         jsonb not null default '[]',   -- [{"id":"kinder:...","name":"..."}] 1~3지망
  reco_styles  text[] not null default '{}',  -- 원하는 교육 방향
  payload_hash text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  expires_at   timestamptz not null default '2027-03-31 23:59:59+09'
);
create index if not exists submissions_created_idx on public.submissions (created_at desc);
create index if not exists submissions_payload_idx on public.submissions (payload_hash);

-- 2) 반복 제출 제한 기록 (IP 원문 대신 해시만, 하루 뒤 삭제)
create table if not exists public.rate_log (
  id      bigint generated always as identity primary key,
  ip_hash text not null,
  kind    text not null,
  at      timestamptz not null default now()
);
create index if not exists rate_log_idx on public.rate_log (ip_hash, kind, at);

-- 3) 관리자 목록 (Authentication에서 만든 계정의 user id를 여기에 넣음)
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note    text,
  added_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 4) 접근 규칙 (RLS). 규칙이 없는 동작은 모두 막힘.
alter table public.submissions enable row level security;
alter table public.rate_log    enable row level security;
alter table public.admins      enable row level security;

revoke all on public.submissions, public.rate_log, public.admins from anon;
revoke insert, update on public.submissions from authenticated;
revoke all on public.rate_log from authenticated;
revoke insert, update, delete on public.admins from authenticated;
grant select, delete on public.submissions to authenticated;
grant select on public.admins to authenticated;
-- 서버 기능(비밀 키 = service_role)이 쓰고 지울 수 있게. 새 프로젝트는 새 표에 권한을 자동으로 주지 않음
grant select, insert, update, delete on public.submissions, public.rate_log, public.admins to service_role;
grant usage, select on all sequences in schema public to service_role;

drop policy if exists sub_admin_select on public.submissions;
create policy sub_admin_select on public.submissions for select to authenticated using (public.is_admin());
drop policy if exists sub_admin_delete on public.submissions;
create policy sub_admin_delete on public.submissions for delete to authenticated using (public.is_admin());
drop policy if exists admins_self on public.admins;
create policy admins_self on public.admins for select to authenticated using (user_id = auth.uid());
-- rate_log: 규칙 없음 = 서버 기능만 사용

-- 5) 보관 기간이 지난 결과 자동 삭제 (매일 새벽). 서버 기능도 호출될 때마다 한 번 더 지운다.
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'kinder-purge';
select cron.schedule('kinder-purge', '17 18 * * *', $$
  delete from public.submissions where expires_at < now();
  delete from public.rate_log where at < now() - interval '1 day';
$$);

-- 6) 관리자 등록 (계정을 만든 뒤 이메일만 바꿔서 실행)
-- insert into public.admins (user_id, note) select id, '운영자' from auth.users where email = '관리자이메일@example.com';
