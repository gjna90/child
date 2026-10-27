// 4단계 추천 계산 (명시적 규칙만 사용. AI는 결과 설명에만 씀) — 규칙 문서: docs/07_추천_규칙.md
// 이 파일은 node 테스트와 화면(app) 양쪽에서 쓴다. 화면에는 build-app.js가 export를 지워 끼워 넣는다.
// 값 규칙: 기준별 값은 0~1, 모르면 null. null은 계산에서 빼고 '미확인'으로 표시한다(0으로 바꾸지 않음).

export const WEIGHTS = { '매우 중요': 3, 중요: 2, 참고: 1 };
export const MIN_COVERAGE = 0.5; // 정보 확인 정도가 이보다 낮으면 '정보 부족' 묶음

/** good일 때 1, bad일 때 0, 사이는 직선. good<bad(작을수록 좋음)·good>bad(클수록 좋음) 모두 지원 */
export function linear(x, good, bad) {
  if (x === null || x === undefined || !Number.isFinite(x)) return null;
  if (good === bad) return x === good ? 1 : 0;
  const t = (x - bad) / (good - bad);
  return Math.max(0, Math.min(1, t));
}

/** 비용: 예산의 50% 이하=1, 예산=0.3, 그 사이 직선, 예산 초과=0 (예산 초과는 필수 조건에서 따로 처리) */
export function costValue(monthly, budget) {
  if (monthly === null || monthly === undefined || !budget) return null;
  if (monthly <= budget * 0.5) return 1;
  if (monthly > budget) return 0;
  return 1 - 0.7 * ((monthly - budget * 0.5) / (budget * 0.5));
}

/**
 * 종합 비교 지표
 * @param {{key:string, weight:number, value:number|null}[]} crit
 * @returns {{index:number|null, coverage:number, confirmed:number, total:number}}
 *   index = Σ(가중치×값) ÷ Σ(확인된 기준의 가중치) × 100,  coverage = Σ(확인된 가중치) ÷ Σ(전체 가중치)
 */
export function composite(crit) {
  const total = crit.reduce((a, c) => a + c.weight, 0);
  const known = crit.filter((c) => c.value !== null && c.value !== undefined);
  const confirmed = known.reduce((a, c) => a + c.weight, 0);
  const index = confirmed ? (known.reduce((a, c) => a + c.weight * c.value, 0) / confirmed) * 100 : null;
  return { index: index === null ? null : Math.round(index * 10) / 10, coverage: total ? confirmed / total : 0, confirmed, total };
}

/** 필수 조건 결과 묶기: 불충족 하나라도 → fail, 아니면 미확인 하나라도 → check, 모두 충족 → pass */
export function mustStatus(results) {
  if (results.some((r) => r.value === false)) return 'fail';
  if (results.some((r) => r.value === null || r.value === undefined)) return 'check';
  return 'pass';
}

const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'ko');
const num = (x, d) => (x === null || x === undefined ? d : x);

/**
 * 종합 추천 정렬. items: [{id,name,distance(m|null), crit:[...]}]
 * 확인 정도 50% 미만은 lack 묶음으로 보내 상위에 올리지 않음. 동점: 확인 정도 높은 순 → 거리 가까운 순 → 이름순
 */
export function rankComposite(items) {
  const scored = items.map((it) => ({ ...it, score: composite(it.crit) }));
  const main = scored.filter((x) => x.score.index !== null && x.score.coverage >= MIN_COVERAGE);
  const lack = scored.filter((x) => !(x.score.index !== null && x.score.coverage >= MIN_COVERAGE));
  const cmp = (a, b) => (num(b.score.index, -1) - num(a.score.index, -1)) || (b.score.coverage - a.score.coverage) || (num(a.distance, Infinity) - num(b.distance, Infinity)) || byName(a, b);
  return { main: main.sort(cmp), lack: lack.sort(cmp) };
}

/**
 * 우선순위대로 정렬. order: 기준 키 순서. bins: {키: (값0~1) => 묶음 번호(클수록 좋음)}
 * 1순위 기준의 묶음 → 같은 묶음 안에서 2순위 → … 그 기준이 미확인이면 그 단계에서 순위를 매기지 않고 뒤로(미확인 표시).
 */
export function rankPriority(items, order, bins = {}) {
  const val = (it, k) => it.crit.find((c) => c.key === k)?.value ?? null;
  const bin = (k, v) => (v === null ? null : (bins[k] ? bins[k](v) : Math.round(v * 10)));
  return [...items].sort((a, b) => {
    for (const k of order) {
      const x = bin(k, val(a, k)), y = bin(k, val(b, k));
      if (x === null && y === null) continue;
      if (x === null) return 1;
      if (y === null) return -1;
      if (x !== y) return y - x;
    }
    return (num(a.distance, Infinity) - num(b.distance, Infinity)) || byName(a, b);
  });
}

/**
 * 가족 전체 보기: 모든 아이가 필수 조건을 통과해야 pass. 한 아이라도 fail이면 fail, 아니면 하나라도 check면 check.
 * 종합 지표는 아이들 중 가장 낮은 값으로 정렬(한 아이의 약점이 다른 아이의 장점에 가려지지 않도록).
 */
export function familyStatus(perKid) {
  if (perKid.some((s) => s === 'fail')) return 'fail';
  if (perKid.some((s) => s === 'check')) return 'check';
  return 'pass';
}
