-- 지금 Supabase 프로젝트에 한 번만 실행 (SQL Editor에 통째로 붙여넣고 Run)
-- 1) 설문 제출 기능을 없앴으므로 그 표를 지운다 (남아 있던 시험 응답도 함께 지워짐)
drop table if exists public.submissions;

-- 2) 희망 순서(지원할 3곳)만 모으는 표
create table if not exists public.plans (
  id          text primary key check (id ~ '^P-[A-Z2-9]{10}$'), -- 기기마다 무작위 번호 (이름·연락처 없음)
  token_hash  text not null,                                    -- sha256(id:토큰). 같은 기기만 고치거나 지울 수 있게
  plan        jsonb not null default '[]',                      -- [{"id":"kinder:...","name":"..."}] 1~3지망
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  expires_at  timestamptz not null default '2027-03-31 23:59:59+09'
);
create index if not exists plans_updated_idx on public.plans (updated_at desc);

alter table public.plans enable row level security;
revoke all on public.plans from anon;
revoke insert, update on public.plans from authenticated;
grant select, delete on public.plans to authenticated;
grant select, insert, update, delete on public.plans to service_role;
drop policy if exists plans_admin_select on public.plans;
create policy plans_admin_select on public.plans for select to authenticated using (public.is_admin());
drop policy if exists plans_admin_delete on public.plans;
create policy plans_admin_delete on public.plans for delete to authenticated using (public.is_admin());

-- 3) 매일 새벽 보관 기간 지난 것 정리
select cron.unschedule(jobid) from cron.job where jobname = 'kinder-purge';
select cron.schedule('kinder-purge', '17 18 * * *', $$
  delete from public.plans where expires_at < now();
  delete from public.rate_log where at < now() - interval '1 day';
$$);
