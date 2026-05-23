import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * 쿠키 없는 익명(anon) Supabase 클라이언트 factory.
 *
 * 용도: `unstable_cache` 안에서 호출하는 "공개·승인(approved) 동아리" 읽기 전용.
 * - `unstable_cache` 내부에서는 next/headers 의 cookies() 같은 동적 API 호출이 금지된다.
 *   → server.ts 의 createClient()(쿠키 기반)는 캐시 안에서 못 씀.
 * - 공개 동아리 데이터는 인증 컨텍스트가 필요 없으므로(RLS: status='approved' 는 anon SELECT 허용)
 *   세션 없는 익명 클라이언트로 읽어 캐시 대상으로 삼는다.
 *
 * Fluid compute 원칙(전역 변수 금지)에 따라 호출마다 새 인스턴스를 생성한다.
 * persistSession/autoRefreshToken false — 세션/토큰 갱신 없이 순수 읽기.
 */
export function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
