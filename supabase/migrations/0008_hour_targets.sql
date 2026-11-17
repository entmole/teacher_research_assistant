-- 시수 관리: 학년·과목별 연간 기준 시수 (교사가 직접 입력)
-- 실제 시수는 저장하지 않고 NEIS 시간표 + 직접 수정분에서 매번 계산한다.
create table public.hour_targets (
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  school_year smallint not null check (school_year between 2000 and 2100),
  grade smallint not null check (grade between 1 and 6),
  subject_name text not null check (char_length(subject_name) between 1 and 30),
  hours smallint not null check (hours between 0 and 999),
  updated_at timestamptz not null default now(),
  primary key (owner_id, school_year, grade, subject_name)
);

create trigger hour_targets_set_updated_at
  before update on public.hour_targets
  for each row execute function public.set_updated_at();

alter table public.hour_targets enable row level security;

create policy "본인 기준 시수만 접근" on public.hour_targets
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
