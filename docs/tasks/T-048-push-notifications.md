# T-048: 푸시 알림 통합 (Capacitor Push + profiles 마이그레이션)

| 항목 | 내용 |
|---|---|
| **Phase** | 1.5 |
| **우선순위** | High |
| **예상 소요** | 3일 |
| **의존성** | T-047 |
| **관련 기능 ID** | F006 (Web Push 폐기) → Capacitor Push (FCM+APNs) |
| **PRD 참조** | PRD 9-7-3 · 13장 44단계 |

## 산출물

- `app/lib/native/push.ts` — 토큰 등록·딥링크 핸들러
- `profiles` 마이그레이션 — `push_token`·`push_platform`·`push_updated_at` 컬럼 추가 + GRANT

## 검증 기준

- 실기기 (iPhone + Android 폰) 에서 푸시 권한 요청 다이얼로그
- 권한 부여 후 `profiles.push_token` 저장
- Supabase Edge Function (또는 외부 서비스) 에서 푸시 발송 → 실기기 수신
- 푸시 클릭 → 딥링크 이동

## 세부 작업

- [ ] `npm install @capacitor/push-notifications`
- [ ] iOS — Xcode Push Notifications capability 활성화
- [ ] iOS — APNs 인증서 또는 키 생성 (Apple Developer)
- [ ] Android — Firebase 프로젝트 생성 + `google-services.json` 추가
- [ ] `lib/native/push.ts` 작성 (PRD 9-7-3 코드 참조)
- [ ] 마이그레이션 — `profiles` 3개 컬럼 추가 + GRANT
- [ ] 로그인 후 `initPush(userId)` 호출
- [ ] 푸시 발송 측 (Supabase Edge Function) — FCM/APNs 라우팅

## 위험·주의사항

- ⚠️ **APNs 인증서 1년 만료** [[push 인증서 갱신 누락]] — 1년 후 갱신 안 하면 푸시 중단. 만료일 캘린더 등록.
- ⚠️ **시뮬레이터 푸시 불가** — iOS 시뮬레이터는 푸시 안 됨. **실기기 필수**.
- ⚠️ **`google-services.json` git ignore 여부** — 공개 정보지만 보안상 ignore 권장.
- ⚠️ **컬럼 GRANT** [[circles-column-grant-trap]] — `push_token` UPDATE 권한 명시.
- ⚠️ **Apple 4.2 통과 핵심** — 푸시 통합은 단순 웹뷰 거절 회피의 핵심 (T-054 심사).

## 코드 스니펫 (PRD 9-7-3 참조)

```typescript
// lib/native/push.ts
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";

export async function initPush(userId: string) {
  if (!Capacitor.isNativePlatform()) return;
  await PushNotifications.requestPermissions();
  await PushNotifications.register();
  PushNotifications.addListener("registration", async (token) => {
    await supabase.from("profiles").update({
      push_token: token.value,
      push_platform: Capacitor.getPlatform(),
      push_updated_at: new Date().toISOString(),
    }).eq("id", userId);
  });
  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const url = action.notification.data?.url;
    if (url) router.push(url);
  });
}
```

## 테스트 체크리스트

- [ ] iPhone 실기기 권한 요청 표시
- [ ] 권한 부여 → `profiles.push_token` 저장
- [ ] 푸시 발송 → 실기기 수신
- [ ] 푸시 클릭 → 딥링크 페이지 이동
- [ ] Android 동일 시나리오
