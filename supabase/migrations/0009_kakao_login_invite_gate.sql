-- 카카오 로그인 지원: 초대 코드 확인을 "가입 시점"과 "첫 로그인 후" 두 경로로 나눈다.
-- - 이메일 가입: 기존처럼 가입할 때 초대 코드를 검사한다.
-- - 카카오 등 소셜 가입: 가입할 때 코드를 보낼 수 없으므로 계정은 만들되,
--   profiles.invited_at 이 비어 있는 동안은 앱을 쓸 수 없고 초대 코드를 입력해야 한다.

alter table public.profiles add column invited_at timestamptz;

-- 이미 가입한 교사는 모두 초대된 것으로 본다.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
update public.profiles set invited_at = now() where invited_at is null;

-- 교사가 API 로 자신의 invited_at 을 직접 채워 초대 절차를 건너뛰지 못하게,
-- 프로필에서 쓸 수 있는 열을 제한한다. (invited_at 은 아래 함수로만 바뀐다)
revoke insert, update on public.profiles from authenticated;
grant insert (id, teacher_type, specialist_subjects, ai_enabled, style_rules)
  on public.profiles to authenticated;
grant update (teacher_type, specialist_subjects, ai_enabled, style_rules)
  on public.profiles to authenticated;

-- 가입 시 초대 코드 검사: 이메일 가입만 검사하고, 소셜 가입은 통과시킨다.
create or replace function private.check_signup_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_required text;
begin
  if coalesce(new.raw_app_meta_data ->> 'provider', 'email') <> 'email' then
    return new;
  end if;

  select value into v_required from private.app_settings where key = 'signup_invite_code';
  if v_required is null or v_required = '' then
    return new;
  end if;

  if coalesce(new.raw_user_meta_data ->> 'invite_code', '') <> v_required then
    raise exception 'invalid invite code';
  end if;

  new.raw_user_meta_data := new.raw_user_meta_data - 'invite_code';
  return new;
end;
$$;

-- 가입 시 프로필 생성: 이메일 가입(코드 검사를 통과함)이거나 초대 코드가 설정되지 않았으면
-- 바로 초대된 상태로 만들고, 소셜 가입은 초대 코드 입력 전까지 비워 둔다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_required text;
  v_is_invited boolean;
begin
  select value into v_required from private.app_settings where key = 'signup_invite_code';
  v_is_invited :=
    coalesce(new.raw_app_meta_data ->> 'provider', 'email') = 'email'
    or v_required is null
    or v_required = '';

  insert into public.profiles (id, invited_at)
  values (new.id, case when v_is_invited then now() end)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 로그인한 사용자가 초대 코드를 입력해 사용 권한을 얻는다. 코드가 맞으면 true.
create or replace function public.redeem_invite(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_required text;
begin
  if auth.uid() is null then
    return false;
  end if;

  select value into v_required from private.app_settings where key = 'signup_invite_code';
  if v_required is not null and v_required <> '' and btrim(coalesce(p_code, '')) <> v_required then
    return false;
  end if;

  insert into public.profiles (id, invited_at) values (auth.uid(), now())
  on conflict (id) do update set invited_at = coalesce(public.profiles.invited_at, now());
  return true;
end;
$$;

revoke execute on function public.redeem_invite(text) from public, anon;
grant execute on function public.redeem_invite(text) to authenticated;
