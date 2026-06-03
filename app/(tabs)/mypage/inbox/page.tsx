/**
 * app/(tabs)/mypage/inbox/page.tsx
 *
 * /messages への redirect スタブ.
 *
 * 旧 URL (/mypage/inbox) へのリンク・ブックマークを /messages に転送する.
 * ページロジックはすべて app/(tabs)/messages/page.tsx に移行済み.
 */

import { redirect } from "next/navigation";

export default function MyInboxPage() {
  redirect("/messages");
}
