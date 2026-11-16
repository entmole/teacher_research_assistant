-- 트리거 전용 함수는 API(/rest/v1/rpc)로 직접 호출할 수 없게 실행 권한을 회수한다.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
