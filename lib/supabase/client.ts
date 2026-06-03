import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저(Client Component) 전용 Supabase 클라이언트.
 *
 * ── 싱글톤 ────────────────────────────────────────────────────────────────
 * @supabase/ssr 공식 권장: 브라우저에서는 단일 인스턴스를 재사용한다.
 * 매 호출마다 새 인스턴스를 만들면
 *  - GoTrueClient 가 여러 개 생겨 인증 상태가 분산되고,
 *  - Realtime 소켓이 컴포넌트마다 따로 연결되어 로그인 토큰(setAuth) 동기화가
 *    어긋나 postgres_changes 의 RLS 평가(auth.uid())가 실패 → 메시지 미수신.
 * 모듈 레벨 캐시로 단 하나의 인스턴스만 생성/공유한다.
 */

// 실제 생성 로직을 헬퍼로 분리 — ReturnType 으로 구체 타입을 추론시키기 위함
// (ReturnType<typeof createBrowserClient> 를 직접 쓰면 제네릭이 느슨하게 풀려
//  .on()/.select() 콜백 파라미터가 any 로 추론되는 문제가 있다)
function instantiate() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

let browserClient: ReturnType<typeof instantiate> | undefined;

export function createClient() {
  browserClient ??= instantiate();
  return browserClient;
}
