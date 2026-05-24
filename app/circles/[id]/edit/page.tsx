import { Suspense } from "react";
import { notFound } from "next/navigation";

import { CircleRegistrationForm } from "@/components/circles/new/circle-registration-form";
import { requireUser } from "@/lib/auth/require-user";
import { circleToEditValues } from "@/lib/circles/registration-schema";
import { getCircleForEdit } from "@/lib/supabase/queries/circles";

interface EditCirclePageProps {
  params: Promise<{ id: string }>;
}

/**
 * 서클 편집 페이지 — /circles/{id}/edit
 *
 * cacheComponents: true 모드에서 cookies() 의존 RSC 는 반드시 Suspense 로 감싸야 한다.
 * → 외부 Page 는 Suspense 경계만 담당하고, 실제 데이터 조회는 EditContent 에서 처리.
 *
 * BottomNav / 글로벌 헤더: bottom-nav.tsx / header-client-gate.tsx 가
 * /circles/{id}/edit 정규식으로 이미 풀스크린 처리(hidden) 하고 있으므로 별도 처리 불필요.
 */
export default function EditCirclePage({ params }: EditCirclePageProps) {
  return (
    <Suspense fallback={null}>
      <EditContent params={params} />
    </Suspense>
  );
}

/**
 * 편집 페이지 본문 — 서버 컴포넌트.
 *
 * 처리 흐름:
 *  1. params 에서 id await
 *  2. requireUser: 미인증 → /auth/login?next=... 으로 redirect, 인증 시 userId 반환
 *  3. getCircleForEdit: status 필터 없이 조회 (pending/rejected 도 owner·admin 에게 반환)
 *     비소유자가 미승인 서클을 조회하면 RLS 가 null 반환 → notFound()
 *  4. 명시적 소유자 가드: RLS 가 막아도 circle.owner_id !== userId 이면 notFound()
 *  5. circleToEditValues 로 초기값 변환 후 CircleRegistrationForm(mode="edit") 렌더
 */
async function EditContent({ params }: EditCirclePageProps) {
  // Next.js 15 async params — await 필수
  const { id } = await params;

  // 인증 가드 — 미인증 시 /auth/login?next=/circles/{id}/edit 으로 redirect
  const userId = await requireUser(`/circles/${id}/edit`);

  // 소유자용 서클 조회 — status 필터 없음 (pending/rejected 포함)
  const circle = await getCircleForEdit(id);
  if (!circle) notFound();

  // 명시적 소유자 가드 — RLS 가 보호하지만 서버에서 한 번 더 확인
  if (circle.owner_id !== userId) notFound();

  // CircleDetail → RegistrationValues 변환 (pledge1/2 = true 로 채워 검증 통과)
  const initialValues = circleToEditValues(circle);

  return (
    <CircleRegistrationForm
      mode="edit"
      initialValues={initialValues}
      circleId={id}
      basePath={`/circles/${id}/edit`}
      existingImages={circle.images}
    />
  );
}
