import type { ActivityFrequency } from "@/lib/constants/activity-frequency";
import type { Category } from "@/lib/constants/category";
import type { OfficialType } from "@/lib/constants/official-type";
import type { CircleDetail, CircleImage, CircleSummary } from "@/lib/types/domain";

/**
 * Phase 1.1 의 더미 데이터 30건 — UI 가 먼저 동작하도록 정적 배열로 제공.
 *
 * 정책:
 * - 학생 단체 통합(공인 한정 인상 방지): athletics 3 / official 12 / unofficial 9 / intercollegiate 4 / other 2.
 * - 카테고리 분포는 PRD 「더미 데이터 정책」 그대로: sports 5 / culture_art 4 / music 4 / academic 4 / international 4 / event 3 / volunteer 3 / media 3.
 * - 모든 단체에 연락처(IG/X/LINE) 1개 이상 + 태그 3~5개 + 「approved」 status + 갤러리 4장.
 * - id 는 고정 UUID v4 — Phase 1.2 T-009 의 시드 SQL 이 같은 UUID 로 INSERT 하여 시각 회귀 테스트가 동일 결과를 보장.
 * - cover_image_url 과 images 는 picsum.photos seed 기반(결정론적, 같은 seed=같은 이미지) 으로 시각 회귀 신뢰성 확보.
 * - activity_days / member_count / freshmen_ratio (T-012) 는 요약 카드 5종 표시에 사용.
 *
 * 본 모듈의 helper 는 모두 async — Phase 1.2 T-009 와이어업 시 시그니처를 유지하면서
 * 내부만 Supabase fetch 로 무손실 교체 가능하게 함.
 */

/** 30건 분포의 single source of truth — 테스트에서 expected 와 동적 비교 */
export const DUMMY_CIRCLES_DISTRIBUTION = {
  total: 30,
  category: {
    sports: 5,
    culture_art: 4,
    music: 4,
    academic: 4,
    international: 4,
    event: 3,
    volunteer: 3,
    media: 3,
  },
  official_type: {
    athletics: 3,
    official: 12,
    unofficial: 9,
    intercollegiate: 4,
    other: 2,
  },
} as const;

/** 30건 UUID 가 모두 들어갈 자리 — `00000000-0000-4000-8000-XXXXXXXXXXXX` */
function id(seq: number): string {
  return `00000000-0000-4000-8000-${seq.toString().padStart(12, "0")}`;
}

/** 가상의 단체 대표자 UUID (현재는 모두 같은 owner — Phase 1.3 T-015 에서 실제 user UUID 로 교체) */
const DUMMY_OWNER = "11111111-1111-4000-8000-111111111111";

/** picsum.photos seed 기반 결정론적 placeholder 이미지 URL — 커버 16:9 */
function cover(seed: string): string {
  return `https://picsum.photos/seed/${seed}/800/450`;
}

/** seed 기반 갤러리 4장 (T-012) — 시각 회귀를 위해 결정론적 seed-img-N 패턴 */
function buildGallery(seed: string): CircleImage[] {
  return Array.from({ length: 4 }).map((_, i) => ({
    id: `${seed}-img-${i + 1}`,
    image_url: `https://picsum.photos/seed/${seed}-img-${i + 1}/1200/800`,
    sort_order: i,
  }));
}

/** cover + images 를 같은 seed 로 묶어 spread 로 entry 에 적용 (중복 작성 회피) */
function assets(seed: string): { cover_image_url: string; images: CircleImage[] } {
  return {
    cover_image_url: cover(seed),
    images: buildGallery(seed),
  };
}

/** 본 페이즈에서는 신환 이벤트 미사용 — 빈 배열 placeholder */
const NO_EVENTS: CircleDetail["shinkan_events"] = [];

export const DUMMY_CIRCLES: CircleDetail[] = [
  // === スポーツ 5 (athletics 3 + official 1 + unofficial 1) ===
  {
    id: id(1),
    name: "慶應義塾體育会硬式テニス部",
    category: "sports",
    official_type: "athletics",
    activity_frequency: "weekly_2_3",
    annual_fee_yen: 30000,
    view_count: 480,
    inquiry_count: 42,
    tags: ["gachi", "has_camp", "men_many"],
    description:
      "週6回の練習で関東学生リーグ上位を狙う本格派体育会。初心者の入部実績あり、未経験でも歓迎。",
    activity_days: "月・水・金・土",
    member_count: 85,
    freshmen_ratio: 25,
    contact_instagram: "https://instagram.com/keio_tennis_official",
    contact_x: "https://x.com/keio_tennis",
    contact_line: null,
    ...assets("kc-sports-tennis"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(2),
    name: "慶應義塾體育会サッカー部",
    category: "sports",
    official_type: "athletics",
    activity_frequency: "weekly_2_3",
    annual_fee_yen: 25000,
    view_count: 420,
    inquiry_count: 38,
    tags: ["gachi", "has_camp", "men_many", "once_a_week"],
    description: "関東大学サッカーリーグ参戦。早慶戦をはじめ本格的な公式戦多数。",
    activity_days: "火・木・土",
    member_count: 72,
    freshmen_ratio: 28,
    contact_instagram: "https://instagram.com/keio_soccer",
    contact_x: null,
    contact_line: "https://line.me/R/ti/p/keio_soccer",
    ...assets("kc-sports-soccer"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(3),
    name: "慶應義塾體育会バスケットボール部",
    category: "sports",
    official_type: "athletics",
    activity_frequency: "weekly_2_3",
    annual_fee_yen: 22000,
    view_count: 360,
    inquiry_count: 30,
    tags: ["gachi", "has_camp", "men_many"],
    description: "関東大学バスケットボールリーグ1部所属。経験者中心の本格派。",
    activity_days: "月・水・金",
    member_count: 60,
    freshmen_ratio: 30,
    contact_instagram: "https://instagram.com/keio_basketball",
    contact_x: "https://x.com/keio_basketball",
    contact_line: null,
    ...assets("kc-sports-basketball"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(4),
    name: "慶應バドミントンサークル",
    category: "sports",
    official_type: "official",
    activity_frequency: "weekly_1",
    annual_fee_yen: 8000,
    view_count: 280,
    inquiry_count: 35,
    tags: ["beginner_ok", "yurui", "kenser_ok"],
    description: "初心者・経験者問わず気軽に楽しむサークル。週1回・日吉体育館で活動。",
    activity_days: "土曜日",
    member_count: 45,
    freshmen_ratio: 50,
    contact_instagram: "https://instagram.com/keio_bad",
    contact_x: null,
    contact_line: null,
    ...assets("kc-sports-badminton"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(5),
    name: "三田フットサル愛好会",
    category: "sports",
    official_type: "unofficial",
    activity_frequency: "weekly_1",
    annual_fee_yen: 5000,
    view_count: 180,
    inquiry_count: 22,
    tags: ["beginner_ok", "yurui", "low_fee", "kenser_ok"],
    description: "三田キャンパス周辺で活動する非公認フットサル。土曜午後にゆるく集まる。",
    activity_days: "土曜日",
    member_count: 25,
    freshmen_ratio: 55,
    contact_instagram: "https://instagram.com/mita_futsal",
    contact_x: null,
    contact_line: null,
    ...assets("kc-sports-futsal"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },

  // === 文化・芸術 4 (official 2 + unofficial 1 + intercollegiate 1) ===
  {
    id: id(6),
    name: "慶應茶道部",
    category: "culture_art",
    official_type: "official",
    activity_frequency: "weekly_1",
    annual_fee_yen: 10000,
    view_count: 240,
    inquiry_count: 28,
    tags: ["beginner_ok", "yurui", "women_many"],
    description: "表千家。初心者大歓迎、お点前から作法まで丁寧に指導。",
    activity_days: "水曜日",
    member_count: 38,
    freshmen_ratio: 45,
    contact_instagram: "https://instagram.com/keio_chadou",
    contact_x: null,
    contact_line: null,
    ...assets("kc-art-tea"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(7),
    name: "慶應美術部",
    category: "culture_art",
    official_type: "official",
    activity_frequency: "weekly_1",
    annual_fee_yen: 6000,
    view_count: 200,
    inquiry_count: 20,
    tags: ["yurui", "beginner_ok", "kenser_ok"],
    description: "デッサン・油絵・水彩、各自のペースで制作。三田祭で展示会開催。",
    activity_days: "金曜日",
    member_count: 32,
    freshmen_ratio: 40,
    contact_instagram: "https://instagram.com/keio_art",
    contact_x: "https://x.com/keio_art",
    contact_line: null,
    ...assets("kc-art-painting"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(8),
    name: "三田写真クラブ",
    category: "culture_art",
    official_type: "unofficial",
    activity_frequency: "monthly",
    annual_fee_yen: 3000,
    view_count: 150,
    inquiry_count: 18,
    tags: ["yurui", "low_fee", "kenser_ok"],
    description: "月1回の撮影会＋オンライン作品共有。フィルム・デジタル不問。",
    activity_days: "第3土曜日",
    member_count: 18,
    freshmen_ratio: 60,
    contact_instagram: "https://instagram.com/mita_photo_club",
    contact_x: null,
    contact_line: null,
    ...assets("kc-art-photo"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(9),
    name: "関東大学合同書道会",
    category: "culture_art",
    official_type: "intercollegiate",
    activity_frequency: "monthly",
    annual_fee_yen: 5000,
    view_count: 120,
    inquiry_count: 12,
    tags: ["beginner_ok", "kenser_ok", "women_many"],
    description: "早稲田・上智・慶應合同インカレ書道会。月1回の合同稽古＋年2回展示。",
    activity_days: "第2・第4日曜日",
    member_count: 55,
    freshmen_ratio: 35,
    contact_instagram: null,
    contact_x: "https://x.com/kanto_shodou",
    contact_line: "https://line.me/R/ti/p/kanto_shodou",
    ...assets("kc-art-shodou"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },

  // === 音楽 4 (official 2 + unofficial 1 + intercollegiate 1) ===
  {
    id: id(10),
    name: "慶應ワグネル・ソサィエティー男声合唱団",
    category: "music",
    official_type: "official",
    activity_frequency: "weekly_2_3",
    annual_fee_yen: 15000,
    view_count: 320,
    inquiry_count: 26,
    tags: ["gachi", "men_many", "has_camp"],
    description: "1901年創立の伝統ある男声合唱団。本格的なコーラスを目指す。",
    activity_days: "月・水・金",
    member_count: 70,
    freshmen_ratio: 35,
    contact_instagram: "https://instagram.com/keio_wagner",
    contact_x: "https://x.com/keio_wagner",
    contact_line: null,
    ...assets("kc-music-wagner"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(11),
    name: "慶應軽音楽部",
    category: "music",
    official_type: "official",
    activity_frequency: "weekly_1",
    annual_fee_yen: 10000,
    view_count: 290,
    inquiry_count: 32,
    tags: ["yurui", "kenser_ok", "low_drinking"],
    description: "ロック・ポップス・ジャズなど幅広く活動。バンド結成自由。",
    activity_days: "木曜日",
    member_count: 65,
    freshmen_ratio: 48,
    contact_instagram: "https://instagram.com/keio_light_music",
    contact_x: null,
    contact_line: null,
    ...assets("kc-music-light"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(12),
    name: "三田ジャズサークル",
    category: "music",
    official_type: "unofficial",
    activity_frequency: "weekly_1",
    annual_fee_yen: 4000,
    view_count: 160,
    inquiry_count: 14,
    tags: ["yurui", "low_fee", "kenser_ok"],
    description: "ジャズ好きが集まる非公認サークル。三田周辺のライブハウスでセッション。",
    activity_days: "金曜日",
    member_count: 22,
    freshmen_ratio: 55,
    contact_instagram: "https://instagram.com/mita_jazz",
    contact_x: null,
    contact_line: null,
    ...assets("kc-music-jazz"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(13),
    name: "都内大学アカペラ連盟",
    category: "music",
    official_type: "intercollegiate",
    activity_frequency: "weekly_2_3",
    annual_fee_yen: 8000,
    view_count: 220,
    inquiry_count: 24,
    tags: ["gachi", "women_many", "has_camp"],
    description: "都内10大学合同インカレアカペラ。年4回の合同ライブ＋夏合宿。",
    activity_days: "月・水・土",
    member_count: 80,
    freshmen_ratio: 38,
    contact_instagram: "https://instagram.com/tokyo_acapella",
    contact_x: "https://x.com/tokyo_acapella",
    contact_line: null,
    ...assets("kc-music-acapella"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },

  // === 学術・研究 4 (official 2 + unofficial 1 + intercollegiate 1) ===
  {
    id: id(14),
    name: "慶應経済学研究会",
    category: "academic",
    official_type: "official",
    activity_frequency: "monthly",
    annual_fee_yen: 3000,
    view_count: 130,
    inquiry_count: 11,
    tags: ["yurui", "kenser_ok", "low_fee"],
    description: "経済学の論文輪読＋ディスカッション。月1回開催、レポート提出なし。",
    activity_days: "第3水曜日",
    member_count: 35,
    freshmen_ratio: 42,
    contact_instagram: null,
    contact_x: "https://x.com/keio_econ_club",
    contact_line: null,
    ...assets("kc-academic-econ"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(15),
    name: "慶應プログラミング研究会",
    category: "academic",
    official_type: "official",
    activity_frequency: "weekly_1",
    annual_fee_yen: 0,
    view_count: 310,
    inquiry_count: 40,
    tags: ["beginner_ok", "yurui", "low_fee", "kenser_ok"],
    description: "Webアプリ・AI・競プロなど自由テーマで活動。年会費無料。",
    activity_days: "土曜日",
    member_count: 50,
    freshmen_ratio: 50,
    contact_instagram: "https://instagram.com/keio_prog",
    contact_x: "https://x.com/keio_prog",
    contact_line: null,
    ...assets("kc-academic-prog"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(16),
    name: "AI読書会",
    category: "academic",
    official_type: "unofficial",
    activity_frequency: "monthly",
    annual_fee_yen: 0,
    view_count: 110,
    inquiry_count: 15,
    tags: ["yurui", "low_fee", "kenser_ok"],
    description: "AI/ML関連書籍の読書会。月1回オンライン開催、参加費無料。",
    activity_days: "第2土曜日",
    member_count: 20,
    freshmen_ratio: 65,
    contact_instagram: null,
    contact_x: "https://x.com/ai_dokushokai",
    contact_line: null,
    ...assets("kc-academic-ai"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(17),
    name: "関東大学法律研究連盟",
    category: "academic",
    official_type: "intercollegiate",
    activity_frequency: "monthly",
    annual_fee_yen: 5000,
    view_count: 90,
    inquiry_count: 8,
    tags: ["gachi", "kenser_ok", "once_a_week"],
    description: "東大・早慶・中央など関東主要大学合同。司法試験対策＋判例研究。",
    activity_days: "第1日曜日",
    member_count: 60,
    freshmen_ratio: 32,
    contact_instagram: null,
    contact_x: "https://x.com/kanto_law",
    contact_line: "https://line.me/R/ti/p/kanto_law",
    ...assets("kc-academic-law"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },

  // === 国際交流 4 (official 1 + unofficial 2 + intercollegiate 1) ===
  {
    id: id(18),
    name: "慶應国際交流委員会",
    category: "international",
    official_type: "official",
    activity_frequency: "weekly_1",
    annual_fee_yen: 5000,
    view_count: 250,
    inquiry_count: 30,
    tags: ["beginner_ok", "women_many", "kenser_ok"],
    description: "留学生との交流イベント企画・運営。語学不問、英会話練習機会あり。",
    activity_days: "水曜日",
    member_count: 55,
    freshmen_ratio: 45,
    contact_instagram: "https://instagram.com/keio_intl",
    contact_x: null,
    contact_line: null,
    ...assets("kc-intl-keio"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(19),
    name: "三田英会話カフェ",
    category: "international",
    official_type: "unofficial",
    activity_frequency: "weekly_1",
    annual_fee_yen: 3000,
    view_count: 170,
    inquiry_count: 22,
    tags: ["beginner_ok", "yurui", "low_fee"],
    description: "毎週金曜夜、三田カフェで英会話。レベル別グループ分けでビギナー歓迎。",
    activity_days: "金曜日",
    member_count: 28,
    freshmen_ratio: 60,
    contact_instagram: "https://instagram.com/mita_english_cafe",
    contact_x: null,
    contact_line: null,
    ...assets("kc-intl-eng"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(20),
    name: "韓国文化研究会",
    category: "international",
    official_type: "unofficial",
    activity_frequency: "weekly_1",
    annual_fee_yen: 2000,
    view_count: 200,
    inquiry_count: 26,
    tags: ["yurui", "low_fee", "women_many"],
    description: "K-POP・韓国語・韓国料理を楽しむゆるい研究会。週1回オンライン＋オフライン。",
    activity_days: "木曜日",
    member_count: 35,
    freshmen_ratio: 58,
    contact_instagram: "https://instagram.com/keio_korea",
    contact_x: null,
    contact_line: null,
    ...assets("kc-intl-korea"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(21),
    name: "在京中国学生連盟慶應支部",
    category: "international",
    official_type: "intercollegiate",
    activity_frequency: "monthly",
    annual_fee_yen: 3000,
    view_count: 80,
    inquiry_count: 7,
    tags: ["yurui", "kenser_ok", "low_fee"],
    description: "在京中国人留学生＋日本人学生の交流。月1回、文化イベント中心。",
    activity_days: "第4土曜日",
    member_count: 65,
    freshmen_ratio: 38,
    contact_instagram: null,
    contact_x: "https://x.com/keio_china",
    contact_line: "https://line.me/R/ti/p/keio_china",
    ...assets("kc-intl-china"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },

  // === イベント・企画 3 (official 1 + unofficial 2) ===
  {
    id: id(22),
    name: "慶應三田祭実行委員会",
    category: "event",
    official_type: "official",
    activity_frequency: "weekly_2_3",
    annual_fee_yen: 0,
    view_count: 340,
    inquiry_count: 28,
    tags: ["gachi", "has_camp", "kenser_ok"],
    description: "11月の三田祭を運営する公認実行委員会。広報・企画・財務など分野多数。",
    activity_days: "火・木・土",
    member_count: 75,
    freshmen_ratio: 40,
    contact_instagram: "https://instagram.com/keio_mita_fes",
    contact_x: "https://x.com/keio_mita_fes",
    contact_line: null,
    ...assets("kc-event-mita"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(23),
    name: "三田パーティーサークル",
    category: "event",
    official_type: "unofficial",
    activity_frequency: "monthly",
    annual_fee_yen: 10000,
    view_count: 140,
    inquiry_count: 16,
    tags: ["yurui", "women_many", "kenser_ok"],
    description: "月1回の三田周辺でカジュアルなパーティー。気軽な交流目的。",
    activity_days: "最終金曜日",
    member_count: 40,
    freshmen_ratio: 55,
    contact_instagram: "https://instagram.com/mita_party",
    contact_x: null,
    contact_line: null,
    ...assets("kc-event-party"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(24),
    name: "慶應映画鑑賞会",
    category: "event",
    official_type: "unofficial",
    activity_frequency: "monthly",
    annual_fee_yen: 1000,
    view_count: 100,
    inquiry_count: 12,
    tags: ["yurui", "low_fee", "kenser_ok"],
    description: "月1回の映画鑑賞＋アフタートーク。ジャンル不問、洋画・邦画・アニメ。",
    activity_days: "第2日曜日",
    member_count: 24,
    freshmen_ratio: 50,
    contact_instagram: "https://instagram.com/keio_movie",
    contact_x: null,
    contact_line: null,
    ...assets("kc-event-movie"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },

  // === ボランティア 3 (official 2 + unofficial 1) ===
  {
    id: id(25),
    name: "慶應ボランティアセンター",
    category: "volunteer",
    official_type: "official",
    activity_frequency: "weekly_1",
    annual_fee_yen: 0,
    view_count: 190,
    inquiry_count: 24,
    tags: ["beginner_ok", "women_many", "low_fee"],
    description: "地域ボランティア活動の窓口。災害支援・福祉・環境など多分野。",
    activity_days: "土曜日",
    member_count: 48,
    freshmen_ratio: 45,
    contact_instagram: "https://instagram.com/keio_volunteer",
    contact_x: "https://x.com/keio_volunteer",
    contact_line: null,
    ...assets("kc-vol-center"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(26),
    name: "慶應スタディーサポート",
    category: "volunteer",
    official_type: "official",
    activity_frequency: "weekly_1",
    annual_fee_yen: 2000,
    view_count: 120,
    inquiry_count: 14,
    tags: ["beginner_ok", "yurui", "low_fee"],
    description: "地域の小中学生向け学習支援ボランティア。週1回、無償活動。",
    activity_days: "水曜日",
    member_count: 32,
    freshmen_ratio: 50,
    contact_instagram: "https://instagram.com/keio_study_support",
    contact_x: null,
    contact_line: "https://line.me/R/ti/p/keio_study",
    ...assets("kc-vol-study"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(27),
    name: "子ども食堂応援サークル",
    category: "volunteer",
    official_type: "unofficial",
    activity_frequency: "monthly",
    annual_fee_yen: 0,
    view_count: 85,
    inquiry_count: 9,
    tags: ["yurui", "women_many", "low_fee"],
    description: "三田地域の子ども食堂を支援。月1回、調理＋見守り活動。",
    activity_days: "第1土曜日",
    member_count: 16,
    freshmen_ratio: 65,
    contact_instagram: "https://instagram.com/mita_kodomo",
    contact_x: null,
    contact_line: null,
    ...assets("kc-vol-kodomo"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },

  // === メディア 3 (official 1 + other 2) ===
  {
    id: id(28),
    name: "慶應塾生新聞会",
    category: "media",
    official_type: "official",
    activity_frequency: "weekly_2_3",
    annual_fee_yen: 5000,
    view_count: 260,
    inquiry_count: 20,
    tags: ["gachi", "kenser_ok", "has_camp"],
    description: "学内最大の学生新聞。取材・編集・写真・Web、各部門で活動。",
    activity_days: "月・水・金",
    member_count: 58,
    freshmen_ratio: 38,
    contact_instagram: "https://instagram.com/keio_jukushin",
    contact_x: "https://x.com/keio_jukushin",
    contact_line: null,
    ...assets("kc-media-news"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(29),
    name: "慶應放送研究会 KMSC",
    category: "media",
    official_type: "other",
    activity_frequency: "weekly_1",
    annual_fee_yen: 8000,
    view_count: 230,
    inquiry_count: 22,
    tags: ["gachi", "has_camp", "kenser_ok"],
    description: "ラジオ番組制作・三田祭での生放送。アナウンス・技術・編成の3部門。",
    activity_days: "不定期",
    member_count: 42,
    freshmen_ratio: 40,
    contact_instagram: "https://instagram.com/keio_kmsc",
    contact_x: null,
    contact_line: null,
    ...assets("kc-media-kmsc"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
  {
    id: id(30),
    name: "慶應動画制作部",
    category: "media",
    official_type: "other",
    activity_frequency: "weekly_1",
    annual_fee_yen: 4000,
    view_count: 175,
    inquiry_count: 19,
    tags: ["yurui", "kenser_ok", "low_fee"],
    description: "YouTube・TikTok向け学生動画制作。撮影・編集・企画を全員で。",
    activity_days: "不定期",
    member_count: 28,
    freshmen_ratio: 45,
    contact_instagram: "https://instagram.com/keio_video",
    contact_x: "https://x.com/keio_video",
    contact_line: null,
    ...assets("kc-media-video"),
    owner_id: DUMMY_OWNER,
    status: "approved",
    shinkan_events: NO_EVENTS,
  },
];

/** CircleDetail → CircleSummary 변환 helper (UI 카드용 필드만 추출) */
function toSummary(detail: CircleDetail): CircleSummary {
  const {
    id,
    name,
    category,
    official_type,
    activity_frequency,
    annual_fee_yen,
    cover_image_url,
    view_count,
    inquiry_count,
    tags,
  } = detail;
  return {
    id,
    name,
    category,
    official_type,
    activity_frequency,
    annual_fee_yen,
    cover_image_url,
    view_count,
    inquiry_count,
    tags,
  };
}

/**
 * 인기 단체 N개 — view_count 내림차순 (홈 페이지의 「人気のサークル」 영역)
 * Phase 1.2 T-009 와이어업 시 내부를 Supabase fetch 로 무손실 교체 가능.
 */
export async function getPopularCircles(limit = 6): Promise<CircleSummary[]> {
  return DUMMY_CIRCLES.slice()
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, limit)
    .map(toSummary);
}

/**
 * 최신 단체 N개 — 배열 역순 (등록 순 역순) 으로 신착 6건 반환
 * Phase 1.2 T-009 와이어업 시 내부를 Supabase `.order("created_at", { ascending: false })` 로 무손실 교체 가능.
 */
export async function getRecentCircles(limit = 6): Promise<CircleSummary[]> {
  return DUMMY_CIRCLES.slice().reverse().slice(0, limit).map(toSummary);
}

/**
 * 단건 단체 상세 — id 로 조회 (서클 상세 페이지 T-012)
 */
export async function getCircleById(id: string): Promise<CircleDetail | null> {
  return DUMMY_CIRCLES.find((c) => c.id === id) ?? null;
}

/**
 * 카테고리별 단체 목록 (서클 목록 페이지 T-011)
 */
export async function getCirclesByCategory(category: Category): Promise<CircleSummary[]> {
  return DUMMY_CIRCLES.filter((c) => c.category === category).map(toSummary);
}

/**
 * 검색·필터·페이지네이션 통합 helper — /circles 페이지 (T-011) 가 사용.
 *
 * 정책:
 * - 모든 필터는 AND, 같은 필터 내 다중값은 OR (Postgres `IN`/`OVERLAPS` 와 동일).
 * - q 는 name 의 case-insensitive 부분 매칭 (T-009 와이어업 후 Supabase `ilike` 로 교체).
 * - tags 는 더미 데이터의 tags 배열과 1건 이상 겹치면 매칭 (OR).
 * - fee_max 는 `annual_fee_yen <= feeMax` (T-009 의 `.lte()`).
 * - pageSize 기본 20, page 는 1-indexed.
 */
export interface FilterCirclesOptions {
  q?: string;
  category?: Category;
  frequency?: ActivityFrequency[];
  officialType?: OfficialType[];
  tags?: string[];
  feeMax?: number;
  page?: number;
  pageSize?: number;
}

export interface FilterCirclesResult {
  items: CircleSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function filterCircles(
  options: FilterCirclesOptions = {}
): Promise<FilterCirclesResult> {
  const {
    q,
    category,
    frequency = [],
    officialType = [],
    tags = [],
    feeMax,
    page = 1,
    pageSize = 20,
  } = options;

  const qLower = q?.toLowerCase().trim();
  const filtered = DUMMY_CIRCLES.filter((c) => {
    if (category && c.category !== category) return false;
    if (frequency.length > 0 && !frequency.includes(c.activity_frequency)) return false;
    if (officialType.length > 0 && !officialType.includes(c.official_type)) return false;
    if (tags.length > 0 && !tags.some((t) => c.tags.includes(t))) return false;
    if (feeMax !== undefined && c.annual_fee_yen > feeMax) return false;
    if (qLower && !c.name.toLowerCase().includes(qLower)) return false;
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize).map(toSummary);

  return { items, total, page: safePage, pageSize, totalPages };
}
