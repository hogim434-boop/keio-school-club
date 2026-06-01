# K CLUB MVP PRD

> **버전:** 2.3 | **작성일:** 2026-05-30 | **담당:** team-lead + prd-writer
> **입력 자료:** 01-market-scan.md · 02-ux-patterns.md · 03-synthesis.md · 사용자 결정 (시간차 비전 + 빡센 관리 + 連絡 통합 + **3단계 시간차 / Capacitor 네이티브**)
> **변경 이력:** v1.0 (옵션 A/B 양안) → v2.0 (시간차 병행) → v2.1 (이벤트 빡센 관리) → v2.2 (동아리 상세 단순화 + 連絡 통합) → **v2.3 3단계 시간차 + Capacitor 네이티브 채택**

---

## 변경 요약 (v2.2 → v2.3)

사용자 의견을 반영하여 **2단계 시간차 (가입 前 / 가입 後) 를 3단계 시간차** 로 정교화했다. 「가입 前」 단계 안에 「가벼운 탐색 (웹)」 과 「진지한 검토 (앱)」 을 채널 분리하여, 네이티브 앱 정체성을 강화하면서도 신환 시즌 가벼운 진입을 잃지 않는다.

| 영역 | v2.2 | **v2.3** |
|------|------|----------|
| 시간차 단계 | 2단계 (가입 前 / 後) | **3단계** (탐색 / 검토 / 가입 後) |
| 진입 채널 | 웹 (모바일 최적화) | **웹 (탐색) + 네이티브 앱 (검토)** |
| 네이티브 전환 기술 | PWA Phase 2 (선택적) | **Capacitor 네이티브 앱 (필수)** + iOS·Android 스토어 출시 |
| 「気になる」 「行く予定」 | 웹·앱 모두 | **앱 only** (개인 데이터 + 동기화) |
| 運営に問い合わせる (F050) | 웹·앱 모두 | **앱 only** (푸시 알림 핵심) |
| マイページ (F060-F064) | 웹·앱 모두 | **앱 only** |
| 갤러리 사진 업로드 | 웹·앱 모두 | **앱 only** (운영진 카메라 활용) |
| 발견·이벤트·캘린더 열람 | 웹·앱 모두 | **웹+앱 양쪽** 유지 (가벼움 보존) |
| iOS Web Push (F006) | Phase 3 (PWA 의존) | ❌ 폐기 → **Capacitor Push (FCM+APNs)** 로 대체 |
| 앱 전용 라우트 분리 | — | ✅ **신규 9-7 Capacitor 섹션** |
| 가입 결정 전환율 KPI | 단일 클릭율 | **다단계 깔때기** (웹 발견 → 앱 다운로드 → DM 발신) |
| 예상 일정 | 13-19주 | **17-25주** (+4-6주 Capacitor Phase 1.5) |
| 운영 비용 | $0 + Vercel | + Apple Dev $99/년 + Google Play $25 (평생) |

---

## 변경 요약 (v2.1 → v2.2)

사용자 의견을 반영하여 동아리 상세 페이지의 운영 부담을 줄이고, 가입 결정 동선을 「공식 LINE 직접 노출」 에서 **「운영진에 問い合わせ 후 운영진이 채널 안내」** 로 부드럽게 전환했다.

| 영역 | v2.1 | **v2.2** |
|------|------|----------|
| F022 過去のイベント 아카이브 | MVP 포함 | ❌ **삭제** (이벤트 영구 URL 누적으로 자연 충족) |
| F023 よくある質問 게시판 | MVP 포함 | ❌ **삭제** (F050 DM에서 자연 형성) |
| F024 「先輩のコメント」 | Phase 2 | ❌ **삭제** (실현성 낮음) |
| F025 「公式LINEに参加」 메인 CTA | 메인 CTA | ❌ **폐기 → F050으로 통합** |
| 메인 CTA 카피 | 「公式LINEに参加」 | ✅ **「運営に問い合わせる」** |
| F050 운영진 DM 위치 | 보조 진입 | ✅ **메인 진입점으로 격상** |
| F050 카테고리 | fee/schedule/vibe/trial/other | ✅ + **interest (가입 의사)** 추가 |
| LINE 그룹 링크 노출 | 동아리 상세 직접 | ✅ **운영진이 DM 답신 시 안내** + 동아리 상세 풋터의 「外部リンク」 약화 표시 |
| `circle_faqs` 테이블 | 정의됨 | ❌ **삭제** |
| 예상 일정 | 16-21주 | **13-19주** (운영 부담·기능 수 축소) |

---

## 변경 요약 (v2.0 → v2.1)

v2.0에서 「약한 RSVP·정원 약화」 로 LINE에 위임했던 영역을, 사용자 결정에 따라 **K CLUB이 이중 모드(가벼움/강함)** 로 흡수한다. 운영자가 이벤트 등록 시 RSVP 강도를 선택할 수 있게 하여 시간차 비전(가입 검토자의 가벼움)과 빡센 관리(부원 행사의 엄격함)를 모두 살린다.

| 영역 | v2.0 | **v2.1** |
|------|------|----------|
| RSVP 정식 책임 | LINE | **K CLUB (이중 모드)** |
| F033 RSVP | 「気になる / 行く予定」 2단계 단일 모드 | **이중 모드** — 가벼움(2단계) / 강함(`行く / たぶん行く / 行かない`) |
| F034 카운트 | 참고용만 | 강한 모드 시 정원·잔여 정확 표시 |
| 정원·웨이팅 자동 관리 | ❌ | ✅ F045 신규 (DB 트리거) |
| 운영진 승인 게이팅 | ❌ | ✅ F046 신규 |
| 명단·CSV·일괄 알림 | ❌ | ✅ F047 신규 |
| 변경 자동 알림 | ❌ | ✅ F048 신규 |
| 취소·재고지 | ❌ | ✅ F049 신규 |
| `event_rsvps` 테이블 | ❌ (event_interests만) | ✅ 신규 (strict 모드) |
| `event_change_logs` | ❌ | ✅ 신규 |
| 출결 관리 (A3) | — | Phase 2 |
| 노쇼 페널티 (B5) | — | Phase 3 |
| 멤버 전용 이벤트 (B6) | — | Phase 2 (`member` 권한 진입 시) |
| 예상 일정 | 13-17주 | **16-21주** |

---

## 변경 요약 (v1.0 → v2.0)

본 PRD는 v1.0의 「채팅 + 캘린더 + RSVP + 앱 전환 풀스코프」 비전을 **시간차 병행 모델**로 재정의한 결과물이다. 사용자와의 심층 논의를 거쳐 다음과 같이 변경되었다.

| 영역 | v1.0 | v2.0 |
|------|------|------|
| 포지셔닝 | "동아리 커뮤니티 플랫폼" (광범위) | **"동아리 가입 검토 도구" (시간차 분리)** |
| LINE 관계 | 안티패턴만 명시 | **명시적 역할 분담 + 가입 後 인계** |
| 단체 채팅 (F030-F034) | Phase 1 MVP | ❌ **전면 제거** (LINE 영역) |
| 발견 강화 | F012 단순 카드 | **5-2 발견 섹션 신설** (카테고리 큐레이션) |
| 동아리 상세 | 소개·이벤트만 | **갤러리 · FAQ · 아카이브 추가** |
| 이벤트 Q&A | 없음 | **F063 신규 추가** |
| 운영진 DM | 없음 | **F068 실시간 비대칭 모델 신규** |
| RSVP 톤 | 「行く / たぶん行く / 行かない」 | **「気になる / 行く予定」 약화** |
| 정원·승인 게이팅 | 강한 관리 | **참고용으로 약화** |
| 권한 3단계 | Phase 2 | **최소 형태 MVP 진입** (owner + staff) |
| 예상 일정 | 12-16주 | **13-17주** (시간차 + F068) |

---

## 1. 제품 비전

> **"K CLUB은 게이오生의 「동아리 가입 검토」 도구다.**
> **가입 결정의 순간까지 K CLUB이 책임지고, 가입 後엔 LINE에 깔끔하게 인계한다."**

K CLUB은 LINE을 대체하지 않는다. K CLUB은 LINE이 본질적으로 못 하는 영역, 즉 **「가입 검토 단계의 모든 행위」** 를 한 곳에서 책임진다. 가입 결정과 동시에 사용자는 LINE 그룹으로 자연스럽게 졸업한다.

브랜드: **K CLUB** (슬러그·내부 식별자만 `k-club`, 사용자 노출은 항상 "K CLUB")

---

## 2. 배경 & 문제 정의

### 2-1. 현 게이오生의 동아리 탐색·가입 흐름

```
①Discovery   인스타에서 서클 발견 / 친구 추천
     ↓
②Bridge      인스타 프로필의 LINE 링크 클릭
     ↓
③Engagement  신환 LINE 그룹 가입
     ↓
④Decision    LINE에서 공지·투표 확인
     ↓
⑤Commit      「참가」 표시
     ↓
⑥Execute     오프라인 모임 참가
```

### 2-2. 가입 검토 단계의 페인포인트

가입을 결정하기 전 단계(①~②, 그리고 ④의 일부)에서 신입생이 겪는 핵심 페인:

| 페인 | 현상 |
|------|------|
| **전체 조망 불가** | 어떤 サークル・部活動가 있는지 인스타 알고리즘에 의존 |
| **횡단 비교 불가** | 여러 동아리를 한눈에 비교할 수 있는 곳이 없음 |
| **과거 정보 휘발** | "작년 신환 행사 어땠나"를 알 수 없음 (LINE 채팅은 흘러감) |
| **시간 기반 탐색 부재** | "이번 주말 어떤 체험회 있나"를 캘린더로 못 봄 |
| **가입 前 질문 어려움** | 「분위기 어떤가요?」 「회비 얼마인가요?」를 인스타 DM·라인 ID 찾아 묻기 부담 |
| **가벼운 관심 표시 어려움** | LINE 그룹 가입은 무거운 결정 (알림 지옥) — 「気になる」 정도의 가벼움 부재 |
| **모바일 UX 부재** | 현 K CLUB은 웹앱 구조, "앱 같지 않다" |

### 2-3. 왜 LINE·인스타가 이 문제를 못 푸나

LINE·인스타는 본질적으로 「실시간 흐름」 + 「가입 후 멤버 도구」다. **「가입 전 비교·검토·비공개 질문」** 은 둘 다의 사각지대다. K CLUB은 이 사각지대를 정확히 채운다.

---

## 3. 타깃 사용자

| 페르소나 | 상황 | K CLUB에서 하는 일 |
|---------|------|---------------------|
| **게이오 신입생** (1학년 4월 입학) | 新歓 시즌 동아리 검토 중 | 발견 → 갤러리·FAQ로 이해 → 이벤트 발견 → 気になる → 운영진 DM 질문 → 가입 결정 → LINE 합류 |
| **가입 검토 재학생** | 추가 동아리·서브 동아리 고려 중 | 발견 → 빠른 비교 → 이벤트 참가 검토 |
| **サークル・部活動 운영자** | 신입생 유입 + 동아리 운영 | 이벤트 등록 · 운영진 DM 응대 · 갤러리·FAQ 관리 |
| **K CLUB 어드민** | 플랫폼 관리 | owner 권한 승급 · 신고 검토 · 어그로 사용자 제재 |

> **주목:** 「가입 後 부원」 은 타깃 사용자에서 의도적으로 제외된다. 가입 後 활동은 LINE이 담당하며, K CLUB은 가입 後 사용자에게 적극적 가치를 제공하지 않는다 (의도된 졸업).

---

## 4. K CLUB ↔ LINE 역할 분담 (신규 핵심 섹션)

본 PRD의 모든 의사결정은 다음 역할 분담을 따른다. 이 표가 K CLUB의 정체성이다.

### 4-1. 역할 분담 매트릭스

| 영역 | K CLUB | LINE |
|------|--------|------|
| **횡단 발견·검색** | ✅ 책임 | ❌ |
| **동아리 상세·이해** | ✅ 책임 | ❌ |
| **활동 사진·후기 영구 보관** | ✅ 책임 | ❌ |
| **過去 이벤트 아카이브** | ✅ 책임 | ❌ |
| **공개 Q&A · FAQ** | ✅ 책임 | ❌ |
| **운영진과 1:1 비공개 문의** | ✅ 책임 (F068) | ❌ |
| **이벤트 발견·캘린더** | ✅ 책임 | ❌ |
| **가벼운 관심 표시 (気になる)** | ✅ 책임 | ❌ |
| **가입 결정 동선** | ✅ 안내 | — |
| **정식 RSVP · 정원 · 웨이팅 관리** | ✅ 책임 (이중 모드, v2.1 변경) | ❌ |
| **실시간 멤버 그룹 채팅** | ❌ | ✅ 책임 |
| **既読 압박·안심** | ❌ | ✅ 책임 |
| **막판 일정 변경 알림** | ❌ | ✅ 책임 |
| **친목·잡담** | ❌ | ✅ 책임 |

### 4-2. 시간축 분리 원칙

```
[가입 前 단계]  K CLUB 단독 도구
   ↓
[가입 결정 순간]  K CLUB이 LINE 그룹 링크 제공 → 사용자가 LINE 합류
   ↓
[가입 後 단계]  LINE 단독 도구 (K CLUB은 의도적 졸업)
```

### 4-3. 안티패턴 (절대 금지)

본 역할 분담을 깨는 다음 패턴은 모든 UI·카피에서 금지한다:

- ❌ 「LINE 卒業」 「LINEはもう古い」 같은 LINE 대체 메시지
- ❌ K CLUB 내 실시간 그룹 채팅 도입 (단체 채팅·既読 등)
- ❌ 「가입 후 K CLUB만 봐도 충분」 류의 가입 後 유지 압박
- ❌ K CLUB에서 운영진에게 「즉답」 강제

### 4-4. 3단계 시간차 모델 *(v2.3 신규)*

K CLUB의 「가입 前」 단계를 다시 둘로 쪼개, 웹·앱 두 채널이 각자의 역할을 갖는 **3단계 시간차 모델**로 운영한다.

```
┌─────────────────────────────────────────────────────────────────┐
│ [1단계 — 탐색·발견]                       채널: 🌐 웹             │
│ ・인스타·구글·X에서 자연 진입 (마찰 0)                            │
│ ・さがす·カレンダー·동아리 상세·이벤트 상세 자유 열람              │
│ ・익명 OK, 회원가입 불필요                                        │
│ ・「가벼운 둘러보기」 만족                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓ 더 깊이 보고 싶어진 사용자
┌─────────────────────────────────────────────────────────────────┐
│ [2단계 — 검토·소통·참여 의향]            채널: 📱 네이티브 앱      │
│ ・스토어 다운로드 → 로그인 → 개인 데이터·푸시 알림 풀 활용         │
│ ・「気になる」 「行く予定」 (북마크)                                 │
│ ・運営に問い合わせる (F050 DM + 푸시)                              │
│ ・マイページ 통합 관리                                             │
│ ・갤러리 사진 업로드 (운영진, 카메라 직접 접근)                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓ 가입 결정
┌─────────────────────────────────────────────────────────────────┐
│ [3단계 — 가입 후 활동]                   채널: 🟢 LINE (외부)      │
│ ・실시간 그룹 채팅·친목·본격 동아리 활동                          │
│ ・K CLUB은 의도된 졸업                                            │
└─────────────────────────────────────────────────────────────────┘
```

### 4-5. 웹·앱 채널 분리 매트릭스 *(v2.3 신규)*

| 기능 영역 | 🌐 웹 | 📱 앱 | 비고 |
|---|---|---|---|
| 발견 (검색·카테고리·신환 큐레이션) | ✅ | ✅ | 가벼운 탐색 보존 |
| 동아리 상세 (프로필·갤러리 **열람**·외부 링크) | ✅ | ✅ | 익명 OK |
| 이벤트 상세·캘린더 **열람** | ✅ | ✅ | 익명 OK |
| 「カレンダーに追加」 (Google/Apple) | ✅ | ✅ | 외부 캘린더 연계 |
| 「気になる」 / 「行く予定」 (RSVP) | ❌ | ✅ | 개인 데이터, 앱 다운로드 유도 |
| 運営に問い合わせる (F050 DM) | ❌ | ✅ | 푸시 알림 핵심, 앱 강제 |
| マイページ 전체 | ❌ | ✅ | 개인 영역, 앱 강제 |
| 이벤트 등록·수정·취소 (운영자) | ❌ | ✅ | 카메라·푸시·CSV 다운로드 |
| 갤러리 **업로드** (운영자) | ❌ | ✅ | 네이티브 카메라 활용 |
| 명단·일괄 알림 (F047) | ❌ | ✅ | 운영자 도구 |
| Admin 도구 | ❌ | ✅ | 운영 영역 |
| 회원가입·로그인 | 🟡 가능 | ✅ 권장 | 웹에서 가입 시 「アプリを開く」 유도 |

### 4-6. 「アプリで使う」 유도 패턴

웹에서 앱 전용 기능에 접근 시 다음 모달 표시:

```
사용자가 웹에서 「気になる」 버튼 탭
   ↓
모달:
「お気に入りはアプリで保存できます」
[アプリをダウンロード]  [このサイトで続ける]
```

- 「アプリをダウンロード」 → 스토어 (iOS/Android 자동 판별)
- 「このサイトで続ける」 → 모달만 닫고 행위는 무시 (행위 자체 불가)
- 강제 다운로드는 아니지만 명확한 채널 분리

---

## 5. MVP 기능 명세

### 5-1. 앱 전환 (모바일 UX)

| ID | 기능명 | 설명 | 단계 | 관련 페이지 |
|----|--------|------|------|------------|
| **F001** | 하단 4탭 내비게이션 | `ホーム` / `さがす` / `カレンダー` / `マイページ` 4탭. 아이콘 + 레이블. 인증 여부 무관 항상 표시 | MVP | 전체 앱 |
| **F002** | 이벤트 풀스크린 라우트 | 루트 `/events/[id]` 별도 라우트. 모달 아님 → 공유 URL 보존. `visibility=public` 이벤트는 미인증 열람 허용 | MVP | 이벤트 상세 페이지 |
| **F003** | Suspense + 스켈레톤 로딩 | 모든 Server Component 상위에 `<Suspense>` + `loading.tsx` 스켈레톤 배치. CLAUDE.md 권장 패턴과 정합 | MVP | 전체 앱 |
| **F004** | 스와이프 패널 전환 | framer-motion `AnimatePresence` 탭 전환 슬라이드 | Phase 2 | 전체 앱 |
| **F005** | PWA 매니페스트 | `manifest.webmanifest` + 아이콘 3종 + A2HS 안내 모달 1회 | Phase 2 | — |
| **F006** | Web Push 알림 | iOS 16.4+ Safari Web Push. **F005 의존 (PWA A2HS 필수)**, A2HS 비율 ≥ 30% 검증 후 진입 | Phase 3 | — |

### 5-2. 발견 (검색·카테고리·추천) — 변별 A축

| ID | 기능명 | 설명 | 단계 | 관련 페이지 |
|----|--------|------|------|------------|
| **F010** | 횡단 검색 | キーワード 검색 + 다단계 필터 (카테고리·태그·활동 빈도) | MVP | さがす 페이지 |
| **F011** | 카테고리 큐레이션 | 「文化系 / 体育会系 / 学術 / 国際 / 創作」 등 카테고리별 큐레이션 | MVP | さがす 페이지, ホーム 페이지 |
| **F012** | 신환 시즌 큐레이션 | 「今週新歓」 「人気の新歓イベント」 섹션 (4월·10월 시즌 한정 활성) | MVP | ホーム 페이지 |
| **F013** | 「あなたの興味」 추천 | 즐겨찾기·気になる 기반 유사 동아리 추천 (간단 룰 기반, ML 아님) | Phase 2 | ホーム 페이지 |
| **F014** | 검색 결과 정렬 | 활동 빈도 / 인기도 / 가나다순 / 최근 활동순 | MVP | さがす 페이지 |

### 5-3. 동아리 상세 (이해·갤러리·아카이브) — 변별 B축

| ID | 기능명 | 설명 | 단계 | 관련 페이지 |
|----|--------|------|------|------------|
| **F020** | 동아리 프로필 | 이름·카테고리·태그·소개·활동 빈도·연락처 | MVP | 동아리 상세 페이지 |
| **F021** | **활동 후기·갤러리** | 운영진이 등록한 활동 사진 + 짧은 설명. 학기·연도별 필터. **B축 핵심** | MVP | 동아리 상세 페이지 |
| ~~F022~~ | ~~過去のイベント 아카이브~~ | ❌ **v2.2 삭제** — 이벤트 영구 URL(F032)이 자연 누적되므로 별도 페이지 불필요 | — | — |
| ~~F023~~ | ~~よくある質問 (FAQ)~~ | ❌ **v2.2 삭제** — F050 운영진 DM에서 자주 묻는 질문이 자연 형성되며 운영진 부담 축소 | — | — |
| ~~F024~~ | ~~「先輩のコメント」~~ | ❌ **v2.2 삭제** — 졸업·시니어 부원 동원 실현성 낮음 | — | — |
| ~~F025~~ | ~~「公式LINEに参加」 메인 CTA~~ | ❌ **v2.2 폐기 → F050으로 통합** — 메인 CTA가 **「運営に問い合わせる」** 로 변경, LINE 직접 노출은 운영진이 DM 답신 시 안내 | — | — |
| **F026** | 외부 SNS 링크 (격하) | Instagram · X · 웹사이트 링크를 동아리 상세 풋터의 「外部リンク」 섹션에 작게 표시. **LINE 그룹 링크는 포함하지 않음** (운영진 DM 답신에서 안내) | MVP | 동아리 상세 페이지 |

### 5-4. 이벤트 · 캘린더 (시간 기반) — 변별 C축

| ID | 기능명 | 설명 | 단계 | 관련 페이지 |
|----|--------|------|------|------------|
| **F030** | 이벤트 생성 폼 | 운영자 전용. 제목·일시·장소·설명·카테고리·커버 이미지(16:9)·정원 표시·공개/비공개 | MVP | 이벤트 등록 페이지 |
| **F031** | 이벤트 수정·삭제 | 운영자 전용. `/circles/[id]/events/[eventId]/edit`. RLS: `owner_id = auth.uid() OR is_admin()` | MVP | 이벤트 수정 페이지 |
| **F032** | 이벤트 풀스크린 상세 | 루트 `/events/[id]`. 커버 16:9 / 일시(JST) / 장소 / 설명 / 「気になる」 / 「行く予定」 / カレンダーに追加 / 「このサークル·部活動を見る」 → 동아리 상세에서 「運営に問い合わせる」 (v2.2) | MVP | 이벤트 상세 페이지 |
| **F033** | **이중 모드 RSVP** | 운영자가 이벤트 등록 시 모드 선택. **가벼움**: `気になる / 行く予定` 2단계 (신환 체험회·新歓 등). **강함**: `行く / たぶん行く / 行かない` + 정원·웨이팅·승인 게이팅 (정기 활동·합숙·회식 등) | MVP | 이벤트 상세 페이지 |
| **F034** | 참가 카운트 (모드별) | 가벼움: `気になる N人 · 行く予定 N人` 참고 표시. 강함: `定員 N名 · 残り N名` + `キャンセル待ち N番目` 정확 표시 | MVP | 이벤트 상세 페이지 |
| **F035** | 캘린더 추가 버튼 | shadcn `Popover` → `Googleカレンダー / Appleカレンダー(.ics)` 분기. JST(UTC+9) 변환 필수 | MVP | 이벤트 상세 페이지 |
| **F036** | 월간 캘린더 그리드 | shadcn `Calendar` 기반. 카테고리 컬러 도트 최대 3개, 초과 시 `+n`. 날짜 클릭 시 하단 Sheet | MVP | カレンダー 페이지 |
| **F037** | 캘린더 탭 | 하단 4탭 3번째. 「月表示 / リスト」 토글. 비로그인 열람 가능 | MVP | カレンダー 페이지 |
| **F038** | 다가오는 이벤트 리스트 뷰 | 날짜 sticky 헤더, 카테고리 배지 | MVP | カレンダー 페이지, ホーム 페이지 |
| **F039** | **이벤트 Q&A 댓글** | 이벤트 상세 하단 「コメント・質問」 영역. 검토자 질문 → 운영진 답 → 모두에게 보임. 비동기 스레드 | MVP | 이벤트 상세 페이지 |
| **F040** | D-day 배지 | 「あと N日」 amber 배지. 시작일 기준 자동 계산 | MVP | 이벤트 카드, 상세 |
| **F041** | 동아리 상세 내 이벤트 섹션 | 동아리 상세에 해당 동아리 예정 이벤트 + 過去 이벤트 (F022 연계) | MVP | 동아리 상세 페이지 |
| **F042** | 관심 동아리 통합 캘린더 | `/calendar` 글로벌 — 気になる·즐겨찾기 동아리 이벤트 통합 | Phase 2 | カレンダー 페이지 |
| **F043** | 정기/비정기 이벤트 구분 | 정기 활동 vs 일회성 이벤트 탭 구분 | Phase 2 | 동아리 캘린더 |
| **F044** | 반복 이벤트 자동 생성 | iCal RRULE 기반 정기 이벤트 자동 생성 | Phase 3 | 이벤트 등록 |
| **F045** | **정원·웨이팅·마감 자동 관리** *(v2.1 신규)* | 강한 모드 한정 인프라. (1) `定員` 도달 시 신규 `going` 신청자 자동으로 `waiting` 큐 (`waiting_position` 자동 부여). (2) `going` 해제 시 대기 1번 자동 승격 + 본인 알림. (3) `rsvp_deadline` 이후 신규 신청 차단 + `申し込みは終了しました` 표시. **DB 트리거 `AFTER UPDATE OF status ON event_rsvps`** 로 동시성 안전 구현 | MVP | 이벤트 상세 + 운영자 도구 |
| **F046** | **운영진 승인 게이팅** *(v2.1 신규)* | 이벤트 옵션 `requires_approval=true` 시 강한 모드 `行く` 신청 → 즉시 `pending` 상태. 운영진이 명단에서 `approve / reject` (사유 입력 가능). 승인 시 정원 차감. UI 카피: `運営の確認後、参加が確定します` | MVP | 이벤트 상세 + 운영자 도구 |
| **F047** | **운영자 명단·CSV·일괄 알림** *(v2.1 신규)* | 운영자 도구: 신청자 명단 (이름·닉네임·신청일·상태 필터). **CSV 다운로드** (신청자 명단). **일괄 알림 발송** (신청자 전원에 K CLUB 알림: 예 「場所変更のお知らせ」) | MVP | 운영자 도구 |
| **F048** | **이벤트 변경 자동 알림** *(v2.1 신규)* | 운영자가 이벤트 일시·장소·설명 수정 시 `event_change_logs`에 자동 기록. 신청자(가벼움: 気になる/行く予定, 강함: going/maybe/pending/waiting) 전원에게 자동 알림 (앱 내 배지 + 이메일). 변경 이력 영구 보관 (운영자 신뢰도 지표) | MVP | 이벤트 수정 페이지 |
| **F049** | **이벤트 취소·재고지** *(v2.1 신규)* | 운영자 「이벤트 취소」 → 모든 신청자 즉시 통보 (앱 내 + 이메일) + 취소 사유 표시. `events.cancelled_at / cancellation_reason` 기록. 이벤트 상세 페이지 상단에 빨간 배너 `中止されました — 理由: ○○` | MVP | 이벤트 상세 + 운영자 도구 |

### 5-5. 운영진 DM (F068 통합 — 신규 변별 영역)

> **사용자 결정 반영:** 실시간 비대칭 모델 + 운영진 그룹 인박스 + 풀 안전망

| ID | 기능명 | 설명 | 단계 | 관련 페이지 |
|----|--------|------|------|------------|
| **F050** | **운영진 DM (메인 진입점, v2.2 격상)** | 검토자가 동아리 상세 메인 CTA **「運営に問い合わせる」** 탭. 폼: 카테고리 (회비·일정·분위기·체험회·**興味があります(가입 의사)**·기타) + 본문 + 첨부 (선택). **로그인 필요**. v2.1에서는 보조 진입이었으나 v2.2에서 F025를 흡수하여 **동아리 상세의 유일한 운영진 컨택 채널**이 됨. 운영진은 DM 답신에서 상황에 맞게 LINE 그룹·인스타·이메일 등 외부 채널을 안내 | MVP | 동아리 상세 → DM 모달 |
| **F051** | **온라인/오프라인 상태 표시** | 발신 직전 운영진 상태: 🟢 온라인 「현재 응답 가능」 / ⚫ 오프라인 「시간이 걸릴 수 있음」. 운영진이 인박스 페이지를 열고 있을 때 = 온라인 | MVP | DM 발신 폼, 인박스 |
| **F052** | **실시간 채팅 UI** (운영진 그룹 인박스) | 운영진 그룹 인박스에 도착, 누구나 답변 가능. 🟢 온라인 시 Supabase Realtime 즉시 송수신, ⚫ 오프라인 시 비동기 (이메일 + 앱 내 배지 알림) | MVP | DM 스레드 페이지 |
| **F053** | **양방향 신고** | 검토자·운영진 모두 메시지 신고 가능 → admin 검토 | MVP | DM 스레드 페이지 |
| **F054** | **차단** | 운영진이 반복 어그로 검토자 차단 (해당 동아리 DM 발신 불가) | MVP | 인박스 관리 |
| **F055** | **cooldown** | 같은 검토자가 1시간 내 N건 이상 발송 차단 | MVP | DM 발신 검증 |
| **F056** | 「他者尊重」 동의 | K CLUB 가입 시 1회 동의. 위반 누적 시 발신 권한 정지 | MVP | 회원가입 / 약관 |
| **F057** | 平均応答時間 통계 | 동아리별 평균 응답 시간 자동 집계·표시 (자율 압박, 강제 X) | MVP | 동아리 상세, DM 발신 폼 |
| **F058** | 운영진 라벨 표시 | DM 답변 시 운영진은 「○○サークル運営」 라벨 (개인 이름 노출 X) | MVP | DM 스레드 페이지 |
| **F059** | DM → FAQ 격상 | 운영진이 「자주 묻는 질문」 으로 표시한 DM 답변 → F023 FAQ에 자동 추가 | Phase 2 | DM 관리 도구 |

### 5-6. マイページ · 가입 결정 동선 — 변별 D축 (가벼움)

| ID | 기능명 | 설명 | 단계 | 관련 페이지 |
|----|--------|------|------|------------|
| **F060** | 즐겨찾기 (お気に入り) | 동아리 북마크 (기존 기능 유지·강화) | MVP | 마이페이지 |
| **F061** | **マイ「気になる」** | 「気になる」 누른 동아리·이벤트 통합 관리 | MVP | 마이페이지 |
| **F062** | 「行く予定」 이력 | 표시한 이벤트 시간순 리스트 + 다가오는 / 過去 분리 | MVP | 마이페이지 |
| **F063** | 인박스 (DM 이력) | 보낸 / 받은 DM 스레드 리스트 (F050 연계) | MVP | 마이페이지 |
| **F064** | 프로필 설정 | 닉네임·아바타·자기소개. **`show_profile` 기본값 OFF (비공개)** | MVP | 마이페이지 |

### 5-7. 인증·권한

| ID | 기능명 | 설명 | 단계 | 관련 페이지 |
|----|--------|------|------|------------|
| **F070** | 기본 인증 | 기존 `getClaims()` + `requireUser()` 패턴 재사용. `/events/*`도 proxy matcher 포함. **keio.jp 도메인 강제 X** (일반 이메일 가입) | MVP | 로그인·회원가입 |
| **F071** | `redirect_to` 보존 | DM 발신·気になる 등 인증 필요 행위 → 로그인 후 자동 복귀 (안티패턴 A-1 차단) | MVP | 로그인 페이지 |
| **F072** | **권한 최소 3단계** (MVP 진입) | `circle_members(role enum('owner','staff','member'))`. **MVP에서는 `owner` + `staff` 만 사용** (F052 운영진 그룹 인박스 위해). `member`는 Phase 2 | MVP | 동아리 관리 |
| **F073** | 동아리 owner 승급 모델 | 등록은 누구나 가능, **owner 권한 부여는 admin이 수동 승인** (사칭 동아리 등록 차단). admin 대시보드에 「新規 owner 신청」 큐 | MVP | admin 대시보드 |
| **F074** | RLS 정책 | `owner_id = auth.uid() OR is_admin()` 기본 패턴 재사용. F072 staff는 `EXISTS (circle_members WHERE role IN ('owner','staff'))` 추가 | MVP | DB 정책 |

### 5-8. 빈 상태 · 공통 UI

| ID | 기능명 | 설명 | 단계 | 관련 페이지 |
|----|--------|------|------|------------|
| **F080** | 빈 상태 처리 | 「まだイベントがありません」 「まだ갤러리がありません」 등 일본어 카피 + 운영진 안내 | MVP | 전체 |
| **F081** | 공개 캐싱 | `visibility='public'` 콘텐츠는 `unstable_cache` + `tags:["circles:public", "events:public"]` + anon 클라이언트 (`lib/supabase/anon.ts`) | MVP | 서버 컴포넌트 |
| **F082** | 컬럼 GRANT 명시 | 신규 컬럼 추가 시 반드시 `GRANT INSERT/UPDATE (col) ON tbl TO authenticated;` 명시 ([[circles-column-grant-trap]] 회피) | MVP | 마이그레이션 |

---

## 6. 메뉴 / IA (정보 아키텍처)

### 6-1. 하단 4탭 구조

```
하단 탭 (모든 사용자, 인증 여부 무관)
├── ホーム         — 신환 큐레이션 · 다가오는 이벤트 · 추천 동아리 (F011·F012·F038)
├── さがす         — 검색·카테고리 필터·정렬 (F010·F011·F014)
├── カレンダー     — 월간 그리드 + 리스트 토글 (F036·F037·F038)
└── マイページ     — お気に入り · 気になる · 行く予定 · 인박스 (F060-F064)
```

### 6-2. route group 분할

```
app/
├── (tabs)/                                — 하단 탭이 보이는 영역
│   ├── layout.tsx                        — 하단 탭 컴포넌트
│   ├── page.tsx                          — ホーム
│   ├── search/
│   ├── calendar/
│   └── mypage/
│
├── events/                                — 풀스크린 (하단 탭 X)
│   └── [id]/page.tsx                     — 이벤트 상세 (F002)
│
├── circles/                               — 풀스크린 (하단 탭 X)
│   ├── [id]/page.tsx                     — 동아리 상세
│   ├── [id]/dm/[inquiryId]/page.tsx      — DM 스레드 (F052)
│   ├── [id]/events/new/page.tsx          — 이벤트 등록 (운영자)
│   └── [id]/events/[eventId]/edit/page.tsx
│
├── auth/                                  — 풀스크린 (하단 탭 X)
│   └── ...
│
└── admin/                                 — 풀스크린 (하단 탭 X)
    └── ...
```

> **`/circles/[id]/template.tsx` 함정 회피 ([[circle-detail-template-fixed-trap]]):** 이벤트 상세는 `/circles/[id]/events/...` 하위가 아닌 **루트 `/events/[id]`** 로 분리한다.

### 6-3. 화면 트리

```
K CLUB 앱
├── ホーム (/)
│   ├── 今週新歓 큐레이션 (F012)
│   ├── 다가오는 이벤트 (F038)
│   └── 추천 동아리 (F011)
│
├── さがす (/search)
│   ├── キーワード 검색 (F010)
│   ├── カテゴリ·태그 필터
│   └── 동아리 카드 → 동아리 상세 (/circles/[id])
│       ├── 프로필 (F020)
│       ├── 갤러리 (F021)
│       ├── 이벤트 섹션 (F041)
│       ├── 外部リンク 풋터 (F026 — Instagram·X·웹사이트만, LINE 제외)
│       └── 【메인 CTA】 運営に問い合わせる (F050)
│              ↓ DM 스레드 — 운영진 답신 시 LINE·인스타·이메일 등 안내
│
├── カレンダー (/calendar)
│   ├── 月表示 토글 (F036)
│   ├── リスト 토글 (F038)
│   └── 날짜 클릭 → 이벤트 Sheet
│
├── マイページ (/mypage)
│   ├── お気に入り (F060)
│   ├── 気になる (F061)
│   ├── 行く予定 (F062)
│   ├── 인박스 (F063)
│   └── 프로필 설정 (F064)
│
├── イベント 상세 (/events/[id])  — 풀스크린
│   ├── 커버 16:9
│   ├── 일시·장소 (JST)
│   ├── 気になる / 行く予定 pill (F033)
│   ├── 참가 의향 카운트 (F034)
│   ├── D-day 배지 (F040)
│   ├── カレンダーに追加 (F035)
│   ├── このサークル·部活動を見る → /circles/[id]
│   └── コメント・質問 (F039)
│
└── 운영자·admin 영역
    ├── 이벤트 등록 (/circles/[id]/events/new) (F030)
    ├── 이벤트 수정 (F031)
    ├── 이벤트 관리 — 명단·승인·CSV·일괄 알림·취소 (F046·F047·F049)
    ├── DM 인박스 (F052) — **메인 운영 업무**
    ├── 갤러리 관리 (F021)
    └── admin: owner 승급 큐 (F073) · 신고 검토 (F053)
```

---

## 7. UI 카피 규칙 (일본어)

| UI 위치 | 카피 | 금지 표현 |
|---------|------|----------|
| 단체 명칭 | `サークル・部活動` | `サークル` 단독, `公認`, `公式認定` |
| 발견 탭 | `さがす` | `검색` |
| 캘린더 탭 | `カレンダー` | — |
| 약한 RSVP | **`気になる`** / **`行く予定`** | `RSVP`, `行く / たぶん行く / 行かない` |
| 참가 카운트 | `気になる N人 · 行く予定 N人` | `定員 N名 / 残り N名` (정원 강한 관리 안 함) |
| 캘린더 추가 | `カレンダーに追加` | — |
| 동아리 상세 메인 CTA (v2.2) | **`運営に問い合わせる`** | `公式LINEに参加` (v2.1까지 사용, 폐기), `LINE 卒業`, `LINEを卒業して...` |
| 갤러리 | `活動ギャラリー` | — |
| 가입 의사 카테고리 (F050 신규) | `興味があります` | — |
| 運営 DM (메인 진입점) | `運営に問い合わせる` (CTA) / DM 내부에서는 `メッセージ` | `채팅`, `토크` |
| 운영진 답신 시 외부 채널 안내 (v2.2) | `公式LINEのリンクをお送りします` / `Instagramでもご連絡いただけます` 등 자유 | — |
| 온라인 상태 | `運営が現在オンラインです` | — |
| 오프라인 상태 | `現在オフライン — 返信は時間がかかる場合があります` | `運営が反応しません` |
| 응답시간 | `平均的に○日以内に返信` | `必ず○日以内に返信` (강제 X) |
| 가입 결정 (v2.2 변경) | `気になったら 運営に問い合わせる` | `公式LINEに参加` (v2.1까지) |
| 운영진 라벨 | `○○サークル運営` | 개인 이름 노출 |
| 빈 상태 | `まだイベントがありません` `まだ갤러리がありません` | — |

---

## 8. 데이터 모델

### 8-1. 신규 테이블 (MVP)

#### `events` — 동아리 이벤트

| 필드 | 설명 | 타입/관계 |
|------|------|----------|
| id | 고유 식별자 | UUID PK |
| circle_id | 소속 동아리 | → circles.id (CASCADE) |
| created_by | 등록자 | → profiles.id (SET NULL) |
| title | 제목 | text NOT NULL |
| description | 설명 | text DEFAULT '' |
| starts_at | 시작 일시 (UTC) | timestamptz NOT NULL |
| ends_at | 종료 일시 | timestamptz |
| location | 장소 | text |
| cover_image_url | 커버 (16:9) | text |
| category | 카테고리 | text |
| visibility | 공개 범위 | text CHECK ('public','members') |
| is_all_day | 종일 이벤트 | boolean DEFAULT false |
| **rsvp_mode** *(v2.1)* | 운영자 선택 RSVP 강도 | text CHECK ('light','strict') DEFAULT 'light' |
| **capacity** *(v2.1)* | 정원 (strict 모드에서만 사용, NULL = 무제한) | integer |
| **rsvp_deadline** *(v2.1)* | 신청 마감일 (strict 모드) | timestamptz NULL |
| **requires_approval** *(v2.1)* | 운영진 승인 필요 (strict 모드) | boolean DEFAULT false |
| **cancelled_at** *(v2.1)* | 취소 시각 | timestamptz NULL |
| **cancellation_reason** *(v2.1)* | 취소 사유 | text NULL |
| created_at / updated_at | 생성·수정 | timestamptz DEFAULT now() |

#### `event_interests` — 気になる / 行く予定 (가벼운 모드)

| 필드 | 설명 | 타입/관계 |
|------|------|----------|
| event_id | 이벤트 | → events.id (CASCADE) |
| user_id | 사용자 | → profiles.id (CASCADE) |
| status | 상태 | text CHECK ('interested','going') |
| show_profile | 참가자 목록 공개 여부 | **boolean DEFAULT false** |
| created_at | 생성 | timestamptz DEFAULT now() |
| **PK** | 복합 기본키 | (event_id, user_id) |

> 가벼운 모드 (`events.rsvp_mode='light'`) 이벤트만 이 테이블 사용. 정원·웨이팅·승인 없음 (LINE 의존 안 함, 운영자 참고용).

#### `event_rsvps` — 강한 RSVP *(v2.1 신규)*

| 필드 | 설명 | 타입/관계 |
|------|------|----------|
| event_id | 이벤트 | → events.id (CASCADE) |
| user_id | 사용자 | → profiles.id (CASCADE) |
| status | 상태 | text CHECK ('going','maybe','declined','pending','waiting','cancelled') |
| show_profile | 참가자 목록 공개 여부 | **boolean DEFAULT false** |
| waiting_position | 대기 순번 (waiting 시에만, F045 트리거가 자동 부여) | integer NULL |
| approved_at | 승인 시각 (requires_approval + pending → going 시) | timestamptz NULL |
| approved_by | 승인한 운영진 | → profiles.id NULL |
| rejected_at | 거절 시각 | timestamptz NULL |
| rejection_reason | 거절 사유 | text NULL |
| cancelled_at | 취소 시각 | timestamptz NULL |
| created_at / updated_at | 생성·수정 | timestamptz DEFAULT now() |
| **PK** | 복합 기본키 | (event_id, user_id) |

> 강한 모드 (`events.rsvp_mode='strict'`) 이벤트만 이 테이블 사용. v1.0 스키마와 유사하지만 v2.1에서는 운영자 선택 시에만 활성화. 정원 차감 status: `going`, `pending` (참고용은 미차감: `maybe`, `declined`, `waiting`, `cancelled`).

#### `event_change_logs` — 이벤트 변경 이력 *(v2.1 신규)*

| 필드 | 설명 | 타입/관계 |
|------|------|----------|
| id | 고유 식별자 | UUID PK |
| event_id | 이벤트 | → events.id (CASCADE) |
| changed_by | 변경자 (운영진) | → profiles.id |
| field_name | 변경 필드 | text (예: 'starts_at', 'location') |
| old_value | 이전 값 | text |
| new_value | 이후 값 | text |
| notified_at | 알림 발송 시각 (자동 처리됨) | timestamptz NULL |
| created_at | 변경 시각 | timestamptz DEFAULT now() |

> F048 변경 자동 알림 + 영구 보관용. `notified_at IS NULL` 인 row를 cron 또는 Server Action 으로 처리해 신청자 전원에 알림.

#### `circle_galleries` — 활동 갤러리 (F021)

| 필드 | 설명 | 타입/관계 |
|------|------|----------|
| id | 고유 식별자 | UUID PK |
| circle_id | 소속 동아리 | → circles.id |
| uploaded_by | 업로더 (운영진) | → profiles.id |
| image_url | 이미지 URL | text |
| caption | 짧은 설명 | text |
| taken_at | 촬영 일시 (정렬용) | timestamptz |
| created_at | 등록 | timestamptz DEFAULT now() |

#### ~~`circle_faqs`~~ — ❌ v2.2 삭제 (F023 폐기와 함께)

> v2.1까지 존재하던 FAQ 테이블은 v2.2에서 제거. F050 운영진 DM에서 자주 묻는 답변이 자연 형성되므로 별도 게시판 불필요.

#### `circle_members` — 권한 3단계 (F072, MVP 진입)

| 필드 | 설명 | 타입/관계 |
|------|------|----------|
| circle_id | 동아리 | → circles.id (CASCADE) |
| user_id | 사용자 | → profiles.id (CASCADE) |
| role | 역할 | text CHECK ('owner','staff','member') |
| approved_by_admin | admin 승인 여부 (owner 한정) | boolean DEFAULT false |
| created_at | 시각 | timestamptz |
| **PK** | 복합 | (circle_id, user_id) |

> **MVP 사용 범위:** `owner` + `staff` 만 사용. `member` 는 Phase 2 (가입 後 활동 = LINE 영역이므로 MVP엔 불필요).

#### `inquiries` — DM 스레드 (F050)

| 필드 | 설명 | 타입/관계 |
|------|------|----------|
| id | 고유 식별자 | UUID PK |
| circle_id | 동아리 | → circles.id |
| sender_user_id | 발신 검토자 | → profiles.id |
| category | 카테고리 (v2.2 `interest` 추가) | text CHECK ('fee','schedule','vibe','trial','interest','other') |
| subject | 제목 (선택) | text |
| status | 스레드 상태 | text CHECK ('open','resolved','blocked') |
| last_message_at | 마지막 메시지 시각 (정렬용) | timestamptz |
| created_at | 시작 | timestamptz |

#### `inquiry_messages` — DM 메시지 (F052)

| 필드 | 설명 | 타입/관계 |
|------|------|----------|
| id | 고유 식별자 | UUID PK |
| inquiry_id | 스레드 | → inquiries.id (CASCADE) |
| sender_user_id | 발신자 | → profiles.id |
| sender_role | 발신자 역할 | text CHECK ('inquirer','circle_staff') |
| body | 본문 | text |
| attachments | 첨부 URL 배열 | text[] |
| is_read_by_recipient | 읽음 여부 | boolean DEFAULT false |
| created_at | 시각 | timestamptz |

#### `inquiry_reports` — DM 신고 (F053)

| 필드 | 설명 | 타입/관계 |
|------|------|----------|
| id | 고유 식별자 | UUID PK |
| inquiry_id | 스레드 | → inquiries.id |
| message_id | 신고 대상 메시지 | → inquiry_messages.id |
| reporter_user_id | 신고자 | → profiles.id |
| reason | 사유 (자유 텍스트) | text |
| admin_resolved_at | admin 조치 시각 | timestamptz (NULL 가능) |
| created_at | 시각 | timestamptz |

#### `user_blocks` — 차단 (F054)

| 필드 | 설명 | 타입/관계 |
|------|------|----------|
| blocker_user_id | 차단한 사용자 (운영진) | → profiles.id |
| blocked_user_id | 차단된 사용자 (어그로) | → profiles.id |
| circle_id | 동아리 (해당 동아리 한정 차단) | → circles.id |
| created_at | 시각 | timestamptz |
| **PK** | 복합 | (blocker_user_id, blocked_user_id, circle_id) |

#### `event_comments` — 이벤트 Q&A 댓글 (F039)

| 필드 | 설명 | 타입/관계 |
|------|------|----------|
| id | 고유 식별자 | UUID PK |
| event_id | 이벤트 | → events.id (CASCADE) |
| user_id | 작성자 | → profiles.id |
| parent_id | 답글 시 부모 (자기참조) | → event_comments.id (NULL 가능) |
| body | 본문 | text |
| created_at | 시각 | timestamptz |

#### `presence` — 운영진 온라인 상태 (F051)

| 필드 | 설명 | 타입/관계 |
|------|------|----------|
| user_id | 사용자 | → profiles.id PK |
| circle_id | 어느 동아리 인박스를 보는지 | → circles.id (NULL = 오프라인) |
| last_seen_at | 마지막 활동 | timestamptz |

> **구현:** 운영진이 인박스 페이지 마운트 시 → `presence` upsert (`circle_id` 채움), 언마운트 시 → `circle_id = NULL`. 5분 이상 `last_seen_at` 미갱신 = 오프라인 처리.

### 8-2. 인덱스

- `events (circle_id, starts_at DESC)` — 동아리 이벤트 목록
- `events (starts_at) WHERE starts_at > now() AND cancelled_at IS NULL` — 다가오는 이벤트
- `event_interests (event_id, status)` — 가벼운 모드 카운트
- `event_interests (user_id, created_at DESC)` — 마이페이지
- `event_rsvps (event_id, status)` — 강한 모드 정원/웨이팅 카운트
- `event_rsvps (event_id, status, waiting_position) WHERE status='waiting'` — 웨이팅 큐 정렬
- `event_rsvps (user_id, created_at DESC)` — 마이페이지 (강한 모드)
- `event_change_logs (event_id, created_at DESC)` — 변경 이력
- `event_change_logs (notified_at) WHERE notified_at IS NULL` — 미발송 알림 큐
- `inquiries (circle_id, last_message_at DESC)` — 운영진 인박스
- `inquiries (sender_user_id, last_message_at DESC)` — 검토자 인박스
- `inquiry_messages (inquiry_id, created_at)` — 스레드 메시지 정렬
- `circle_galleries (circle_id, taken_at DESC)` — 갤러리 표시
- `circle_members (circle_id, role)` — 그룹 인박스 권한 체크

### 8-3. RLS 정책 방향

```sql
-- events SELECT: public은 anon 포함
CREATE POLICY events_select ON public.events FOR SELECT
  USING (visibility = 'public' OR auth.uid() IS NOT NULL);

-- events INSERT/UPDATE/DELETE: owner + staff
CREATE POLICY events_write ON public.events FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.circle_members cm
    WHERE cm.circle_id = events.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner','staff')
  ) OR public.is_admin());

-- event_interests: 본인 row만 모든 권한 (가벼운 모드)
CREATE POLICY event_interests_self ON public.event_interests FOR ALL
  USING (user_id = auth.uid());

-- event_rsvps SELECT: 본인 row + 동아리 owner/staff (강한 모드)
CREATE POLICY event_rsvps_select ON public.event_rsvps FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.circle_members cm ON cm.circle_id = e.circle_id
      WHERE e.id = event_rsvps.event_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner','staff')
    )
    OR public.is_admin()
  );

-- event_rsvps INSERT/UPDATE/DELETE: 본인 row만 (단, status='going' 진입은 F045 트리거가 검증)
-- 운영진 승인 (status='pending' → 'going') 은 owner/staff만 UPDATE 가능
CREATE POLICY event_rsvps_self_modify ON public.event_rsvps FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY event_rsvps_staff_approve ON public.event_rsvps FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.circle_members cm ON cm.circle_id = e.circle_id
    WHERE e.id = event_rsvps.event_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner','staff')
  ));

-- F045 자동 승격 트리거 (정원/웨이팅/마감 처리 — 동시성 안전)
CREATE OR REPLACE FUNCTION public.fn_event_rsvp_promote()
  RETURNS TRIGGER AS $$
  BEGIN
    -- going 해제 시 waiting 1번 자동 승격
    -- pending → going 시 정원 차감 + 추가 신청자는 waiting으로
    -- 상세 로직은 마이그레이션에서 구현
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_event_rsvp_promote
  AFTER UPDATE OF status ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.fn_event_rsvp_promote();

-- event_change_logs SELECT: 공개 이벤트는 anon 포함, members는 인증
CREATE POLICY event_change_logs_select ON public.event_change_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_change_logs.event_id
      AND (e.visibility = 'public' OR auth.uid() IS NOT NULL)
  ));

-- event_change_logs INSERT: 운영진만 (이벤트 수정 시 Server Action에서 작성)
CREATE POLICY event_change_logs_insert ON public.event_change_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.circle_members cm ON cm.circle_id = e.circle_id
    WHERE e.id = event_change_logs.event_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner','staff')
  ));

-- inquiries SELECT: 본인 발신 또는 동아리 owner/staff
CREATE POLICY inquiries_select ON public.inquiries FOR SELECT
  USING (
    sender_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.circle_members cm
      WHERE cm.circle_id = inquiries.circle_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner','staff')
    )
  );

-- inquiry_messages INSERT: 발신자가 inquirer 또는 circle_staff 여부에 따라
-- inquiry_messages UPDATE (is_read): 수신측만

-- circle_galleries: SELECT public, INSERT/UPDATE/DELETE owner+staff (v2.2: circle_faqs 정책 제거)
-- circle_members INSERT: owner는 admin이 승인, staff는 owner가 추가
-- user_blocks: 본인이 만든 차단만 본인이 관리

-- presence: 본인 row만 own. SELECT는 owner/staff 동아리 멤버에게 공개 (온라인 상태)
```

### 8-4. 컬럼 GRANT 주의 (재강조)

```sql
-- 모든 신규 컬럼·테이블 추가 시 다음을 잊지 말 것
GRANT SELECT ON public.events TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;
-- v2.1 신규 컬럼 명시 부여
GRANT UPDATE (rsvp_mode, capacity, rsvp_deadline, requires_approval, cancelled_at, cancellation_reason)
  ON public.events TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_interests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_rsvps TO authenticated;
GRANT SELECT, INSERT ON public.event_change_logs TO authenticated, anon;

GRANT SELECT ON public.inquiries TO authenticated;
GRANT INSERT ON public.inquiries TO authenticated;
-- ... 모든 신규 테이블·컬럼에 동일
```

GRANT 누락 시 RLS 통과해도 **42501 권한 오류** 발생 ([[circles-column-grant-trap]]).

---

## 9. 기술 스택 영향

### 9-1. 기존 스택 (변경 없음)

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 15 App Router |
| UI | React 19 |
| 컴포넌트 | shadcn/ui (new-york, neutral) |
| 스타일 | TailwindCSS v4 |
| 인증/DB | Supabase SSR + PostgreSQL |
| 배포 | Vercel |

### 9-2. MVP 신규 의존성

| 패키지 | 용도 |
|--------|------|
| `react-day-picker` | shadcn `Calendar` 내장 (F036) |
| `date-fns-tz` | JST 변환 (F035 ICS, F032 일시 표시) |
| `@supabase/realtime-js` | 이미 SSR에 포함, F052 DM 실시간 수신 |

> ICS 파일은 **수동 생성** (라이브러리 의존 불필요). 약 30줄 헬퍼면 충분.

### 9-3. Phase 2 신규 의존성

| 패키지 | 용도 |
|--------|------|
| `framer-motion` (이미 설치) | F004 스와이프 패널 전환 |
| Service Worker (Next 15 native) | F005 PWA 정적 자산 캐시 |

### 9-4. Supabase Realtime 사용 (F052)

> **validator Critical #1 대응:** v1.0의 단체 채팅(동아리 ~100개 × 30명)이 아닌 **DM 단위 (1 검토자 ↔ 1 동아리 운영진)** 이므로 동시 구독 수가 작다. Postgres Changes 또는 Broadcast 모두 안전.

**권장 구현:**

```typescript
// 클라이언트: inquiry_id 단위로 채널 구독
const channel = supabase
  .channel(`inquiry:${inquiryId}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'inquiry_messages',
      filter: `inquiry_id=eq.${inquiryId}` },
    (payload) => addMessage(payload.new)
  )
  .subscribe();
```

부하 우려 발생 시 (베타에서 운영진 동시 50+ 구독) **Broadcast로 마이그레이션**.

### 9-5. 캐싱 전략 (cacheComponents OFF 유지)

`next.config.ts`의 `cacheComponents`는 **계속 OFF** ([[cachecomponents-disabled-on-purpose]]). 공개 콘텐츠만 쿼리 단위 캐싱:

```typescript
// lib/supabase/queries/events.ts
export const getPublicUpcomingEvents = unstable_cache(
  async () => { /* anon client query */ },
  ['events:public:upcoming'],
  { tags: ['events:public'] }
);
```

DM (F050-F058), 마이페이지(F060-F064)는 **캐시 없음** (개인 데이터).

### 9-6. 라우팅 변경 요약

| 라우트 | 추가 시점 | 채널 | 비고 |
|--------|-----------|------|------|
| `app/(tabs)/layout.tsx` | MVP | 🌐 + 📱 | 하단 4탭 route group |
| `app/(tabs)/page.tsx` | MVP | 🌐 + 📱 | ホーム |
| `app/(tabs)/search/page.tsx` | MVP | さがす |
| `app/(tabs)/calendar/page.tsx` | MVP | カレンダー |
| `app/(tabs)/mypage/page.tsx` | MVP | マイページ |
| `app/events/[id]/page.tsx` | MVP | 이벤트 풀스크린 |
| `app/circles/[id]/page.tsx` | MVP | 동아리 상세 |
| `app/circles/[id]/dm/page.tsx` | MVP | 운영진 DM 진입 |
| `app/circles/[id]/dm/[inquiryId]/page.tsx` | MVP | DM 스레드 |
| `app/circles/[id]/events/new/page.tsx` | MVP | 이벤트 등록 |
| `app/circles/[id]/events/[eventId]/edit/page.tsx` | MVP | 이벤트 수정 |
| `app/admin/owner-approvals/page.tsx` | MVP | F073 owner 승급 큐 |
| `app/admin/inquiry-reports/page.tsx` | MVP | F053 신고 검토 |

`proxy.ts` matcher 추가: `/events/*`, `/circles/[id]/dm/*`, `/admin/*`.

### 9-7. Capacitor 네이티브 전환 *(v2.3 신규, Phase 1.5)*

K CLUB은 Phase 1 (웹 출시) 직후 **Capacitor 기반 네이티브 앱**으로 전환한다. iOS·Android 양쪽 스토어에 등록하며, 코드베이스는 Next.js 웹과 공유한다 (hosted URL 모드).

#### 9-7-1. Capacitor 도입 의존성

| 패키지 | 용도 |
|--------|------|
| `@capacitor/core` `@capacitor/cli` | 코어 + CLI |
| `@capacitor/ios` `@capacitor/android` | 플랫폼 |
| `@capacitor/camera` | 갤러리 사진 업로드 (운영진) |
| `@capacitor/push-notifications` | FCM(Android) + APNs(iOS) 푸시 |
| `@capacitor/app` | 딥링크 (`kclub://events/123`) |
| `@capacitor/splash-screen` | 스플래시 화면 |
| `@capacitor/status-bar` | 다크 모드 대응 |
| `@capacitor/assets` (dev) | 아이콘·스플래시 자동 생성 |

#### 9-7-2. 구성

```typescript
// capacitor.config.ts
{
  appId: 'jp.keio.kclub',
  appName: 'K CLUB',
  webDir: '.next/static-export',  // 또는 hosted URL
  server: {
    url: 'https://kclub.app',
    cleartext: false,
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'always'
  },
  plugins: {
    PushNotifications: { presentationOptions: ['badge','sound','alert'] },
    SplashScreen: { launchShowDuration: 1500, backgroundColor: '#ffffff' }
  }
}
```

> **hosted URL 모드 채택 이유:** Vercel 웹 빌드를 그대로 WebView에 로드 → 웹 변경 시 앱 재빌드 불필요. 네이티브 기능 변경 시에만 앱 빌드·재심사.

#### 9-7-3. 푸시 알림 통합

```typescript
// app/lib/native/push.ts
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export async function initPush(userId: string) {
  if (!Capacitor.isNativePlatform()) return; // 웹에서는 skip
  
  await PushNotifications.requestPermissions();
  await PushNotifications.register();
  
  PushNotifications.addListener('registration', async (token) => {
    // Supabase profiles.push_token 에 저장
    await supabase.from('profiles').update({ push_token: token.value, push_platform: Capacitor.getPlatform() }).eq('id', userId);
  });
  
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    // 딥링크 처리 — DM·이벤트로 이동
    const targetUrl = action.notification.data?.url;
    if (targetUrl) router.push(targetUrl);
  });
}
```

#### 9-7-4. 웹 → 앱 유도 모달 (`<AppOnlyGate>`)

```tsx
// components/app-only-gate.tsx
export function AppOnlyGate({ children, action }: { children: ReactNode; action: string }) {
  const isNative = Capacitor.isNativePlatform();
  if (isNative) return <>{children}</>; // 앱이면 그대로 사용
  
  return (
    <button onClick={() => showAppDownloadModal(action)}>
      {/* 웹에서 클릭 시 「アプリで使う」 모달 */}
      <span className="text-muted-foreground">📱 {action}</span>
    </button>
  );
}
```

웹에서 「気になる」 「行く予定」 「運営に問い合わせる」 등 앱 전용 행위 클릭 시 자동으로 다운로드 유도.

#### 9-7-5. Apple 4.2 가이드라인 통과 전략

Apple의 「단순 웹뷰만 있는 앱은 거절」 가이드라인을 통과하기 위해 다음 네이티브 기능을 명시적으로 통합:

- ✅ **푸시 알림** (`@capacitor/push-notifications`)
- ✅ **네이티브 카메라** (`@capacitor/camera`)
- ✅ **딥링크 + 앱 스킴** (`kclub://`)
- ✅ **스플래시 화면 + 아이콘**
- ✅ **상태바 컨트롤**
- ✅ **오프라인 진입 시 친화적 에러 화면** (네이티브 처리)

#### 9-7-6. 스토어 등록 메타데이터

| 항목 | 값 |
|------|----|
| App Name | K CLUB |
| Bundle ID (iOS) / App ID (Android) | `jp.keio.kclub` |
| Category (iOS) | Education / Social Networking |
| Category (Android) | Education |
| 지원 언어 | 일본어 (메인), 한국어 (보조) |
| 최소 OS | iOS 14.0+ / Android 7.0+ (API 24+) |
| 스크린샷 | iPhone 6.7"·6.5"·5.5" + iPad 12.9" + Android 폰·태블릿 |

#### 9-7-7. 새 DB 컬럼

`profiles` 테이블에 푸시 토큰 저장용 컬럼 추가:

| 필드 | 타입 | 의미 |
|------|------|------|
| push_token | text NULL | FCM/APNs 토큰 |
| push_platform | text CHECK ('ios','android') NULL | 플랫폼 |
| push_updated_at | timestamptz NULL | 토큰 갱신 시각 |

---

## 10. Phase 2 / 3 로드맵

### Phase 2 (MVP 출시 후 1-3개월): 검토 깊이 강화

| 기능 | ID | 내용 |
|------|----|------|
| 「あなたの興味」 추천 | F013 | 즐겨찾기·気になる 기반 룰 추천 |
| ~~「先輩のコメント」~~ | ~~F024~~ | ❌ v2.2 삭제 (실현성 낮음) |
| 관심 동아리 통합 캘린더 | F042 | `/calendar` 글로벌 뷰 |
| 정기/비정기 이벤트 구분 | F043 | 정기 활동 + 일회성 분리 |
| ~~DM → FAQ 자동 격상~~ | ~~F059~~ | ❌ v2.2 폐기 (FAQ 게시판 자체 없음). 대신 DM 답변 검색·필터 기능으로 대체 검토 |
| 권한 3단계 `member` 활성 | F072 | 가입 후 사용자 일부 K CLUB 활용 (선택) |
| **출결 관리 (A3)** | — | 이벤트 당일 운영자가 명단에서 `attended / no_show / late` 체크 |
| **멤버 전용 이벤트 (B6)** | — | `visibility='members'` + `circle_members.role` 검증, F072 활성 시 |
| 스와이프 패널 전환 | F004 | framer-motion |
| PWA 매니페스트 | F005 | A2HS 안내 1회 |

### Phase 3 (3개월~): 시즌·자동화

| 기능 | ID | 내용 |
|------|----|------|
| iOS Web Push | F006 | F005 의존, A2HS 비율 ≥ 30% 검증 후 진입 |
| 반복 이벤트 | F044 | iCal RRULE 자동 생성 |
| **노쇼 페널티 (B5)** | — | 누적 노쇼 3회 → 해당 동아리 신청 제한 / admin 검토 |
| 신환 시즌 자동 큐레이션 | — | 4월·10월 자동 활성, 시즌 외 비활성 |
| 운영진용 통계 대시보드 | — | DM 응답률 · 갤러리 조회 · 検토 → 가입 전환율 |

---

## 11. 성공 지표 (KPI)

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| **가입 결정 전환율** (핵심, v2.3 다단계 깔때기) | 웹 발견 → 앱 다운로드 → DM 발신 의 단계별 추적. (1) 동아리 상세 진입 → 「気になる」/DM 시도 ≥ 30% (2) 앱 다운로드 전환 ≥ 30% (3) 앱 내 DM 발신 ≥ 60%. **종합 가입 결정 전환율 ≥ 5-6%** | 각 단계별 이벤트 로깅 |
| **웹→앱 다운로드 전환율** *(v2.3 신규)* | 「アプリで使う」 모달 표시 → 스토어 진입 ≥ 30%. 스토어 진입 → 실제 설치 ≥ 50% (스토어 측정 한계로 추정) | UTM 파라미터 + 스토어 콘솔 |
| **앱 DAU / 웹 DAU 비율** *(v2.3 신규)* | 신환 시즌: 앱 DAU가 웹 DAU의 ≥ 40% (가벼운 사용자가 웹에 머무는 것은 정상) | Supabase Auth + 페이지뷰 |
| **DM 카테고리 「interest」 비율** (v2.2 신규) | 전체 DM의 30% 이상이 가입 의사 카테고리 | `inquiries.category='interest'` 카운트 |
| **검색 사용 횟수 / DAU** | DAU당 평균 2회 이상 | `さがす` 쿼리 카운트 |
| **갤러리 조회 수 / 동아리 상세 진입** | 60% 이상 | 갤러리 섹션 노출 시간 |
| **이벤트 발견율** | 캘린더·리스트 통한 이벤트 상세 진입 / 인스타 외 이벤트 발견 ≥ 40% | 진입 경로 로깅 |
| **새 신환 시즌 トラフィック** | 4월 첫 2주 누적 활성 사용자 800명 이상 | Supabase Auth |
| **気になる·行く予定 표시 수** | 月 1,500건 이상 | `event_interests` 카운트 |
| **DM 발신 수** | 月 200건 이상 | `inquiries` 카운트 |
| **DM 응답률 (자율 측정)** | 72시간 내 응답 ≥ 60% | `inquiry_messages` 분석 |
| **신고 발생율** | DM의 0.5% 미만 | `inquiry_reports` / `inquiries` |
| **재방문율** | 가입 검토자 7일 내 재방문 ≥ 40% | Vercel Analytics |

> **의도된 제외 지표:** 「채팅 활성도」 「가입 後 일일 사용 시간」 등은 K CLUB의 영역 아님 (시간차 비전).

---

## 12. 리스크 & 제약

### 12-1. 안티패턴 (절대 금지)

| 코드 | 패턴 | 대응 |
|------|------|------|
| A-1 | 로그인 중첩 (인증 필요 행위 → 로그인 → 복귀 안 됨) | `redirect_to` 파라미터로 자동 복귀 (F071) |
| A-2 | LINE 강제 대체 메시지 | 비전 4-3 명문 + UI 카피 검수 |
| A-3 | 실명 전면 공개 | `show_profile` DEFAULT false (F064), 운영진은 「○○サークル運営」 라벨 (F058) |
| A-4 | 별점·평점 시스템 | 도입 금지. 활동 빈도 텍스트 표시로 대체 |
| A-5 | DM 실시간 강제 | F051 온라인/오프라인 표시로 검토자 기대 자율 조정 |

### 12-2. 일본 대학생 정서 제약

| 특성 | UX 대응 |
|------|---------|
| 보수적 참여 결정 | F033 **이중 모드 RSVP** — 가벼움(`気になる / 行く予定`) 모드는 신환·체험회용. 강함(`行く / たぶん行く / 行かない`) 모드는 정기 활동·합숙용. 운영자가 선택 |
| LINE 의존 | 시간차 모델 — 가입 後 자연스럽게 LINE 합류 (F025) |
| 익명 선호 | `show_profile` DEFAULT false |
| 既読 민감 | DM 既読 표시 안 함 (단순 「未読 N件」 배지만) |
| 스케줄 꼼꼼 | `カレンダーに追加` MVP 1순위 (F035) |
| 新歓 시즌 집중 | 4월·10월 시즌 큐레이션 (F012) |
| 운영진 부담 회피 | DM 답변 의무 표시 X, 평균 응답 시간 자율 표시 (F057) |

### 12-3. 기술 리스크

| 리스크 | 내용 | 완화 |
|--------|------|------|
| Realtime 비용 | DM 단위 구독 = v1.0 단체 채팅보다 작음. 그래도 Pro 플랜 한도 모니터링 | 베타 단계 동시 구독 50+ 시 Broadcast 마이그레이션 검토 |
| `template.tsx` 함정 | `/circles/[id]/template.tsx` 가 자식 풀스크린을 깨뜨림 | 이벤트 상세는 루트 `/events/[id]`로 분리 ([[circle-detail-template-fixed-trap]]) |
| 컬럼 GRANT 누락 | RLS 통과해도 42501 오류 | 모든 마이그레이션에 GRANT 명시 ([[circles-column-grant-trap]]) |
| DM 어그로 | 검증 없는 환경에서 운영진에 악성 메시지 | F053 신고 + F054 차단 + F055 cooldown + F056 동의 |
| F072 권한 3단계 RLS 복잡도 | `circle_members` 도입으로 정책 수↑ | 헬퍼 함수 `is_circle_staff(circle_id)` 1개로 통일 |
| F068 사칭 동아리 | 누구나 동아리 등록 + DM 발송 가능 | F073 owner 승급 admin 수동 승인 |
| F051 온라인 상태 정확성 | 운영진이 페이지 닫지 않고 자리 비움 → 「온라인인데 응답 없음」 | 5분 미갱신 = 오프라인 (8-1 `presence.last_seen_at`) |
| 신환 시즌 DM 폭주 | 한 동아리에 일 30건+ 문의 → 응답 불가 | F011 카테고리·F012 큐레이션으로 사전 분산 (v2.2 F067 FAQ 폐기에 따라 표현 정리) |
| **F045 자동 승격 트리거 동시성** *(v2.1)* | 정원 마지막 자리에 2명 동시 신청 → 둘 다 going? | DB 트리거 + row-level lock 또는 `SERIALIZABLE` 트랜잭션. 마이그레이션에서 정확히 구현 |
| **F046 승인 게이팅 의무 발생** *(v2.1)* | `requires_approval=true` 시 운영진 응답 의무가 생김 → 미응답 시 정체 | UI에 「○日以内に承認推奨」 표시 (강제 X). 운영진 인박스에 pending 큐 노출 |
| **이중 모드 혼란** *(v2.1)* | 같은 동아리가 가벼움·강함 이벤트 혼재 → 사용자 학습 곡선↑ | 이벤트 카드·상세에 모드 배지 명시 (`気軽に参加` / `定員制` 등) |
| **앱 다운로드 마찰** *(v2.3)* | 신환 시즌 가벼운 검토자가 앱 다운로드에서 이탈 | 웹 단계 (탐색·발견) 매끄럽게 + 앱 유도 카피 「アプリで保存」 부드럽게. dark pattern 절대 금지 |
| **웹·앱 채널 혼란** *(v2.3)* | 「웹에서 본 동아리가 앱에서 다르게 보이나?」 사용자 인지 부조화 | UI 디자인 100% 일치 + 「気になる」 같은 앱 전용 기능 진입 시 명확한 안내 모달 |
| **Apple 4.2 심사 거절** *(v2.3)* | 「단순 웹뷰 앱」 으로 분류되어 거절 | 9-7-5 통과 전략 (푸시·카메라·딥링크·스플래시 명시적 통합) |
| **Capacitor hosted URL 오프라인 처리** *(v2.3)* | 비행기 모드 등 네트워크 끊김 시 흰 화면 | 네이티브 오프라인 에러 화면 + 캐시된 일부 자산 표시 |
| **iOS 푸시 인증서 갱신 누락** *(v2.3)* | APNs 인증서가 1년 후 만료 → 푸시 작동 중단 | 알림 일정 등록, Apple Developer 갱신 시 함께 |
| **앱 빌드 버전 관리** *(v2.3)* | Native 변경 시마다 양 스토어 재제출, 사용자 강제 업데이트 어려움 | hosted URL 모드로 웹 변경은 즉시 반영, 앱 빌드는 네이티브 변경 시에만 |

### 12-4. 비즈니스 / 운영 리스크

| 리스크 | 내용 | 완화 |
|--------|------|------|
| 가입 後 사용자 이탈 = 의도됨이지만 사용자 풀 작음 | 매 학기 신입생 코호트가 새로 옴 → 매년 마케팅 반복 | 신환 시즌 자동 큐레이션 + 운영진 인센티브 (신입생 유입) |
| 운영진이 K CLUB 안 씀 | LINE에 익숙, K CLUB 가는 동기 약함 | 신환 시즌 신입생 유입 = 운영진 사용 인센티브의 핵심 |
| 신환 시즌(4월) 못 맞춤 | **v2.3 17-25주** 일정 = 시즌 양보 결정 (Capacitor +4-6주) | 사용자 양보 의사 확인됨 (PRD v1.0 4-4) |

---

## 13. 개발 착수 체크리스트 (v2.1 시간차 비전 + 이벤트 빡센 관리 패키지 🅐 기준)

### 13-1. 기반 인프라 (Week 1-3)

1. `app/(tabs)/layout.tsx` route group + 하단 4탭 컴포넌트
2. `proxy.ts` matcher 갱신 (`/events/*`, `/circles/[id]/dm/*`, `/admin/*`)
3. `supabase/migrations/` 마이그레이션 작성:
   - `events` (v2.1 컬럼 포함: `rsvp_mode`·`capacity`·`rsvp_deadline`·`requires_approval`·`cancelled_at`·`cancellation_reason`) + RLS + GRANT
   - `event_interests` (가벼움) + RLS + GRANT
   - `event_rsvps` (강함, v2.1 신규) + RLS + GRANT
   - `event_change_logs` (v2.1 신규) + RLS + GRANT
   - `circle_galleries` + RLS + GRANT (v2.2: `circle_faqs` 제거됨)
   - `circle_members` (owner + staff만 사용) + RLS + GRANT
   - `inquiries` / `inquiry_messages` / `inquiry_reports` / `user_blocks` + RLS + GRANT
   - `event_comments` + RLS + GRANT
   - `presence` + RLS + GRANT
4. 헬퍼 함수: `is_circle_staff(circle_id)`, `is_admin()` (기존 활용)

### 13-2. 발견 · 동아리 상세 (Week 3-6)

5. `app/(tabs)/search/page.tsx` 강화 (F010·F014)
6. `app/(tabs)/page.tsx` ホーム — 신환 큐레이션·다가오는 이벤트·추천 (F011·F012·F038)
7. `app/circles/[id]/page.tsx` 동아리 상세 강화 (v2.2 단순화):
   - 갤러리 섹션 (F021)
   - 이벤트 섹션 (F041)
   - 外部リンク 풋터 (F026 — Instagram·X·웹사이트만)
   - **메인 CTA 「運営に問い合わせる」 (F050)** ← 풀스크린 또는 fixed bottom prominent
8. 운영자 도구 — 갤러리 업로드 UI (v2.2: FAQ 편집 UI 제거)

### 13-3. 이벤트 · 캘린더 · 빡센 관리 (Week 5-11) *(v2.1 확장)*

9. `app/events/[id]/page.tsx` 이벤트 풀스크린 (F002·F032)
10. `components/event-rsvp-pill.tsx` — **이중 모드** UI: 가벼움(気になる/行く予定) vs 강함(行く/たぶん行く/行かない) (F033)
11. `components/event-counts.tsx` — 모드별 카운트 (가벼움 참고용 / 강함 `定員 N · 残り N · キャンセル待ち N番目`) (F034)
12. `components/calendar-add-button.tsx` — Google/Apple 분기 + JST (F035)
13. `app/(tabs)/calendar/page.tsx` — 月表示 / リスト 토글 (F036·F037·F038)
14. `app/circles/[id]/events/new/page.tsx` — 이벤트 등록 폼 (F030) **+ `rsvp_mode` 선택 + `capacity` / `rsvp_deadline` / `requires_approval` 입력**
15. `app/circles/[id]/events/[eventId]/edit/page.tsx` — 수정 (F031) **+ 변경 시 F048 자동 알림 트리거**
16. `components/event-comments.tsx` — Q&A 댓글 (F039)
17. **`supabase/migrations/` F045 자동 승격 트리거** — `fn_event_rsvp_promote()` + `trg_event_rsvp_promote` (정원·웨이팅·마감 동시성 안전 처리)
18. **`app/circles/[id]/events/[eventId]/manage/page.tsx`** — 운영자 명단·승인 게이팅 UI (F046·F047)
19. **CSV 다운로드 엔드포인트** (`route.ts`) — 신청자 명단 (F047)
20. **일괄 알림 Server Action** — 신청자 전원 K CLUB 알림 발송 (F047)
21. **`app/circles/[id]/events/[eventId]/cancel/route.ts`** — 이벤트 취소 + 통보 (F049)
22. **변경 이력 추적·자동 알림 cron** (또는 Server Action) — `event_change_logs` 처리 (F048)

### 13-4. 운영진 DM (Week 10-15)

23. `app/circles/[id]/dm/page.tsx` — DM 진입 + 운영진 상태 표시 (F051)
24. `app/circles/[id]/dm/[inquiryId]/page.tsx` — DM 스레드 + Supabase Realtime (F052)
25. `app/(tabs)/mypage/inbox/page.tsx` — 발신·수신 인박스 (F063)
26. 운영자용 인박스 페이지 (운영진 그룹 공유)
27. 신고 UI + admin 검토 페이지 (F053)
28. 차단 + cooldown 로직 (F054·F055)
29. `presence` 추적 — 인박스 마운트/언마운트 + 5분 갱신
30. 「他者尊重」 동의 UI (F056)

### 13-5. 마이페이지 · 권한 · admin (Week 14-17)

31. `app/(tabs)/mypage/page.tsx` — お気に入り · 気になる · 行く予定 통합 (F060·F061·F062)
32. 프로필 설정 — `show_profile` 기본 OFF (F064)
33. `app/admin/owner-approvals/page.tsx` — F073 owner 승급 큐
34. `app/admin/inquiry-reports/page.tsx` — F053 신고 검토

### 13-6. 마무리 (Week 17-19)

35. UI 카피 일본어 검수 (섹션 7)
36. 안티패턴 5종 (12-1) 점검 — 특히 LINE 卒業 문구 grep
37. KPI 측정용 이벤트 로깅 추가 + **다단계 깔때기 (v2.3)** 추적
38. Supabase advisors 점검 (`get_advisors`)
39. **F045 자동 승격 트리거 동시성 부하 테스트** — 같은 정원 마지막 자리 N명 동시 신청 시뮬레이션
40. 신환 시즌 큐레이션 시드 데이터 준비
41. 베타 테스트 (웹) — 게이오 친구 5-10명 → 어그로 시뮬레이션 + DM 응답 패턴 + 빡센 이벤트 모드 사용성 관찰

### 13-7. Phase 1.5 — Capacitor 전환 + 스토어 출시 *(v2.3 신규, Week 20-25)*

**전제 조건:** Phase 1 (Week 1-19) 웹 출시 완료, 사용자 트래픽 검증

42. Capacitor 도입: `npm install @capacitor/core @capacitor/cli` + `npx cap init` + `cap add ios android`
43. `capacitor.config.ts` 작성 (hosted URL 모드, `jp.keio.kclub`)
44. `@capacitor/push-notifications` 통합 + `profiles` 신규 컬럼 (`push_token`·`push_platform`·`push_updated_at`) 마이그레이션
45. `@capacitor/camera` 통합 → 갤러리 업로드 UI 네이티브 카메라 지원
46. `@capacitor/splash-screen` + `@capacitor/status-bar` + 아이콘·스플래시 어셋 (`@capacitor/assets` 자동 생성)
47. 딥링크 (`kclub://events/123`, `kclub://circles/123/dm/...`) 핸들러 (`@capacitor/app`)
48. `components/app-only-gate.tsx` 작성 — 웹에서 「気になる」·DM·マイページ 등 클릭 시 「アプリで使う」 모달
49. 푸시 알림 페이로드 핸들러 — DM·이벤트 변경·운영진 승인 등 알림 타입별 라우팅
50. Apple Developer Program 등록 ($99/년, 본인 인증 1-3일)
51. Xcode 프로젝트 설정 (Bundle ID, Signing & Capabilities, Push 권한)
52. TestFlight 베타 빌드 → 친구 5-10명 → 피드백
53. App Store Connect 메타데이터 (이름·설명·키워드·스크린샷 5장+)
54. App Store 심사 제출 → 평균 24-48시간 (Apple 4.2 통과 전략 9-7-5 점검)
55. Google Play Console 등록 ($25 평생)
56. Android Studio 프로젝트 설정 (`applicationId`, 서명 키)
57. AAB(Android App Bundle) 빌드 → Internal Testing → Closed Beta → Production
58. Play Store 메타데이터 + 데이터 안전 섹션 + 콘텐츠 등급
59. 양 스토어 동시 출시 + 웹에 「アプリをダウンロード」 배너 활성화

---

*작성 완료: 2026-05-30 | K CLUB v2.3 — 시간차 비전 + 빡센 관리 🅐 + 連絡 통합 + **3단계 시간차 + Capacitor 네이티브 앱** 채택*
*다음 단계: 본 PRD를 기준으로 ① supabase 마이그레이션 초안 ② **17-25주** ROADMAP 분해 (Phase 1 + Phase 1.5) ③ 개발 Task 큐 생성*
