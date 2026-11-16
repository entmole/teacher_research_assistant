/** Supabase 접속 정보. 값이 없으면 원인을 바로 알 수 있도록 한국어 오류를 던진다. */
export function getSupabaseEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase 환경변수가 없습니다. .env.example 을 참고해 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 를 설정해 주세요.",
    );
  }
  return { url, key };
}
