import type { ActivityReport } from "@/lib/types/domain";
import type { ActivityReportType } from "@/lib/constants/activity-report-type";

import { DUMMY_CIRCLES } from "./circles";

/**
 * 活動レポート 더미 데이터 — Phase 1.1 의 미리보기 캐러셀 + 게시판 탭 전체 리스트에 사용.
 *
 * 정책:
 * - 30개 서클 각각에 3-4건 결정론적 생성 → 총 약 100건
 * - title / content / body 는 일본어 더미 풀에서 선택
 * - image_url + images 는 picsum.photos seed 기반 결정론적 — 시각 회귀 일관성
 * - created_at 은 2026-04-01 기준 역순으로 N 일 빼서 부여 (최신순 정렬 후 미리보기 노출)
 * - location / activity_type 는 결정론적 분포로 모든 레코드에 부여
 *
 * 본 모듈의 helper 는 async — Phase 1.2 시드 SQL 와이어업 시 시그니처 유지 + 내부만 Supabase fetch 로 교체.
 */

/**
 * 결정론적 title 풀 — 12 개 (3-4 건 × 다양성 확보).
 * 일본 서클 컨텍스트의 자연스러운 후기/공지 톤.
 */
const TITLE_POOL = [
  "先週の練習、お疲れさまでした！",
  "新歓イベント開催のお知らせ",
  "合宿の写真をアップしました",
  "今月の活動報告です",
  "OB訪問、ありがとうございました",
  "次回ミーティングの日程変更",
  "皆さんお疲れさまでした✨",
  "今日の活動の様子をシェア",
  "メンバー募集中！見学歓迎",
  "イベント参加者募集のご案内",
  "今週末の予定について",
  "活動報告：素敵な一日でした",
];

/**
 * 결정론적 content 풀 — 12 개 (title 과 1:1 매칭).
 * 1-2 줄 분량의 자연스러운 일본어 미리보기.
 */
const CONTENT_POOL = [
  "皆さん集中して取り組んでいました。次回もよろしくお願いします。",
  "4月20日(土) 14:00から日吉キャンパスで開催します。お気軽にどうぞ。",
  "今年の夏合宿は本当に充実していました。来年も楽しみです！",
  "今月は新メンバー3名が加入し、活動の幅が広がりました。",
  "卒業生の方からお話を伺い、貴重な学びの時間でした。",
  "都合により来週のミーティングは19:00開始に変更します。",
  "今日も笑顔が絶えない一日でした。明日も頑張りましょう。",
  "本日の活動は皆で協力しながら進められて充実していました。",
  "現在新規メンバーを募集しています。少しでも気になる方はDMください。",
  "5月開催のイベントに向けて参加者を募集します。詳細は近日公開。",
  "今週末の活動内容について事前共有させていただきます。",
  "天気にも恵まれ、皆で楽しい時間を過ごせました。ありがとうございました。",
];

/**
 * 결정론적 body 풀 — 12 개 (content 와 1:1 매칭, 3-5 문장 풀 버전).
 * whitespace-pre-line 으로 줄바꿈 보존 렌더링됨.
 */
const BODY_POOL = [
  "今週も無事に練習を終えることができました。\n参加者全員が最後まで集中して取り組んでいたのが印象的です。\n特に新メンバーの成長が著しく、先輩たちも嬉しそうでした。\n次回は来週同じ時間帯に行います。引き続きよろしくお願いします！",
  "今年の新歓イベントの詳細が決まりました！\n日時：4月20日(土) 14:00〜17:00\n場所：日吉キャンパス 来往舎\n見学・体験は無料です。動きやすい服装でお越しください。\nご不明な点はInstagramのDMまでお気軽にどうぞ。",
  "先月行った夏合宿の写真をアップしました！\n2泊3日でみっちり練習しつつ、夜はBBQや花火も楽しみました。\nメンバー全員の絆が深まった最高の合宿でした。\n来年の合宿もすでに楽しみにしています。ぜひ一緒に参加しましょう！",
  "4月の活動をまとめて報告します。\n今月は新メンバーが3名加入し、活動の幅がさらに広がりました。\n月末には外部のチームとの練習試合も行い、良い刺激になりました。\n5月も引き続き楽しみながら活動していきましょう。よろしくお願いします！",
  "先日、OBの方をお招きしてお話を伺う機会がありました。\n社会人になってからの経験や、サークル時代に学んだことなど、とても参考になる内容でした。\nご参加いただいた皆さん、ありがとうございました。\n今後も定期的にOB交流の場を設けていきたいと思います。",
  "お知らせです。来週予定していたミーティングの時間が変更になります。\n変更前：18:00〜 → 変更後：19:00〜\n場所は同じく協生館 2F ホールです。\n急な変更で申し訳ありませんが、よろしくお願いします。参加できない方は事前にご連絡ください。",
  "本日の活動、皆さん本当にお疲れさまでした！\n今日は初めて試みる練習メニューに挑戦しましたが、全員が前向きに取り組んでくれました。\n笑いあり、真剣な場面ありの、とても充実した時間でした。\n来週もこの調子で頑張りましょう。週末に向けて体調を整えておいてください。",
  "今日の活動の様子をレポートします。\n午前中は基礎練習、午後は応用メニューで構成しました。\nメンバー同士のコミュニケーションも活発で、良いチームワークが見られました。\nご参加いただいた皆さん、ありがとうございました。次回もよろしくお願いします！",
  "ただいまメンバーを募集しています！\n慶應義塾大学に在籍する学生であれば、学部・学年問わず歓迎します。\n経験者はもちろん、初心者の方も大歓迎です。一緒に楽しみましょう！\nまずは見学だけでもOKです。InstagramのDMかLINEでお気軽にご連絡ください。",
  "5月に予定しているイベントの参加者を募集します！\n詳細は近日中に公開予定ですが、例年とても盛り上がるイベントです。\n昨年参加したメンバーからも好評でした。ぜひ今年も多くの方に来ていただきたいです。\n詳細が決まり次第、このアカウントでお知らせします。お楽しみに！",
  "今週末の活動内容について事前にお知らせします。\n土曜日：午前10時〜 基礎練習＋ミーティング\n日曜日：午後2時〜 練習試合（希望者のみ）\n持ち物や服装の注意点は別途LINEで共有します。\n初めて参加する方も気軽に来てください。お待ちしています！",
  "本日の活動は天気にも恵まれ、外での練習を楽しむことができました。\nメンバー全員の笑顔が印象的な、とても素晴らしい一日でした。\n終了後は有志で近くのカフェに立ち寄り、リラックスした時間を過ごしました。\nいつも積極的に参加してくれるメンバーに感謝しています。来週もよろしくお願いします！",
];

/**
 * 활동 장소 풀 — 10 개.
 * 慶應 캠퍼스 + 온라인 + 주변 시설.
 */
const LOCATION_POOL = [
  "日吉キャンパス 第2体育館",
  "三田 西校舎 5階",
  "協生館 2F ホール",
  "オンライン (Zoom)",
  "綱島運動施設 グラウンドB",
  "日吉 来往舎",
  "三田 演説館",
  "日吉キャンパス記念館",
  "協生館 405号室",
  "綱島キャンパス カフェテリア",
];

/**
 * 활동 종류 결정론적 분포 배열 (20 슬롯).
 * practice 40% (8) / event 25% (5) / meeting 15% (3) / camp 10% (2) / other 10% (2)
 */
const ACTIVITY_TYPE_DISTRIBUTION: ActivityReportType[] = [
  "practice",
  "practice",
  "practice",
  "practice",
  "practice",
  "practice",
  "practice",
  "practice",
  "event",
  "event",
  "event",
  "event",
  "event",
  "meeting",
  "meeting",
  "meeting",
  "camp",
  "camp",
  "other",
  "other",
];

/**
 * 서클 별 활동 리포트 생성 — 결정론적.
 * - circleSeq (1-30) 와 위 풀의 index 를 조합하여 항상 동일한 결과를 반환.
 * - per-circle count: 3 ~ 4건 (circleSeq % 2 === 0 면 4건, 아니면 3건)
 */
function buildReportsForCircle(circleId: string, circleSeq: number): ActivityReport[] {
  const count = circleSeq % 2 === 0 ? 4 : 3;
  return Array.from({ length: count }).map((_, i) => {
    /** title/content/body 풀 인덱스 — 서클별로 다르되 결정론적 */
    const poolIndex = (circleSeq * 3 + i) % TITLE_POOL.length;
    /** created_at — 2026-04-01 기준으로 (circleSeq + i) 일 만큼 과거. ISO YYYY-MM-DD */
    const daysAgo = circleSeq + i * 5;
    const base = new Date("2026-04-01T00:00:00Z");
    base.setUTCDate(base.getUTCDate() - daysAgo);
    const createdAt = base.toISOString().slice(0, 10);

    /** 갤러리 이미지 수 — 3, 4, 5 순환 */
    const imgCount = 3 + ((circleSeq + i) % 3);

    /** 활동 종류 — 결정론적 분포 (20 슬롯 순환) */
    const activityType =
      ACTIVITY_TYPE_DISTRIBUTION[(circleSeq * 7 + i * 3) % ACTIVITY_TYPE_DISTRIBUTION.length];

    /** 활동 장소 — 10개 풀 결정론적 */
    const location = LOCATION_POOL[(circleSeq * 5 + i * 2) % LOCATION_POOL.length];

    return {
      id: `${circleId}-report-${i + 1}`,
      circle_id: circleId,
      title: TITLE_POOL[poolIndex],
      content: CONTENT_POOL[poolIndex],
      body: BODY_POOL[poolIndex],
      image_url: `https://picsum.photos/seed/report-${circleSeq}-${i + 1}/400/400`,
      images: Array.from({ length: imgCount }).map((__, imgIdx) => ({
        id: `${circleId}-report-${i + 1}-img-${imgIdx + 1}`,
        image_url: `https://picsum.photos/seed/report-${circleSeq}-${i + 1}-img-${imgIdx + 1}/800/600`,
        sort_order: imgIdx,
      })),
      location,
      activity_type: activityType,
      created_at: createdAt,
    };
  });
}

/** 전체 더미 ActivityReport 배열 — 30 서클 × 3-4건 = 약 100건 */
export const DUMMY_ACTIVITY_REPORTS: ActivityReport[] = DUMMY_CIRCLES.flatMap((circle, idx) =>
  buildReportsForCircle(circle.id, idx + 1)
);

/**
 * 서클 ID 로 활동 리포트 조회 — 최신순 (created_at desc) 정렬.
 * @param limit 미지정 시 해당 서클의 전체, 지정 시 첫 N 건
 */
export async function getActivityReportsByCircleId(
  circleId: string,
  limit?: number
): Promise<ActivityReport[]> {
  const matched = DUMMY_ACTIVITY_REPORTS.filter((r) => r.circle_id === circleId).sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
  return limit !== undefined ? matched.slice(0, limit) : matched;
}

/**
 * 리포트 ID 로 활동 리포트 단건 조회.
 * 존재하지 않으면 null 반환.
 * Phase 1.2 시드 SQL 와이어업 시 내부를 Supabase fetch 로 교체.
 */
export async function getActivityReportById(reportId: string): Promise<ActivityReport | null> {
  return DUMMY_ACTIVITY_REPORTS.find((r) => r.id === reportId) ?? null;
}
