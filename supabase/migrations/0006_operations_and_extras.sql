-- 운영 보완: 초대 코드 가입 제한, 단원 순서 변경, 작년 과목 복사, 결번 처리

-- ---------------------------------------------------------------------------
-- 1) 초대 코드 가입 제한
-- private.app_settings 의 signup_invite_code 값이 있으면, 가입할 때 같은 코드를 내야 한다.
-- 앱을 거치지 않고 Supabase API 로 직접 가입해도 막히도록 DB 트리거에서 검사한다.
-- 코드 값은 저장소에 두지 않고 DB 에만 저장한다. (값을 지우면 누구나 가입 가능)
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.app_settings (
  key text primary key,
  value text not null
);

create or replace function private.check_signup_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_required text;
begin
  select value into v_required from private.app_settings where key = 'signup_invite_code';
  if v_required is null or v_required = '' then
    return new;
  end if;

  if coalesce(new.raw_user_meta_data ->> 'invite_code', '') <> v_required then
    raise exception 'invalid invite code';
  end if;

  -- 확인이 끝난 코드는 사용자 정보에 남기지 않는다.
  new.raw_user_meta_data := new.raw_user_meta_data - 'invite_code';
  return new;
end;
$$;

revoke execute on function private.check_signup_invite() from public, anon, authenticated;

create trigger check_signup_invite_before_insert
  before insert on auth.users
  for each row execute function private.check_signup_invite();

-- ---------------------------------------------------------------------------
-- 2) 단원 순서 변경
-- 두 단원의 순서를 한 문장으로 맞바꾸려면 유일성 검사를 문장 끝으로 미뤄야 한다.
-- ---------------------------------------------------------------------------
alter table public.units
  drop constraint units_subject_id_order_no_key,
  add constraint units_subject_id_order_no_key
    unique (subject_id, order_no) deferrable initially immediate;

-- p_direction: 음수면 위로(앞 단원과 교환), 양수면 아래로(뒤 단원과 교환)
create or replace function public.move_unit(p_unit_id uuid, p_direction integer)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_subject_id uuid;
  v_order_no smallint;
  v_other_id uuid;
  v_other_order_no smallint;
begin
  select subject_id, order_no into v_subject_id, v_order_no
  from public.units where id = p_unit_id;
  if not found then
    raise exception 'unit not found';
  end if;

  if p_direction < 0 then
    select id, order_no into v_other_id, v_other_order_no
    from public.units
    where subject_id = v_subject_id and order_no < v_order_no
    order by order_no desc limit 1;
  else
    select id, order_no into v_other_id, v_other_order_no
    from public.units
    where subject_id = v_subject_id and order_no > v_order_no
    order by order_no asc limit 1;
  end if;

  if v_other_id is null then
    return;  -- 이미 맨 위 또는 맨 아래
  end if;

  update public.units
  set order_no = case when id = p_unit_id then v_other_order_no else v_order_no end
  where id in (p_unit_id, v_other_id);
end;
$$;

revoke execute on function public.move_unit(uuid, integer) from public, anon;
grant execute on function public.move_unit(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) 과목을 다른 학년도로 복사 (단원·차시 포함, 진도 기록·평가는 복사하지 않는다)
-- ---------------------------------------------------------------------------
create or replace function public.copy_subject_to_year(p_subject_id uuid, p_school_year integer)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_new_subject_id uuid;
  v_new_unit_id uuid;
  v_unit record;
begin
  insert into public.subjects (school_year, grade, name)
  select p_school_year, grade, name from public.subjects where id = p_subject_id
  returning id into v_new_subject_id;
  if v_new_subject_id is null then
    raise exception 'subject not found';
  end if;

  for v_unit in
    select id, order_no, title from public.units where subject_id = p_subject_id order by order_no
  loop
    insert into public.units (subject_id, order_no, title)
    values (v_new_subject_id, v_unit.order_no, v_unit.title)
    returning id into v_new_unit_id;

    insert into public.lessons (unit_id, order_no, title)
    select v_new_unit_id, order_no, title from public.lessons where unit_id = v_unit.id;
  end loop;

  return v_new_subject_id;
end;
$$;

revoke execute on function public.copy_subject_to_year(uuid, integer) from public, anon;
grant execute on function public.copy_subject_to_year(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) 결번(전출 등) 처리: 해당 번호를 평가 입력표와 집계에서 제외한다. 결과는 지우지 않는다.
-- ---------------------------------------------------------------------------
alter table public.students
  add column is_excluded boolean not null default false;

create or replace function public.set_excluded_students(p_classroom_id uuid, p_numbers integer[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.students
  set is_excluded = (student_number = any (coalesce(p_numbers, '{}')))
  where classroom_id = p_classroom_id;
$$;

revoke execute on function public.set_excluded_students(uuid, integer[]) from public, anon;
grant execute on function public.set_excluded_students(uuid, integer[]) to authenticated;
