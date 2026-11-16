-- 3단계 평가 기록 스키마: 학생(번호만), 평가, 평가 결과(A/B/C 등급 + 생기부 코멘트)
-- 학생 실명은 저장하지 않는다. 학생은 "학급 + 번호"로만 구분한다.

-- ---------------------------------------------------------------------------
-- students: 학급의 학생 번호
-- ---------------------------------------------------------------------------
create table public.students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  student_number smallint not null check (student_number between 1 and 60),
  -- 학생 수를 줄이면 삭제하지 않고 비활성으로 바꿔 기존 평가 결과를 보존한다.
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (classroom_id, student_number)
);

-- ---------------------------------------------------------------------------
-- assessments: 평가 (과목별, 단원 연결은 선택)
-- ---------------------------------------------------------------------------
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  unit_id uuid references public.units (id) on delete set null,
  title text not null check (char_length(title) between 1 and 60),
  -- 등급별 평가 기준 (4단계 AI 코멘트 생성에도 사용)
  criteria_a text not null default '' check (char_length(criteria_a) <= 300),
  criteria_b text not null default '' check (char_length(criteria_b) <= 300),
  criteria_c text not null default '' check (char_length(criteria_c) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assessments_subject_idx on public.assessments (subject_id);

create trigger assessments_set_updated_at
  before update on public.assessments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- assessment_results: 학생별 평가 결과
-- ---------------------------------------------------------------------------
create table public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  grade text check (grade in ('A', 'B', 'C')),  -- 코멘트만 먼저 적을 수 있도록 null 허용
  comment text not null default '' check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, student_id)
);

create index assessment_results_student_idx on public.assessment_results (student_id);

create trigger assessment_results_set_updated_at
  before update on public.assessment_results
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: 본인 행만 접근, 상위 행도 본인 소유여야 한다.
-- ---------------------------------------------------------------------------
alter table public.students enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_results enable row level security;

create policy "본인 학생 번호만 접근" on public.students
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.classrooms c
      where c.id = classroom_id and c.owner_id = (select auth.uid())
    )
  );

create policy "본인 평가만 접근" on public.assessments
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.subjects s
      where s.id = subject_id and s.owner_id = (select auth.uid())
    )
  );

create policy "본인 평가 결과만 접근" on public.assessment_results
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.assessments a
      where a.id = assessment_id and a.owner_id = (select auth.uid())
    )
    and exists (
      select 1 from public.students st
      where st.id = student_id and st.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- set_student_count: 학급의 학생 수를 맞춘다. (1번 ~ p_count 번 활성화)
-- 번호를 삭제하지 않으므로 이미 입력한 평가 결과는 사라지지 않는다.
-- SECURITY INVOKER 이므로 RLS 가 그대로 적용된다.
-- ---------------------------------------------------------------------------
create or replace function public.set_student_count(p_classroom_id uuid, p_count integer)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_count is null or p_count < 0 or p_count > 60 then
    raise exception 'student count out of range';
  end if;

  insert into public.students (classroom_id, student_number)
  select p_classroom_id, n from generate_series(1, p_count) as n
  on conflict (classroom_id, student_number) do update set is_active = true;

  update public.students set is_active = false
  where classroom_id = p_classroom_id and student_number > p_count;
end;
$$;

revoke execute on function public.set_student_count(uuid, integer) from public, anon;
grant execute on function public.set_student_count(uuid, integer) to authenticated;
