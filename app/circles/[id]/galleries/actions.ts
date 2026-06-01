"use server";

/**
 * app/circles/[id]/galleries/actions.ts
 *
 * 갤러리 관련 Server Actions.
 *
 * - insertGalleryRecord: circle_galleries 테이블에 행 삽입 + 캐시 무효화.
 *
 * 설계 방침:
 *  - 이미지 Storage 업로드는 클라이언트(uploadGalleryImage in strip-exif.ts)에서 담당.
 *    이유: Storage RLS 는 circles.owner_id 기준이므로 브라우저 세션 쿠키가 있는
 *    클라이언트 Supabase 클라이언트로 호출해야 함.
 *  - 이 Action 은 업로드 완료 후 반환된 URL 을 받아 DB INSERT 만 담당.
 *  - Defense in Depth: Server Action 내부에서 인증·권한을 재검증한다.
 *
 * RLS 현황:
 *  - circle_galleries INSERT: circles.owner_id = auth.uid() 인 행만 허용.
 *  - 이 Action 은 owner 가 호출하는 시나리오에서만 DB INSERT 가 성공한다.
 *    (페이지 접근 제한은 is_circle_staff RPC 로 하고, 실제 쓰기는 RLS 가 이중 방어)
 */

import { revalidatePath, revalidateTag } from "next/cache";

import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────
// 반환 타입
// ─────────────────────────────────────────

export type InsertGalleryResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

// ─────────────────────────────────────────
// 메인 Action
// ─────────────────────────────────────────

/**
 * circle_galleries 테이블에 갤러리 행을 삽입합니다.
 *
 * 클라이언트에서 Storage 업로드를 완료한 뒤, 반환된 공개 URL 과 함께 호출합니다.
 *
 * @param circleId  - 동아리 UUID
 * @param imageUrl  - Storage 에 업로드 완료된 공개 URL
 * @param caption   - 사진 설명 (선택, 빈 문자열 허용)
 * @param takenAt   - 촬영 일시 ISO 문자열 (선택, null 허용)
 */
export async function insertGalleryRecord(
  circleId: string,
  imageUrl: string,
  caption: string,
  takenAt: string | null
): Promise<InsertGalleryResult> {
  // ── 매번 새 클라이언트 생성 (Fluid compute 규칙) ──────────────────────────
  const supabase = await createClient();

  // ── 인증 재검증 (Defense in Depth) ──────────────────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return { ok: false, error: "ログインが必要です。" };
  }
  const userId = claimsData.claims.sub as string;

  // ── is_circle_staff 권한 재검증 ──────────────────────────────────────────
  // ページ側で検証済みだが、Server Action レベルでも二重チェック
  const { data: isStaff } = await supabase.rpc("is_circle_staff", {
    _circle_id: circleId,
  });
  if (!isStaff) {
    return { ok: false, error: "スタッフ権限がありません。" };
  }

  // ── circle_galleries INSERT ───────────────────────────────────────────────
  // RLS circle_galleries_write (INSERT WITH CHECK) がowner のみ許可。
  // staff の場合は RLS に弾かれる可能性あり — エラー詳細を返す。
  const { data: row, error: insertError } = await supabase
    .from("circle_galleries")
    .insert({
      circle_id: circleId,
      uploaded_by: userId,
      image_url: imageUrl,
      caption: caption.trim(),
      taken_at: takenAt,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    console.error("[insertGalleryRecord] INSERT エラー:", insertError?.message);
    return {
      ok: false,
      error: insertError?.message ?? "ギャラリーの保存に失敗しました。",
    };
  }

  // ── キャッシュ無効化 ──────────────────────────────────────────────────────
  // listGalleries は ["circles", "galleries"] タグでキャッシュされている
  // { expire: 0 } = 해당 태그의 캐시를 즉시 만료시킴 (Next.js 16 이상)
  revalidateTag("galleries", { expire: 0 });
  revalidateTag("circles", { expire: 0 });
  // 서클 상세 페이지 경로도 무효화
  revalidatePath(`/circles/${circleId}`);

  return { ok: true, id: row.id };
}
