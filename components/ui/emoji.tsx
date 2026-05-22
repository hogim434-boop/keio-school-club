import { Icon } from "@iconify/react";

import { cn } from "@/lib/utils";

/**
 * Fluent UI 3D Emoji 매핑 — 사용 가능한 이모지 화이트리스트.
 *
 * 사용처:
 * - 카테고리 그리드 (스포츠 / 음악 / 학술 등 9종)
 * - BottomNav (홈 / 즐겨찾기 / 마이페이지)
 * - Header (알림 / 검색)
 *
 * 신규 이모지 추가 시 https://icon-sets.iconify.design/fluent-emoji/ 에서 검색해 id 를 가져와 매핑.
 * 화이트리스트 패턴으로 오타·미존재 아이콘을 컴파일 타임에 방지.
 */
const EMOJI_MAP = {
  // 카테고리 (9종)
  trophy: "fluent-emoji:trophy",
  "artist-palette": "fluent-emoji:artist-palette",
  "musical-notes": "fluent-emoji:musical-notes",
  books: "fluent-emoji:books",
  globe: "fluent-emoji:globe-showing-asia-australia",
  "party-popper": "fluent-emoji:party-popper",
  handshake: "fluent-emoji:handshake",
  "clapper-board": "fluent-emoji:clapper-board",
  sparkles: "fluent-emoji:sparkles",
  // 네비게이션 (5종)
  house: "fluent-emoji:house",
  "red-heart": "fluent-emoji:red-heart",
  "bust-in-silhouette": "fluent-emoji:bust-in-silhouette",
  bell: "fluent-emoji:bell",
  "magnifying-glass": "fluent-emoji:magnifying-glass-tilted-left",
  // 마이페이지 빈 상태 (1종)
  "busts-in-silhouette": "fluent-emoji:busts-in-silhouette",
} as const;

export type EmojiName = keyof typeof EMOJI_MAP;

interface EmojiProps {
  /** 화이트리스트된 이모지 이름 (EMOJI_MAP 의 key) */
  name: EmojiName;
  /** px 단위. lucide 의 size-5(20px) / size-6(24px) 와 매칭하려면 24~32 권장. */
  size?: number;
  className?: string;
}

/**
 * Fluent 3D 이모지 컴포넌트 — Iconify 기반 인라인 SVG 렌더.
 *
 * lucide-react 와 유사한 인터페이스로 마이그레이션 쉬움:
 * - `<Trophy className="size-6" />` → `<Emoji name="trophy" size={24} />`
 *
 * 접근성: 이모지는 시각적 장식이므로 `aria-hidden="true"`.
 * 의미는 옆에 붙는 텍스트 라벨이나 부모의 `aria-label` 이 전달.
 */
export function Emoji({ name, size = 24, className }: EmojiProps) {
  return (
    <Icon
      icon={EMOJI_MAP[name]}
      width={size}
      height={size}
      className={cn("inline-block shrink-0", className)}
      aria-hidden="true"
    />
  );
}
