# T-033: cooldown 로직 + 「他者尊重」 동의

| 항목 | 내용 |
|---|---|
| **Phase** | 1-4 |
| **우선순위** | Med |
| **예상 소요** | 1.5일 |
| **의존성** | T-027 |
| **관련 기능 ID** | F055·F056 |
| **PRD 참조** | PRD 5-5 F055·F056 |

## 산출물

- DM 발신 Server Action 안 cooldown 검증
- 「他者尊重」 동의 체크박스 (회원가입 시 1회) + `profiles.respect_agreed_at` 컬럼

## 검증 기준

- 같은 검토자가 1시간 내 N건 이상 발송 시 거부 (예: N=10)
- 회원가입 시 「他者尊重」 동의 체크박스 필수
- `profiles.respect_agreed_at` NULL 인 사용자 발신 거부 또는 동의 모달 표시

## 세부 작업

- [ ] cooldown 검증 — `inquiries WHERE sender = auth.uid() AND created_at > now() - interval '1 hour'` count
- [ ] 임계값 초과 시 거부 메시지 「短時間に多くのお問い合わせを送信しました。しばらくしてから再度お試しください」
- [ ] 마이그레이션 — `profiles.respect_agreed_at timestamptz` 컬럼 추가 + GRANT
- [ ] 회원가입 페이지에 체크박스 추가
- [ ] 발신 폼에서 `respect_agreed_at IS NULL` 시 동의 모달 → 동의 후 발신

## 위험·주의사항

- ⚠️ **임계값** — N=10 은 PRD 미명시. 베타에서 조정.
- ⚠️ **기존 사용자** — Phase 0 에서 가입한 사용자는 `respect_agreed_at` NULL. 첫 발신 시 동의 모달.
- ⚠️ **컬럼 GRANT** [[circles-column-grant-trap]].

## 테스트 체크리스트

- [ ] 같은 user 가 1시간 내 11회 발송 시도 → 11번째 거부
- [ ] 동의 안 한 사용자 발신 시 모달 표시
- [ ] 동의 후 발신 가능
