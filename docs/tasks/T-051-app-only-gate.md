# T-051: `<AppOnlyGate>` 웹 → 앱 유도 모달

| 항목 | 내용 |
|---|---|
| **Phase** | 1.5 |
| **우선순위** | High |
| **예상 소요** | 2일 |
| **의존성** | T-047 |
| **관련 기능 ID** | PRD 4-5 채널 매트릭스 · 4-6 유도 패턴 |
| **PRD 참조** | PRD 4-5·4-6 · 9-7-4 · 13장 48단계 |

## 산출물

- `components/app-only-gate.tsx`
- 「アプリをダウンロード」 모달 UI

## 검증 기준

- 앱 (`Capacitor.isNativePlatform()` true) → 자식 그대로 렌더링
- 웹에서 「気になる」·「行く予定」·DM·マイページ 등 앱 전용 행위 클릭 → 모달 표시
- iOS/Android 자동 판별 → 스토어로 이동
- 강제 다운로드 X — 「このサイトで続ける」 옵션도 제공 (단 해당 행위는 차단)

## 세부 작업

- [ ] `components/app-only-gate.tsx` 작성 (PRD 9-7-4 코드 참조)
- [ ] User-Agent 기반 iOS/Android 판별
- [ ] 모달 카피 「お気に入りはアプリで保存できます」
- [ ] 다음 영역에 적용:
  - [ ] T-015 RSVP pill (気になる·行く予定·行く 등)
  - [ ] T-027 DM 발신 폼
  - [ ] T-029 운영진 인박스
  - [ ] T-035 마이페이지
  - [ ] T-024 운영자 명단·CSV
- [ ] T-042 의 다단계 깔때기 로깅 활성화 (모달 표시·클릭·스토어 이동)

## 위험·주의사항

- ⚠️ **dark pattern 금지** — 강제 다운로드 절대 X. PRD 4-6 「このサイトで続ける」 옵션 필수.
- ⚠️ **앱 다운로드 마찰** — 모달 카피 톤 부드럽게. 「強制」「必須」 표현 금지.
- ⚠️ **iOS·Android 판별 한계** — User-Agent 위조 가능. 단순 best-effort.

## 코드 스니펫 (PRD 9-7-4)

```tsx
"use client";
import { Capacitor } from "@capacitor/core";

export function AppOnlyGate({ children, action }: { children: ReactNode; action: string }) {
  const isNative = Capacitor.isNativePlatform();
  if (isNative) return <>{children}</>;
  return (
    <button onClick={() => showAppDownloadModal(action)}>
      <span className="text-muted-foreground">📱 {action}</span>
    </button>
  );
}
```

## 테스트 체크리스트

- [ ] 앱에서 子(자식) 그대로 렌더링
- [ ] 웹에서 클릭 → 모달
- [ ] iOS Safari → App Store 이동
- [ ] Android Chrome → Play Store 이동
- [ ] T-042 로깅 카운트 발생
