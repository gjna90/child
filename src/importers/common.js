// 유치원·어린이집 공통 정리 규칙: 조사 범위 판정, 제외 규칙, 이름 정규화

export const DEFAULT_AREAS = ['배방읍', '탕정면'];

const EMPTY = new Set(['', '-', 'null', 'none', 'undefined']);
export function clean(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return EMPTY.has(s.toLowerCase()) ? null : s;
}

/** 숫자 칸: 비어 있으면 null (0으로 바꾸지 않음) */
export function num(v) {
  const s = clean(v);
  if (s === null) return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * 주소로 조사 지역을 판정한다.
 * 도로명주소에 읍·면이 빠진 경우가 있어(예: '아산시 북수로25번길 10'),
 * 읍면을 못 찾으면 '지역 확인 필요'로 남긴다. 임의로 포함·제외하지 않는다.
 */
export function areaOf(address, areas = DEFAULT_AREAS) {
  const a = clean(address) ?? '';
  if (!/아산/.test(a)) return { area: null, inScope: false, note: '아산시 주소 아님' };
  const hit = areas.find((x) => a.includes(x));
  if (hit) return { area: hit, inScope: true, note: null };
  const other = a.match(/(\S+(?:읍|면))\s/);
  if (other) return { area: other[1], inScope: false, note: `조사 지역 밖(${other[1]}) — 인근 지역 추가 시 포함` };
  return { area: null, inScope: null, note: '주소에 읍·면이 없어 지역 확인 필요' };
}

/** 비교용 이름 키 (띄어쓰기·괄호·'어린이집/유치원' 차이 무시) */
export function nameKey(name) {
  return String(name ?? '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, '')
    .replace(/(국공립|시립)/g, '')
    .toLowerCase();
}

/** 어린이집 유형 판정: 가정 제외, 직장 등 이용 제한 표시 */
export function classifyDaycareType(typeName) {
  const t = clean(typeName) ?? '';
  if (/가정/.test(t)) return { officialType: t, exclude: true, excludeReason: '가정어린이집 (조사 대상 제외)', restriction: null };
  if (/직장/.test(t)) return { officialType: t, exclude: false, excludeReason: null, restriction: '직장어린이집 — 이용 자격 제한, 이용 가능 여부 별도 확인' };
  if (!t) return { officialType: null, exclude: false, excludeReason: null, restriction: null, needsCheck: '유형 미확인' };
  return { officialType: t, exclude: false, excludeReason: null, restriction: null };
}

/** 운영 상태 판정 */
export function classifyStatus(statusName) {
  const s = clean(statusName);
  if (s === null) return { status: null, exclude: false, needsCheck: '운영 상태 미확인' };
  if (/폐지|폐원|폐쇄/.test(s)) return { status: s, exclude: true, excludeReason: `운영 상태: ${s}` };
  if (/휴지|휴원|휴업|미운영/.test(s)) return { status: s, exclude: false, needsCheck: `운영 상태: ${s} — 확인 필요` };
  return { status: s, exclude: false };
}
