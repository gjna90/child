// 기관 정보의 '한 칸'을 근거와 함께 저장하는 구조.
// 미확인 값은 null로 두고 status로 구분한다. 0원·0명·없음으로 바꾸지 않는다.

export const STATUS = {
  CONFIRMED: '확인됨', // 공식 출처 원문에서 확인
  SNIPPET: '검색 요약만 확인', // 검색 결과 요약·발췌만 봄 (원문 미열람)
  THIRD_PARTY: '제3자 자료', // 민간 정리 사이트 등
  USER: '사용자 입력', // 상담·방문 기록
  UNKNOWN: '미확인',
  CONFLICT: '출처 간 불일치',
  STALE: '과거 자료',
};

export const SOURCE_KIND = {
  OFFICIAL_DISCLOSURE: '공식 공시',
  OFFICIAL_NOTICE: '기관 공식 안내·홍보',
  GOV_GUIDE: '정부·지자체 안내',
  EXPERT: '전문가 일반 의견',
  REVIEW: '개인 경험·후기',
  THIRD_PARTY: '제3자 요약',
  USER: '사용자 입력 기록',
};

/**
 * @param {*} value  값 (모르면 null)
 * @param {object} meta
 * @param {string} [meta.unit]  단위 (명, 학급, 원/월 …)
 * @param {{schoolYear?:number, manAge?:number|null}} [meta.appliesTo]
 * @param {{kind:string, name:string, url?:string, doc?:string, page?:number, readMode?:string}} meta.source
 * @param {string} [meta.asOf]  자료 기준일 또는 공시차수
 * @param {string} meta.checkedAt  확인일 (YYYY-MM-DD)
 * @param {string} meta.status
 */
export function fact(value, meta) {
  const v = value === undefined || value === '' ? null : value;
  return {
    value: v,
    unit: meta.unit ?? null,
    appliesTo: meta.appliesTo ?? null,
    source: meta.source ?? null,
    asOf: meta.asOf ?? null,
    checkedAt: meta.checkedAt ?? null,
    status: v === null ? STATUS.UNKNOWN : meta.status,
    history: [],
  };
}

/**
 * 새 수집값을 기존 값에 반영한다.
 * - 수집 실패(newFact 없음)면 기존 값과 확인일을 그대로 둔다.
 * - 사용자 입력은 자동 수집으로 덮어쓰지 않는다.
 * - 값이 다르면 이전 값을 history에 남긴다.
 */
export function mergeFact(oldFact, newFact) {
  if (!newFact) return oldFact; // 수집 실패: 확인일 갱신 금지
  if (!oldFact) return newFact;
  if (oldFact.status === STATUS.USER && newFact.status !== STATUS.USER) {
    // 사용자 기록은 보존하고, 자동 수집값은 비교용으로만 기록
    return { ...oldFact, history: [...oldFact.history, { ...newFact, history: undefined, note: '자동 수집값(사용자 기록 보존)' }] };
  }
  if (newFact.value === null && oldFact.value !== null) {
    // 새 출처에 값이 없다고 기존 값을 지우지 않는다
    return { ...oldFact, history: [...oldFact.history, { ...newFact, history: undefined, note: '새 자료에 값 없음' }] };
  }
  const same = JSON.stringify(oldFact.value) === JSON.stringify(newFact.value);
  if (same) return { ...newFact, history: oldFact.history };
  return { ...newFact, history: [...oldFact.history, { ...oldFact, history: undefined }] };
}

/** 정보 확인 정도(추천 점수와 별도로 표시) */
export function coverage(facts) {
  const list = facts.filter(Boolean);
  if (!list.length) return { confirmed: 0, total: 0, ratio: 0 };
  const confirmed = list.filter((f) => f.status === STATUS.CONFIRMED || f.status === STATUS.USER).length;
  return { confirmed, total: list.length, ratio: confirmed / list.length };
}
