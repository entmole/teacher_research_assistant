-- 4단계 AI 문체 교정: 교사별 AI 모드·작성 방법 설정, 하루 사용량 제한

-- ---------------------------------------------------------------------------
-- profiles: AI 모드 켜기/끄기와 교사가 직접 정하는 작성 방법(문체 규칙)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column ai_enabled boolean not null default false,
  add column style_rules text not null default ''
    check (char_length(style_rules) <= 1000);

-- ---------------------------------------------------------------------------
-- ai_usage: 교사별 하루 AI 요청 횟수 (공용 API 키의 무료 한도 보호용)
-- 교사는 자기 사용량을 "읽기"만 할 수 있고, 증가는 아래 함수로만 가능하다.
-- ---------------------------------------------------------------------------
create table public.ai_usage (
  owner_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  request_count integer not null default 0,
  primary key (owner_id, usage_date)
);

alter table public.ai_usage enable row level security;

create policy "본인 AI 사용량만 조회" on public.ai_usage
  for select to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- consume_ai_request: 오늘(한국 시간) 요청 횟수를 1 늘리고, 한도 안이면 true 를 돌려준다.
-- 한도를 교사가 바꿀 수 없도록 함수 안에 고정하고 SECURITY DEFINER 로 실행한다.
-- ---------------------------------------------------------------------------
create or replace function public.consume_ai_request()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_daily_limit constant integer := 200;
  v_count integer;
begin
  if auth.uid() is null then
    return false;
  end if;

  insert into public.ai_usage (owner_id, usage_date, request_count)
  values (auth.uid(), (now() at time zone 'Asia/Seoul')::date, 1)
  on conflict (owner_id, usage_date) do update
    set request_count = public.ai_usage.request_count + 1
    where public.ai_usage.request_count < v_daily_limit
  returning request_count into v_count;

  return v_count is not null;
end;
$$;

revoke execute on function public.consume_ai_request() from public, anon;
grant execute on function public.consume_ai_request() to authenticated;
