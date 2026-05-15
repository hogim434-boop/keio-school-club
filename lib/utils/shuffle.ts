/**
 * Fisher-Yates 셔플 — 입력 배열을 변경하지 않고 새 배열을 반환.
 *
 * 시간 복잡도 O(n), 균등 분포 보장.
 * 사용처: /shuffle 페이지의 swipe deck (사클 30건 무작위 순서).
 */
export function fisherYates<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
