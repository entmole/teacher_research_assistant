-- 2단계 진도 관리 스키마: 과목 → 단원 → 차시, 그리고 학급별 진도 기록
-- 차시는 학년 공통으로 두고 진도는 학급별로 기록하므로, 같은 학년의 반별 진도 차이를 비교할 수 있다.

-- ---------------------------------------------------------------------------
-- subjects: 교사가 가르치는 과목 (학년도·학년별)
-- ---------------------------------------------------------------------------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  school_year smallint not null check (school_year between 2000 and 2100),
  grade smallint not null check (grade between 1 and 6),
  name text not null check (char_length(name) between 1 and 20),
  created_at timestamptz not null default now(),
  unique (owner_id, school_year, grade, name)
);

-- ---------------------------------------------------------------------------
-- units: 단원
-- ---------------------------------------------------------------------------
create table public.units (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  order_no smallint not null check (order_no >= 1),
  title text not null check (char_length(title) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (subject_id, order_no)
);

-- ---------------------------------------------------------------------------
-- lessons: 차시
-- ---------------------------------------------------------------------------
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  unit_id uuid not null references public.units (id) on delete cascade,
  order_no smallint not null check (order_no >= 1),
  title text not null check (char_length(title) between 1 and 100),
  created_at timestamptz not null default now(),
  unique (unit_id, order_no)
);

-- ---------------------------------------------------------------------------
-- progress_records: 학급별 진도 기록 (행이 있으면 해당 차시 수업 완료)
-- ---------------------------------------------------------------------------
create table public.progress_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  taught_on date not null,
  created_at timestamptz not null default now(),
  unique (classroom_id, lesson_id)
);

create index progress_records_lesson_idx on public.progress_records (lesson_id);

-- ---------------------------------------------------------------------------
-- RLS: 본인 행만 접근, 상위 행(과목·단원·학급·차시)도 본인 소유여야 한다.
-- ---------------------------------------------------------------------------
alter table public.subjects enable row level security;
alter table public.units enable row level security;
alter table public.lessons enable row level security;
alter table public.progress_records enable row level security;

create policy "본인 과목만 접근" on public.subjects
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "본인 단원만 접근" on public.units
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.subjects s
      where s.id = subject_id and s.owner_id = (select auth.uid())
    )
  );

create policy "본인 차시만 접근" on public.lessons
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.units u
      where u.id = unit_id and u.owner_id = (select auth.uid())
    )
  );

create policy "본인 진도 기록만 접근" on public.progress_records
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.classrooms c
      where c.id = classroom_id and c.owner_id = (select auth.uid())
    )
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- save_unit: 단원과 차시 목록을 한 번에(원자적으로) 저장한다.
-- - p_unit_id 가 null 이면 새 단원을 맨 뒤에 추가한다.
-- - 차시는 "줄 순서"로 맞춘다: 같은 순서의 차시는 제목만 바꾸고(진도 기록 유지),
--   줄이 늘면 추가하고, 줄이 줄면 뒤쪽 차시를 삭제한다(그 차시의 진도 기록도 삭제).
-- SECURITY INVOKER 이므로 RLS 가 그대로 적용된다.
-- ---------------------------------------------------------------------------
create or replace function public.save_unit(
  p_subject_id uuid,
  p_unit_id uuid,
  p_title text,
  p_lessons text[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_unit_id uuid := p_unit_id;
  v_lesson_count integer := coalesce(array_length(p_lessons, 1), 0);
begin
  if v_unit_id is null then
    insert into public.units (subject_id, order_no, title)
    values (
      p_subject_id,
      (select coalesce(max(u.order_no), 0) + 1 from public.units u where u.subject_id = p_subject_id),
      p_title
    )
    returning id into v_unit_id;
  else
    update public.units set title = p_title
    where id = v_unit_id and subject_id = p_subject_id;
    if not found then
      raise exception 'unit not found';
    end if;
  end if;

  delete from public.lessons where unit_id = v_unit_id and order_no > v_lesson_count;

  insert into public.lessons (unit_id, order_no, title)
  select v_unit_id, t.ord, t.title
  from unnest(p_lessons) with ordinality as t (title, ord)
  on conflict (unit_id, order_no) do update set title = excluded.title;

  return v_unit_id;
end;
$$;

revoke execute on function public.save_unit(uuid, uuid, text, text[]) from public, anon;
grant execute on function public.save_unit(uuid, uuid, text, text[]) to authenticated;
