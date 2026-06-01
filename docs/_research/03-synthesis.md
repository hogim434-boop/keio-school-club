# K CLUB 종합 분석 — 모임 앱 기능 통합 로드맵

**작성일:** 2026-05-30
**담당:** info-synthesizer
**브랜드:** K CLUB (사용자 노출 표기는 항상 "K CLUB", 슬러그/내부 식별자만 `k-club`)
**입력 자료:**
- `docs/_research/01-market-scan.md` (web-research-analyst)
- `docs/_research/02-ux-patterns.md` (ux-gatherer)
- 기존 코드베이스: `app/`, `lib/`, `supabase/migrations/`
- `CLAUDE.md` — 3-context Supabase, `proxy.ts`, `cacheComponents` OFF 등 컨벤션

> 본 보고서는 Task #4(PRD 최종 작성)의 직접 입력 자료입니다. 아래 결론은 모두 K CLUB 기존 스택(Next.js App Router + Supabase SSR + shadcn/ui, RLS 기반 owner/admin 권한)을 그대로 재사용하는 전제로 정렬되어 있습니다.

---

## 📋 분석 개요

| 항목 | 내용 |
|------|------|
| 분석 목표 | 시장·UX 조사 결과를 **K CLUB 맥락**으로 좁혀, MVP→Phase 2/3 로드맵과 기술 의사결정을 확정한다 |
| 활용 자료 | 5개 앱 비교(01) + 4축 UX 패턴 매트릭스(02) + 기존 K CLUB 라우팅/스키마/RLS |
| 분석 방법 | (1) 영향도×구현난이도 매트릭스, (2) K CLUB 도메인 변형 매핑, (3) 안티패턴 차단, (4) 단계 분리 |
| 핵심 제약 | 일본 대학생 정서(LINE 의존·익명·既読 민감·新歓 집중), 카피 규칙(`サークル・部活動`, `公認` 금지), 기존 인증(getClaims/requireUser) 재사용 |

---

## 1. 기능 우선순위 매트릭스 (영향도 × 구현난이도)

영향도(Impact)는 「**일본 대학생 사용자가 K CLUB 안에서 모임 활동을 완결할 수 있는가**」 라는 핵심 가치 기준으로 측정. 난이도(Effort)는 기존 스택(Next.js App Router + RLS + shadcn/ui) 위에서의 구현 부담.

### 1-1. 영향도 × 난이도 4분면

```
영향도 ↑
  HIGH │ ▣ MVP 코어            ▢ MVP 도전 과제
       │   - 이벤트 풀스크린       - 정원+캔슬 웨이팅(H-1)
       │     라우트(H-7)           - 운영진 승인 게이팅(H-2)
       │   - RSVP 3단계(H-4)       - 단체채팅+공지 분리(H-8)
       │   - Going/Maybe pill      - 캘린더 내 인라인 RSVP(M-1)
       │   - 캘린더 추가 버튼(H-3)
       │   - 소셜 참가자 stack(H-5)
       │   - 하단 4탭(H-6)
       ├───────────────────────────────────────
   MED │ ▢ 점진 도입              ▢ Phase 2
       │   - D-day 카운트다운(M-3)    - 출결 세분화(M-5)
       │   - 권한 3단계(M-6)          - 정기/비정기 이벤트(M-2)
       │   - 스켈레톤(M-10)            - 읽음 표시(M-7)
       │   - fixed CTA 재사용(M-9)    - 전날 Blast 리마인더(M-4)
       │   - 스와이프 패널(M-8)
       ├───────────────────────────────────────
   LOW │ ▢ 보류                   ▢ Phase 3+
       │   (해당 없음 — Low 영향도   - PWA 홈 화면 추가(L-1)
       │    기능을 넣을 자리가       - LINE Notify 연계(L-2 변형)
       │    없도록 차단)              - 비로그인 "관심" 표시(L-3 변형)
       └───────────────────────────────────────
            LOW              HIGH  ← 구현난이도
```

### 1-2. 우선순위 표 (선정 근거 명시)

| 우선 | 코드 | 기능 | 영향도 | 난이도 | 단계 | 선정 이유 |
|------|------|------|:------:|:------:|:----:|----------|
| ★★★ | H-7 | 이벤트 상세 풀스크린 라우트 `/events/[id]` | High | ★ | MVP | 공유 URL이 곧 바이럴 채널. 모달은 차단됨 |
| ★★★ | H-4 | RSVP 3단계 (行く/たぶん/不参加) | High | ★ | MVP | 일본 학생 "검토 기간" 정서 → 전환율 핵심 |
| ★★★ | H-3 | Google/Apple 캘린더 추가 버튼 | High | ★ | MVP | 既存 P1-6 UI 재사용. JST 변환만 추가 |
| ★★★ | H-5 | 소셜 참가자 stack (닉네임+아바타) | High | ★ | MVP | 소셜 증명. 실명 노출은 opt-in |
| ★★★ | H-6 | 하단 4탭 (ホーム/さがす/マイ部活/マイページ) | High | ★★ | MVP | 앱 감각 전환의 「유일한 즉시 신호」 |
| ★★★ | H-2 | 운영진 승인 게이팅 (Approval Required) | High | ★★ | MVP | 비공개 이벤트 신뢰 구조. 기존 owner RLS 재사용 |
| ★★★ | H-1 | 정원 + 캔슬 웨이팅리스트 | High | ★★ | MVP | 新歓 시즌 트래픽 폭주 시 필수 |
| ★★ | M-3 | D-day 카운트다운 배지 | Med | ★ | MVP | 既存 P1-5와 통합. 신청 마감 가시화 |
| ★★ | M-9 | fixed bottom CTA pill 재사용 | Med | ★ | MVP | CircleActions 패턴 그대로 events에 확장 |
| ★★ | M-10 | Suspense + skeleton loading | Med | ★ | MVP | CLAUDE.md 권장 패턴. 진입 직후 체감 향상 |
| ★★ | M-1 | 캘린더 내 인라인 RSVP | High | ★★ | Phase 2 | 캘린더 뷰 구현 선행 필요 |
| ★★ | H-8 | 단체 채팅 + 운영진 공지 분리 | High | ★★★ | Phase 2 | LINE 병존 전략. 채팅 자체는 Phase 2부터 |
| ★★ | M-2 | 정기/비정기 이벤트 구분 | Med | ★★ | Phase 2 | 部活動 정기 연습 패턴 대응 |
| ★★ | M-6 | 권한 3단계 (代表/副代表/部員) | Med | ★★ | Phase 2 | owner 1인 모델 → owner+co-owner |
| ★★ | M-8 | 스와이프 패널 전환 | Med | ★★ | Phase 2 | framer-motion 이미 도입 |
| ★ | M-7 | 既読 표시 (新着/既読) | Med | ★★ | Phase 2 | LINE 既読 정서 대응. 채팅과 동시 도입 |
| ★ | M-4 | 전날 리마인더 Blast | Med | ★★ | Phase 2 | 앱 푸시 + 추후 LINE Notify |
| ★ | M-5 | 출결 세분화 (지각/조퇴) | Low~Med | ★★ | Phase 3 | 体育会系 한정 니즈. MVP에서 참가/불참만 |
| ✘ | L-1 | PWA 홈 화면 추가 유도 | Med | ★★★ | Phase 3 | iOS 16.4+ 일본 비율 높음. 단계적 |
| ✘ | L-2 | LINE Notify 연계 | Med | ★★★ | Phase 3 | 일본 정서 강점. 단 OAuth + API 설정 부담 |
| ✘ | L-3 | 비로그인 RSVP | Low | ★★★ | 보류 | 学校認証 구조와 충돌. 대신 "気になる" 카운터로 대체 |

**안티패턴 (구현 금지):**
A-1 모달 중첩 RSVP, A-2 채팅의 LINE 강제 대체, A-3 실명 전면 공개, A-4 별점 시스템 — `02-ux-patterns.md` 안티패턴 1~4와 동일.

---

## 2. 앱 전환 핵심 결정: PWA vs Capacitor vs SSR + 모바일 최적화

### 2-1. 3안 비교

| 기준 | A. SSR + 모바일 최적화 (기존 + 4탭) | B. PWA (manifest + SW + A2HS) | C. Capacitor (WebView 네이티브 래퍼) |
|------|----------------------------------------|--------------------------------|------------------------------------------|
| **개발 비용** | 매우 낮음 — 라우팅·shadcn 그대로 | 낮음 — manifest 작성·SW 1개 | 매우 높음 — 빌드 파이프라인·iOS 인증서·App Store 심사 |
| **앱 감각** | 4탭 + 풀스크린 라우트 + 스와이프 = 80% 도달 | A안 + 홈 화면 아이콘 + 푸시 = 95% | 100% 네이티브 외형 |
| **푸시 알림** | 불가 (이메일/LINE Notify로 대체) | iOS 16.4+ Safari Web Push 가능 | OS 푸시 100% 사용 가능 |
| **오프라인** | 불가 | 정적 자산 캐시 가능 | 풀 캐시 가능 |
| **배포** | `git push` → Vercel 즉시 | 동일 | App Store + Play 심사 (1~2주) |
| **인증/세션** | 기존 `proxy.ts` + 쿠키 그대로 | 동일 | WebView 쿠키 vs 네이티브 보관소 분리 이슈 |
| **`cacheComponents` OFF와 충돌** | 없음 | 없음 (쿼리 단위 캐싱은 그대로) | 없음 |
| **일본 iOS 비율 약 70%와 정합** | 보통 | 좋음 (A2HS UX 친숙) | 좋음 (단 심사 부담) |
| **롤백 용이성** | 100% | 95% | 30% (스토어 거치므로) |

### 2-2. 권장안: **B. PWA — 단, MVP는 A안 범위만 먼저 출시, Phase 2에서 PWA 진입**

근거:

1. **`CLAUDE.md`의 `cacheComponents` OFF 결정과 정합.** PWA는 클라이언트 SW 캐시이고, K CLUB의 "매번 최신" 원칙(서버 렌더)은 그대로 유지된다. SW는 정적 자산(JS/CSS/이미지)만 캐시하므로 stale 이슈가 재발하지 않는다.
2. **Capacitor는 K CLUB의 비즈니스 가치 대비 비용이 과도하다.** 사용자가 얻는 추가 가치(아이콘+푸시)는 PWA로 90% 대체 가능하고, 스토어 심사·인증서·릴리스 사이클은 학생 운영 환경에서 유지 부담이 크다. 단일 코드베이스(웹)에서 dev/prod 일관성을 유지하는 현 워크플로우를 깨트릴 이유가 없다.
3. **MVP에서는 A안만으로 충분.** 4탭 내비 + 풀스크린 이벤트 라우트 + framer-motion 스와이프 + skeleton 로딩의 4가지만 갖춰도 "앱 같다"는 체감의 80% 이상을 달성한다. PWA 매니페스트는 Phase 2에서 추가해도 UX 회귀 없이 누적 가능하다.
4. **Web Push는 iOS 16.4+ 사용자에게만 의미가 있고**, 그 전까지의 알림은 앱 푸시가 아니라 **앱 내 알림 센터(`/notifications` 기존 라우트)** 와 **LINE Notify 연계 (Phase 3)** 가 더 일본 정서에 맞다.

### 2-3. 단계별 적용

- **MVP (A안):** 하단 4탭, 이벤트 풀스크린 라우트, framer-motion 스와이프, skeleton, 메타 viewport `viewport-fit=cover` + `theme-color`.
- **Phase 2 (PWA 진입):** `public/manifest.webmanifest` 추가, 아이콘 세트 (180/192/512), `next-pwa` 또는 Next 15 native `serviceWorker` 옵션으로 정적 자산 캐시만 활성. iOS A2HS 안내 모달은 첫 방문 시 1회만 표시 + dismiss 영구 저장.
- **Phase 3 (Web Push):** iOS 16.4+ 식별 후 구독 동의 모달. 푸시 발송은 Supabase Edge Function + VAPID 키.

---

## 3. 채팅 / 캘린더 / 이벤트 RSVP — K CLUB 적용 시 변형 포인트

세 기능 모두 **기존 `proxy.ts` 인증, `requireUser()`, `is_admin()`, `owner_id` RLS 패턴**을 그대로 재사용한다. 신규 정책은 기존 `circles` 정책 파일과 동일한 형태로 추가한다.

### 3-1. 이벤트 RSVP (MVP 1순위)

**일본어 카피 (확정):**
| UI 위치 | 일본어 | 비고 |
|---------|--------|------|
| 메인 CTA | `イベントに参加する` | "RSVP"는 노출하지 않음 |
| 3단계 상태 | `行く` / `たぶん行く` / `行かない` | `Going / Maybe / Can't Go`의 일본어. Partiful 패턴 H-4 |
| 정원 표기 | `定員 N名 / 残り N名` | サクスク H-1 |
| 웨이팅 | `キャンセル待ち N番目` | サクスク H-1 |
| 승인 게이팅 | `運営の承認が必要です` | Lu.ma/Geneva H-2. **「公認」「公式承認」 사용 금지** |
| 마감 배지 | `締め切りまであと N日` | M-3, 기존 P1-5 amber 배지 재사용 |
| 캘린더 추가 | `カレンダーに追加` (Google / Apple) | H-3, JST 변환 필수 |
| 참가자 표시 | `〇〇さんほか N人が参加` | 소셜 stack. 닉네임만, 실명 opt-in |
| **단체 명칭** | `サークル・部活動` (両方併記) | `公認` 단어는 일체 사용하지 않음 |

**owner 권한 + RLS 영향:**
- 신규 테이블 `events`: `circle_id` FK + `created_by` FK. 정책은 기존 `circles` 패턴 그대로 **`(owner_id = auth.uid() OR is_admin())`** 를 `EXISTS (SELECT 1 FROM circles c WHERE c.id = events.circle_id AND ...)` 형태로 사용.
- 신규 테이블 `event_rsvps`: 본인 row INSERT/UPDATE/DELETE — `user_id = auth.uid()`. 운영진은 자신의 동아리 RSVP만 조회 가능.
- **승인 게이팅 (H-2):** `events.requires_approval boolean` + `event_rsvps.status enum('pending','approved','rejected','cancelled','waiting')`. 승인 작업은 운영진 RLS UPDATE로 처리.

**기존 인증 패턴 재사용:**
- Server Component / Server Action: `requireUser("/circles/[id]/events/[eventId]")` 호출 → 로그인 안 됐을 시 redirect_to 보존하며 `/auth/login`으로 보냄. 안티패턴 A-1(모달 중첩) 차단.
- Edge proxy: `proxy.ts` 그대로. `/events/*`도 proxy matcher에 포함되므로 별도 처리 불요. 단 미인증 통과 허용 경로에 **포함하지 않음** (이벤트 상세는 인증 후 조회).
- 공개 이벤트 미리보기는 별도 `unstable_cache` + `tags:["events:public"]`로 anon client 경유. `cacheComponents` 글로벌 켜기는 **여전히 금지**.

### 3-2. 캘린더 (MVP H-3 → Phase 2 M-1)

**MVP (H-3): 캘린더 추가 버튼 1종만**
- 이벤트 상세 페이지의 fixed bottom CTA pill 옆에 `カレンダーに追加` 버튼.
- shadcn `Popover` → `Google カレンダー` / `Apple カレンダー(.ics)` 2종 분기.
- JST 변환: `start_at`(timestamptz UTC) → `Asia/Tokyo`로 ICS 파일 생성. Google 링크는 `dates=YYYYMMDDTHHmmssZ` 그대로 UTC 사용.
- **이 단계까지는 캘린더 뷰 자체를 만들지 않는다.** 사용자가 외부 캘린더에 보관하도록 유도.

**Phase 2 (M-1): 캘린더 내 인라인 RSVP**
- 신규 라우트 `/calendar` — 하단 4탭에 포함시킬지 결정 보류. 현재 권장은 **`/circles/[id]/calendar`** 동아리별 캘린더 우선, 글로벌 캘린더는 Phase 3.
- 월간 그리드 뷰: shadcn `Calendar`(react-day-picker) + 이벤트 도트.
- 카드 클릭 시 인라인 `Sheet`(bottom) 또는 별도 페이지 이동 중 — **별도 페이지 이동 권장** (안티패턴 A-1 차단, 공유 URL 보존).

**owner 권한 + RLS:** 캘린더 자체는 단순 SELECT 뷰이므로 신규 RLS 불필요. `events` 정책을 그대로 재사용.

### 3-3. 채팅 (Phase 2부터)

**LINE 병존 전략 (안티패턴 A-2 차단):**
- MVP에서는 채팅을 **만들지 않는다.** 대신 기존 `circles.contact_line` 필드 + 상세 페이지 "公式LINEに参加" 버튼을 유지·강조한다.
- Phase 2 진입 시점에 **"K CLUB チャット (β)"** 로 출시하되, 동아리 LINE 그룹과 병존시키며 「LINE 卒業」 같은 메시지는 절대 노출하지 않는다.

**일본어 카피:**
| UI 위치 | 일본어 | 비고 |
|---------|--------|------|
| 채팅 탭 | `チャット` | 단순 표기 |
| 공지 채널 | `お知らせ` | 운영진 발송 전용 |
| 새 메시지 | `新着 N件` | 既読/新着 구분 (M-7) |
| 멘션 알림 | `@〇〇さんに通知` | 소모임 @태그 패턴 |
| 입장 안내 | `部員のみ参加できます` | "公認" 안 씀 |

**owner 권한 + RLS:**
- 신규 테이블 `chat_rooms`: `circle_id` FK + `kind enum('general','announcement')`.
- 신규 테이블 `chat_messages`: `room_id` FK + `user_id` FK + `body` + `created_at` + `read_by uuid[]` (既読 표시용).
- `announcement` 채널 INSERT: `EXISTS (SELECT 1 FROM circles c WHERE c.id = chat_rooms.circle_id AND (c.owner_id = auth.uid() OR is_admin()))`.
- `general` 채널 INSERT: 부원 멤버십 테이블 `circle_members` (Phase 2에서 신규) 기반으로 검증.
- 既読 처리: 메시지 조회 시 `read_by` 에 자신의 uuid를 append 하는 RPC. RLS는 `user_id = auth.uid()` 만 허용.

**기존 인증 패턴 재사용:**
- 채팅은 풀스크린 라우트 `/circles/[id]/chat`. 진입 직후 `requireUser()` + 멤버십 검증.
- Supabase Realtime 채널 구독은 client component에서 `lib/supabase/client.ts` 의 `createBrowserClient`로. JWT 갱신은 기존 쿠키 동기화에 위임 (3-context 패턴 그대로).

---

## 4. MVP vs Phase 2 / Phase 3 분리

### 4-1. MVP (출시 시점 ≤ 6주)

목표: **「이벤트를 만들고, 참가 신청을 받고, 캘린더에 추가한다」** 의 1차 완결.

| 영역 | 포함 | 제외 |
|------|------|------|
| 라우팅 | 하단 4탭, `/events/[id]` 풀스크린, 기존 `/circles/[id]` 유지 | `/calendar` 글로벌 캘린더, `/circles/[id]/chat` |
| 이벤트 | 생성·수정·삭제 (운영진), 단일 화면 폼(Lu.ma) | 정기 이벤트 자동 반복, 종일 이벤트 |
| RSVP | 行く/たぶん行く/行かない 3단계, 정원+웨이팅, 운영진 승인 게이팅 | 출결 세분화(지각/조퇴), 결제 |
| 캘린더 | `カレンダーに追加` 버튼 (Google/Apple) | 앱 내장 월간 그리드 |
| 알림 | 기존 `/notifications` 앱 내 알림 센터에 RSVP 승인/대기 승격 이벤트 추가 | 푸시, 이메일 Blast, LINE Notify |
| 채팅 | **포함하지 않음** (기존 `contact_line` 강조) | — |
| 모바일 UX | 4탭 + 스와이프 + skeleton + fixed CTA | PWA 매니페스트 |
| 권한 | 기존 owner 1인 모델 유지 | 副代表(co-owner) |

### 4-2. Phase 2 (출시 후 1~3개월)

목표: **「커뮤니티를 K CLUB 안에서 유지한다」**.

| 영역 | 포함 |
|------|------|
| 라우팅 | `/circles/[id]/chat`, `/circles/[id]/calendar`, PWA 매니페스트 |
| 채팅 | 단체 + 공지 채널 분리(H-8), 既読 표시(M-7), Supabase Realtime |
| 캘린더 | 동아리별 월간 그리드, 인라인 RSVP(M-1), 정기/비정기 구분(M-2) |
| 알림 | 전날 리마인더 Blast(M-4) — 우선 앱 푸시/이메일 |
| 권한 | 권한 3단계 (代表/副代表/部員)(M-6) — `circle_members` 테이블 신규 |
| 모바일 | PWA 매니페스트 + A2HS 안내, framer-motion 스와이프 패널(M-8) |

### 4-3. Phase 3 (3개월~)

| 영역 | 포함 |
|------|------|
| 알림 | iOS Web Push (16.4+), LINE Notify 연계(L-2) |
| 출결 | 지각/조퇴 세분화(M-5) — 体育会系 한정 활성화 |
| RSVP | 비로그인 「気になる」 카운터 (L-3 변형, 실제 참가는 로그인 유지) |
| 글로벌 | `/calendar` 전체 캘린더 (관심 동아리 통합) |
| 운영 | 동아리 활동 인센티브(포인트), 가입 심사 설문 |

### 4-4. 단계 분리 원칙

- **MVP → Phase 2 사이에 스키마 마이그레이션이 누적되지 않도록**, MVP 단계의 `events` / `event_rsvps` 스키마에 Phase 2 칼럼(`recurring_rule`, `attendance_state` 등)을 nullable 컬럼으로 사전 배치한다.
- **PWA 매니페스트는 MVP에 끼워 넣지 않는다.** 4탭 + 스와이프만으로 80% 달성하는 것을 검증하기 위함. 매니페스트는 Phase 2 진입 게이트.
- **채팅은 절대 MVP에 포함하지 않는다.** 안티패턴 A-2(LINE 강제 대체)는 운영 미숙 단계에서 자주 발생한다. 운영 노하우가 쌓인 Phase 2에서 LINE 병존 메시징으로 출시.

---

## 5. 기술 스택 영향

### 5-1. Supabase Realtime 도입 필요성

| 기능 | Realtime 필요? | 대안 |
|------|:--------------:|------|
| RSVP 정원/웨이팅 즉시 반영 | ✘ MVP 불필요 | Server Action 후 `router.refresh()` |
| 채팅 (Phase 2) | ✔ 필수 | `chat_messages` 테이블 Postgres CDC 구독 |
| 알림 센터 실시간 갱신 | ✘ MVP 불필요 | 폴링 30초 또는 페이지 진입 시 fetch |
| 캘린더 인라인 RSVP (Phase 2) | △ 권장 | Server Action 후 `revalidateTag("events")` |

**결론:** **MVP에서는 Realtime 도입 안 함.** Phase 2 채팅 출시 시점에 처음으로 Realtime 사용. 이때만 `lib/supabase/client.ts`의 browser client에 `realtime` 옵션 추가.

### 5-2. 신규 테이블 후보 (MVP 한정)

```sql
-- 1) events — 동아리 단위 이벤트
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text,
  cover_image_url text,
  capacity integer,                       -- NULL = 무제한
  requires_approval boolean NOT NULL DEFAULT false,
  visibility text NOT NULL DEFAULT 'members' CHECK (visibility IN ('public','members')),
  rsvp_deadline timestamptz,              -- NULL = 마감 없음
  -- Phase 2 대비 nullable 사전 배치
  recurrence_rule text,                   -- iCal RRULE
  is_all_day boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) event_rsvps — 1 user × 1 event = 1 row
CREATE TABLE public.event_rsvps (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('going','maybe','declined','pending','waiting','cancelled')),
  show_profile boolean NOT NULL DEFAULT true,  -- 소셜 stack opt-in/out
  waiting_position integer,                     -- waiting 상태일 때만
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

-- Phase 2 예약 (지금 만들지 않음, 스키마 일관성 참고용)
-- CREATE TABLE public.circle_members (circle_id, user_id, role enum('owner','co_owner','member'))
-- CREATE TABLE public.chat_rooms (id, circle_id, kind enum('general','announcement'))
-- CREATE TABLE public.chat_messages (id, room_id, user_id, body, read_by uuid[], created_at)
```

**인덱스:**
- `events (circle_id, starts_at DESC)` — 동아리 페이지 이벤트 목록.
- `events (starts_at) WHERE starts_at > now()` — 다가오는 이벤트 홈 카드.
- `event_rsvps (event_id, status)` — 정원/웨이팅 카운트.
- `event_rsvps (user_id, created_at DESC)` — 내 참가 이력 (마이페이지).

**기존 `circles` 컬럼 GRANT 함정 ([[circles-column-grant-trap]] 기억과 동일):** `events`에 신규 컬럼 추가 시 `GRANT INSERT/UPDATE (...)`를 명시 부여해야 함. RLS 통과해도 column GRANT 누락이면 42501 실패.

### 5-3. RLS 정책 변경 포인트

기존 패턴(`owner_id = auth.uid() OR is_admin()`)을 events에 그대로 이식:

```sql
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- events: SELECT — visibility='public'은 anon 포함 전체, 'members'는 인증 사용자에 한해 일단 전체 공개 (멤버십 테이블 도입은 Phase 2)
CREATE POLICY events_select ON public.events FOR SELECT
  USING (
    visibility = 'public'
    OR auth.uid() IS NOT NULL
  );

-- events: INSERT/UPDATE/DELETE — 동아리 owner 또는 admin만
CREATE POLICY events_write_owner ON public.events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id = events.circle_id
        AND (c.owner_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id = events.circle_id
        AND (c.owner_id = auth.uid() OR public.is_admin())
    )
  );

-- event_rsvps: SELECT — 본인 row + 동아리 owner(자기 이벤트 한정) + admin
CREATE POLICY rsvp_select ON public.event_rsvps FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.circles c ON c.id = e.circle_id
      WHERE e.id = event_rsvps.event_id
        AND (c.owner_id = auth.uid() OR public.is_admin())
    )
  );

-- event_rsvps: INSERT/UPDATE/DELETE — 본인 row만
CREATE POLICY rsvp_self_write ON public.event_rsvps FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- event_rsvps: 운영진 승인 게이팅용 UPDATE — owner가 status 변경 가능
CREATE POLICY rsvp_owner_update ON public.event_rsvps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.circles c ON c.id = e.circle_id
      WHERE e.id = event_rsvps.event_id
        AND (c.owner_id = auth.uid() OR public.is_admin())
    )
  );
```

**소셜 stack 공개 범위 (안티패턴 A-3 차단):**
- 참가자 목록 SELECT 시 `show_profile = false` 인 row는 닉네임/아바타 대신 `名前非公開` 텍스트로 마스킹. 마스킹 책임은 **쿼리 레이어(`lib/supabase/queries/events.ts`)** 에 두고, RLS에서 row를 숨기지 않는다 (카운트와 모순 발생 방지).

### 5-4. PWA 매니페스트 / Service Worker (Phase 2)

MVP에서는 작성하지 않음. Phase 2 진입 시:

- `public/manifest.webmanifest`
  - `name`: `K CLUB`
  - `short_name`: `KCLUB`
  - `start_url`: `/`
  - `display`: `standalone`
  - `theme_color`: `#000000` (기존 `app/layout.tsx`의 `theme-color` 메타와 일치 유지)
  - `background_color`: `#ffffff`
  - `icons`: 192/512/maskable 3종
- `app/layout.tsx`에 `<link rel="manifest" href="/manifest.webmanifest" />` + `<meta name="apple-mobile-web-app-capable" content="yes" />`.
- Service Worker는 **정적 자산만 캐시.** API 응답·서버 렌더 페이지는 캐시 금지 ([[cachecomponents-disabled-on-purpose]] 기억과 정합).
- A2HS 안내 모달은 첫 방문 후 3분 + 페이지 2개 이상 본 사용자에게만 1회 표시. dismiss는 `localStorage`에 영구 저장.

### 5-5. 라우팅 변경 요약

| 라우트 | 추가 시점 | 비고 |
|--------|-----------|------|
| `/events/[id]` | MVP | 풀스크린, anon SELECT 허용 (visibility=public) |
| `/circles/[id]/events/new` | MVP | owner 전용 (page-level 가드 + RLS) |
| `/circles/[id]/events/[eventId]/edit` | MVP | 동일 |
| 하단 4탭 layout | MVP | `app/(tabs)/layout.tsx` route group 도입 권장. `auth/*`는 제외 |
| `/circles/[id]/chat` | Phase 2 | Realtime |
| `/circles/[id]/calendar` | Phase 2 | 월간 그리드 |
| `/calendar` | Phase 3 | 관심 동아리 통합 |

**기존 `/circles/[id]/template.tsx` 함정 주의** ([[circle-detail-template-fixed-trap]] 기억): 이벤트 풀스크린 페이지를 `/circles/[id]/events/[eventId]`로 두지 말고 **루트 `/events/[id]`로 분리**한다. 동아리 상세 template transform이 자식 페이지를 깨뜨리는 이슈를 차단.

---

## 6. 핵심 결론 및 권고사항

1. **MVP는 "이벤트 + RSVP + 캘린더 추가 버튼 + 하단 4탭" 4개로 응축**한다. 채팅·캘린더 뷰·PWA는 일체 제외하여 6주 안에 출시 가능한 범위로 묶는다.
2. **앱 전환은 PWA가 정답, 단 MVP에는 넣지 않는다.** 4탭 + 풀스크린 라우트 + 스와이프만으로 앱 감각의 80%를 달성하고, PWA는 Phase 2 진입 게이트로 활용.
3. **채팅은 Phase 2부터, LINE 병존.** 기존 `contact_line` UI를 MVP까지 강조하고, Phase 2 출시 시에도 「LINE 卒業」 메시지 일체 금지.
4. **RLS는 기존 `owner_id = auth.uid() OR is_admin()` 패턴 그대로 재활용.** 신규 RPC·헬퍼 함수 도입 없이 events / event_rsvps 두 테이블만 추가하면 MVP 완성.
5. **카피 규칙 일관 적용:** 전 화면에서 `サークル・部活動` 병기, `公認` 단어 0회, RSVP 일본어는 `行く / たぶん行く / 行かない` 3단계 통일.

---

## ⚠️ 한계 및 추가 검토 필요 사항

- **`event.md` 초안 미존재:** team-lead 지시문에 언급된 `/Users/kiimho/workspace/keio-school-club/event.md`는 현 워킹트리에 없음 (`git status`에도 미표시). 초안 흡수 통합은 본 보고서에서 수행하지 못함 — 초안이 발견되면 본 보고서의 「캘린더 MVP 범위(H-3만)」 결정을 1회 재검토 권장.
- **Supabase MCP 토큰 만료:** 원격 스키마 직접 조회는 못 했고 로컬 마이그레이션 기준으로 작성됨. Phase 4(PRD 작성) 단계에서 `mcp__supabase__list_tables`로 최종 검증 필요.
- **회원 멤버십 모델 미정:** 「부원만 채팅 입장 가능」 정책은 `circle_members` 테이블이 Phase 2 신규 도입되어야 성립. MVP의 `events.visibility='members'`는 임시로 "인증 사용자 전체"로 운영하다 Phase 2에서 강화.
- **iOS Web Push 16.4 미만 사용자 비율 미확인:** Phase 3 알림 전략(Web Push vs LINE Notify) 가중치는 출시 후 사용자 OS 분포 측정 후 재조정 권장.
- **Realtime 비용:** Phase 2 채팅 도입 시 Supabase Realtime의 동시 연결 수가 무료 플랜 한도(200)를 넘을 수 있음. 출시 전 비용 시뮬레이션 필요.

---

*분석 완료: 2026-05-30 | 담당: info-synthesizer*
*다음 단계: 본 보고서를 입력으로 Task #4 (docs/PRD.md 최종 작성) 진행*
