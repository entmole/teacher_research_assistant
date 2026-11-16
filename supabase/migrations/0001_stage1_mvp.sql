-- 1단계 MVP 스키마: 교사 프로필, 학교 설정, 담당 학급, 시간표 수정분, 직접 추가한 일정
-- 모든 테이블은 RLS로 "본인(owner) 행만" 읽고 쓸 수 있다.
-- 학생 실명 등 개인정보는 어떤 테이블에도 저장하지 않는다.

-- ---------------------------------------------------------------------------
-- 공통: updated_at 자동 갱신
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: 교사 프로필 (auth.users 와 1:1)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- homeroom = 담임, specialist = 전담
  teacher_type text not null default 'homeroom'
    check (teacher_type in ('homeroom', 'specialist')),
  -- 전담 교사의 담당 과목 (예: {영어})
  specialist_subjects text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 회원가입 시 프로필 행 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- school_settings: 교사별 학교 설정 (NEIS 학교코드)
-- ---------------------------------------------------------------------------
create table public.school_settings (
  owner_id uuid primary key default auth.uid()
    references auth.users (id) on delete cascade,
  atpt_code text not null,      -- 시도교육청코드 (예: R10)
  atpt_name text not null,      -- 시도교육청명
  school_code text not null,    -- 행정표준코드 (예: 8901044)
  school_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger school_settings_set_updated_at
  before update on public.school_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- classrooms: 담당 학급 (담임 1개, 전담 여러 개)
-- ---------------------------------------------------------------------------
create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  school_year smallint not null check (school_year between 2000 and 2100),
  grade smallint not null check (grade between 1 and 6),
  class_nm text not null check (char_length(class_nm) between 1 and 10),
  created_at timestamptz not null default now(),
  unique (owner_id, school_year, grade, class_nm)
);

-- ---------------------------------------------------------------------------
-- timetable_overrides: 교사가 직접 수정한 시간표 칸
-- 화면에는 "NEIS 원본 + 이 테이블"을 합쳐서 보여 준다.
-- ---------------------------------------------------------------------------
create table public.timetable_overrides (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  date date not null,
  period smallint not null check (period between 1 and 10),
  subject text not null check (char_length(subject) between 1 and 30),
  memo text not null default '' check (char_length(memo) <= 200),
  is_cancelled boolean not null default false,  -- 해당 차시 수업 없음(결강·행사 등)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (classroom_id, date, period)
);

create index timetable_overrides_owner_date_idx
  on public.timetable_overrides (owner_id, date);

create trigger timetable_overrides_set_updated_at
  before update on public.timetable_overrides
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- custom_events: 교사가 직접 추가한 일정 (NEIS 학사일정과 함께 표시)
-- ---------------------------------------------------------------------------
create table public.custom_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  date date not null,
  title text not null check (char_length(title) between 1 and 50),
  created_at timestamptz not null default now()
);

create index custom_events_owner_date_idx
  on public.custom_events (owner_id, date);

-- ---------------------------------------------------------------------------
-- RLS: 교사별 데이터 분리
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.school_settings enable row level security;
alter table public.classrooms enable row level security;
alter table public.timetable_overrides enable row level security;
alter table public.custom_events enable row level security;

create policy "본인 프로필만 접근" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "본인 학교 설정만 접근" on public.school_settings
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "본인 학급만 접근" on public.classrooms
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- 수정분은 "본인 소유 학급"에만 달 수 있다.
create policy "본인 시간표 수정분만 접근" on public.timetable_overrides
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.classrooms c
      where c.id = classroom_id and c.owner_id = (select auth.uid())
    )
  );

create policy "본인 일정만 접근" on public.custom_events
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
