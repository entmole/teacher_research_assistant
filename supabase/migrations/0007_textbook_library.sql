-- 교과서 자료실: 학년·학기·과목·출판사별 단원·차시를 여러 교사가 함께 쓰는 공용 자료
-- - textbooks: 교과서 1종 (학년, 학기, 과목, 출판사)
-- - textbook_versions: 그 교과서의 단원·차시 내용. 기본 자료(kind = 'base')와 교사 공유본(kind = 'shared')
-- 내용(content)은 [{"title": "단원명", "lessons": ["차시명", ...]}, ...] 형태의 JSON 으로 저장한다.
-- 교사는 자료를 자기 과목으로 "복사"해서 쓰므로, 자료실 내용이 바뀌어도 이미 불러온 과목은 바뀌지 않는다.

create table public.textbooks (
  id uuid primary key default gen_random_uuid(),
  grade smallint not null check (grade between 1 and 6),
  -- 1학기·2학기, 학년 전체(학기 구분 없음)면 0
  semester smallint not null default 0 check (semester between 0 and 2),
  subject text not null check (char_length(subject) between 1 and 20),
  publisher text not null check (char_length(publisher) between 1 and 30),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (grade, semester, subject, publisher)
);

create table public.textbook_versions (
  id uuid primary key default gen_random_uuid(),
  textbook_id uuid not null references public.textbooks (id) on delete cascade,
  -- 공유한 교사. 관리자가 넣은 기본 자료는 null
  owner_id uuid default auth.uid() references auth.users (id) on delete set null,
  kind text not null default 'shared' check (kind in ('base', 'shared')),
  note text not null default '' check (char_length(note) <= 100),
  content jsonb not null check (jsonb_typeof(content) = 'array'),
  unit_count integer not null default 0,
  lesson_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index textbook_versions_textbook_idx on public.textbook_versions (textbook_id, created_at desc);

-- 과목이 어느 교과서에서 왔는지 기억해 두어 공유할 때 학기·출판사를 미리 채운다.
alter table public.subjects
  add column textbook_id uuid references public.textbooks (id) on delete set null;

alter table public.textbooks enable row level security;
alter table public.textbook_versions enable row level security;

-- 자료실은 로그인한 교사 모두가 읽을 수 있다.
create policy "교과서 목록은 모두 조회" on public.textbooks
  for select to authenticated using (true);
create policy "교과서는 본인 이름으로만 등록" on public.textbooks
  for insert to authenticated with check (created_by = (select auth.uid()));

create policy "교과서 내용은 모두 조회" on public.textbook_versions
  for select to authenticated using (true);
-- 교사는 공유본(shared)만 올릴 수 있다. 기본 자료(base)는 관리자가 SQL 로 넣는다.
create policy "공유본은 본인 이름으로만 등록" on public.textbook_versions
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and kind = 'shared');
create policy "본인 공유본만 삭제" on public.textbook_versions
  for delete to authenticated using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- append_units: 과목 끝에 단원·차시 목록(JSON)을 덧붙인다.
-- 제목이 길면 잘라서 넣고, 빈 제목은 건너뛴다. SECURITY INVOKER 이므로 RLS 가 적용된다.
-- ---------------------------------------------------------------------------
create or replace function public.append_units(p_subject_id uuid, p_content jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_unit jsonb;
  v_unit_id uuid;
  v_title text;
  v_order_no integer;
  v_added integer := 0;
begin
  if jsonb_typeof(p_content) <> 'array' or jsonb_array_length(p_content) > 60 then
    raise exception 'invalid content';
  end if;
  if not exists (select 1 from public.subjects where id = p_subject_id) then
    raise exception 'subject not found';
  end if;

  select coalesce(max(order_no), 0) into v_order_no
  from public.units where subject_id = p_subject_id;

  for v_unit in select value from jsonb_array_elements(p_content)
  loop
    v_title := left(btrim(coalesce(v_unit ->> 'title', '')), 60);
    continue when v_title = '';

    v_order_no := v_order_no + 1;
    insert into public.units (subject_id, order_no, title)
    values (p_subject_id, v_order_no, v_title)
    returning id into v_unit_id;

    insert into public.lessons (unit_id, order_no, title)
    select v_unit_id, row_number() over (order by t.ord), left(btrim(t.title), 100)
    from jsonb_array_elements_text(coalesce(v_unit -> 'lessons', '[]'::jsonb))
      with ordinality as t (title, ord)
    where btrim(t.title) <> '' and t.ord <= 60;

    v_added := v_added + 1;
  end loop;

  return v_added;
end;
$$;

-- ---------------------------------------------------------------------------
-- import_textbook_version: 자료실의 내용을 내 과목으로 복사한다.
-- 같은 학년도·학년·과목이 이미 있으면 그 과목 끝에 덧붙인다. (예: 1학기 뒤에 2학기)
-- ---------------------------------------------------------------------------
create or replace function public.import_textbook_version(p_version_id uuid, p_school_year integer)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_textbook public.textbooks%rowtype;
  v_content jsonb;
  v_subject_id uuid;
begin
  select t.* into v_textbook
  from public.textbook_versions v join public.textbooks t on t.id = v.textbook_id
  where v.id = p_version_id;
  if not found then
    raise exception 'version not found';
  end if;
  select content into v_content from public.textbook_versions where id = p_version_id;

  select id into v_subject_id from public.subjects
  where owner_id = auth.uid() and school_year = p_school_year
    and grade = v_textbook.grade and name = v_textbook.subject;

  if v_subject_id is null then
    insert into public.subjects (school_year, grade, name, textbook_id)
    values (p_school_year, v_textbook.grade, v_textbook.subject, v_textbook.id)
    returning id into v_subject_id;
  else
    update public.subjects set textbook_id = v_textbook.id where id = v_subject_id;
  end if;

  perform public.append_units(v_subject_id, v_content);
  return v_subject_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- share_subject: 내 과목의 단원·차시 전체를 자료실에 공유본으로 올린다.
-- 해당 학년·학기·과목·출판사의 교과서가 없으면 새로 만든다.
-- ---------------------------------------------------------------------------
create or replace function public.share_subject(
  p_subject_id uuid,
  p_semester integer,
  p_publisher text,
  p_note text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_subject public.subjects%rowtype;
  v_publisher text := btrim(coalesce(p_publisher, ''));
  v_textbook_id uuid;
  v_content jsonb;
  v_unit_count integer;
  v_lesson_count integer;
  v_version_id uuid;
begin
  select * into v_subject from public.subjects where id = p_subject_id;
  if not found then
    raise exception 'subject not found';
  end if;

  select
    coalesce(jsonb_agg(jsonb_build_object('title', u.title, 'lessons', u.lessons) order by u.order_no), '[]'::jsonb),
    count(*),
    coalesce(sum(jsonb_array_length(u.lessons)), 0)
  into v_content, v_unit_count, v_lesson_count
  from (
    select un.order_no, un.title,
      coalesce(
        (select jsonb_agg(l.title order by l.order_no) from public.lessons l where l.unit_id = un.id),
        '[]'::jsonb
      ) as lessons
    from public.units un
    where un.subject_id = p_subject_id
  ) u;
  if v_unit_count = 0 then
    raise exception 'nothing to share';
  end if;

  select id into v_textbook_id from public.textbooks
  where grade = v_subject.grade and semester = p_semester
    and subject = v_subject.name and publisher = v_publisher;
  if v_textbook_id is null then
    insert into public.textbooks (grade, semester, subject, publisher)
    values (v_subject.grade, p_semester, v_subject.name, v_publisher)
    returning id into v_textbook_id;
  end if;

  insert into public.textbook_versions (textbook_id, note, content, unit_count, lesson_count)
  values (v_textbook_id, left(btrim(coalesce(p_note, '')), 100), v_content, v_unit_count, v_lesson_count)
  returning id into v_version_id;

  update public.subjects set textbook_id = v_textbook_id where id = p_subject_id;
  return v_version_id;
end;
$$;

revoke execute on function public.append_units(uuid, jsonb) from public, anon;
revoke execute on function public.import_textbook_version(uuid, integer) from public, anon;
revoke execute on function public.share_subject(uuid, integer, text, text) from public, anon;
grant execute on function public.append_units(uuid, jsonb) to authenticated;
grant execute on function public.import_textbook_version(uuid, integer) to authenticated;
grant execute on function public.share_subject(uuid, integer, text, text) to authenticated;
