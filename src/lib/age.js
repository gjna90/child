// 연령반 판별
//
// 핵심 원칙
// - 유치원·어린이집의 공식 공시는 '만 연령반'(만3세반 등)으로 집계한다.
// - 학년도 기준 만 연령반 = 학년도 - 출생연도 - 1
//   예) 2027학년도: 2023년생 = 만3세반, 2022년생 = 만4세반, 2021년생 = 만5세반
// - 생활에서 쓰는 '5세반'(옛 세는나이 표기)은 학년도 - 출생연도 + 1 = 5 → 2023년생 = 만3세반이다.
// - 그런데 2023년 '만 나이 통일' 이후 '5세반'을 만5세반 뜻으로 쓰는 기관도 있을 수 있다.
//   그래서 숫자만 있는 반 이름은 두 해석을 모두 남기고, 출생연도나 같은 기관의 다른 반 이름으로만 확정한다.

export const KINDER_AGES = [3, 4, 5]; // 유치원 공시 연령
export const DAYCARE_AGES = [0, 1, 2, 3, 4, 5]; // 어린이집 공시 연령

/** 학년도 기준 만 연령반 */
export function manAgeClass(birthYear, schoolYear) {
  return schoolYear - birthYear - 1;
}

/** 만 연령반 → 대상 출생연도 */
export function birthYearForManAge(manAge, schoolYear) {
  return schoolYear - manAge - 1;
}

/** 옛 세는나이(연나이+1) 표기 → 만 연령반 */
export function countingAgeToManAge(countingAge) {
  return countingAge - 2;
}

/**
 * 아이 출생연도로 해당 학년도에 들어갈 반을 설명한다.
 * @returns {{manAge:number, birthYear:number, schoolYear:number, label:string, countingLabel:string, inKinderRange:boolean, inDaycareRange:boolean}}
 */
export function describeChildClass(birthYear, schoolYear) {
  const manAge = manAgeClass(birthYear, schoolYear);
  return {
    manAge,
    birthYear,
    schoolYear,
    label: `만${manAge}세반`,
    countingLabel: `${manAge + 2}세반(옛 세는나이 표기)`,
    inKinderRange: KINDER_AGES.includes(manAge),
    inDaycareRange: DAYCARE_AGES.includes(manAge),
  };
}

const RE_BIRTH = /(20\d{2})\s*년?\s*생/g;
const RE_MAN = /만\s*(\d)\s*세/g;
const RE_BARE = /(?<!만\s*)(\d)\s*세/g;

/**
 * 기관이 쓰는 반 이름을 해석한다.
 * @param {string} name  예) '5세반', '만4세 해님반', '7세(2021년생)', '혼합반(만3~5세)'
 * @param {number} schoolYear  모집 학년도
 * @param {{siblingNames?: string[]}} [ctx]  같은 기관의 다른 반 이름(표기 관례 추정용)
 * @returns {{
 *   name:string, mixed:boolean,
 *   manAges:number[],          // 확정된 만 연령(확정 못하면 빈 배열)
 *   birthYears:number[],       // 확정된 대상 출생연도
 *   candidates:{basis:string, manAges:number[], birthYears:number[]}[], // 가능한 해석
 *   status:'확인됨'|'대상 여부 확인 필요',
 *   basis:string
 * }}
 */
export function interpretClassName(name, schoolYear, ctx = {}) {
  const text = String(name ?? '');
  const mixed = /혼합/.test(text) || /\d\s*[~\-]\s*\d\s*세/.test(text);
  const result = { name: text, mixed, manAges: [], birthYears: [], candidates: [], status: '대상 여부 확인 필요', basis: '' };

  // 1) 출생연도가 적혀 있으면 가장 확실하다.
  const births = [...text.matchAll(RE_BIRTH)].map((m) => Number(m[1]));
  if (births.length) {
    const ages = births.map((b) => manAgeClass(b, schoolYear));
    return { ...result, manAges: ages, birthYears: births, candidates: [{ basis: '출생연도 표기', manAges: ages, birthYears: births }], status: '확인됨', basis: '반 이름에 출생연도 표기' };
  }

  // 2) '만N세'가 적혀 있으면 만 연령으로 확정. '만3~5세' 같은 범위도 처리.
  const range = text.match(/만\s*(\d)\s*[~\-]\s*(\d)\s*세/);
  if (range) {
    const ages = [];
    for (let a = Number(range[1]); a <= Number(range[2]); a++) ages.push(a);
    const by = ages.map((a) => birthYearForManAge(a, schoolYear));
    return { ...result, mixed: true, manAges: ages, birthYears: by, candidates: [{ basis: '만 연령 범위 표기', manAges: ages, birthYears: by }], status: '확인됨', basis: '반 이름에 만 연령 범위 표기' };
  }
  const manMatches = [...text.matchAll(RE_MAN)].map((m) => Number(m[1]));
  if (manMatches.length) {
    const by = manMatches.map((a) => birthYearForManAge(a, schoolYear));
    return { ...result, manAges: manMatches, birthYears: by, candidates: [{ basis: '만 연령 표기', manAges: manMatches, birthYears: by }], status: '확인됨', basis: '반 이름에 만 연령 표기' };
  }

  // 3) 숫자만 있는 'N세반' — 두 해석을 모두 남긴다.
  const bare = [...text.matchAll(RE_BARE)].map((m) => Number(m[1]));
  if (!bare.length) {
    return { ...result, basis: '반 이름에서 연령을 찾지 못함' };
  }
  const asCounting = bare.map(countingAgeToManAge);
  const asMan = bare;
  const valid = (ages) => ages.every((a) => a >= 0 && a <= 5);
  if (valid(asCounting)) result.candidates.push({ basis: '옛 세는나이 표기로 볼 때', manAges: asCounting, birthYears: asCounting.map((a) => birthYearForManAge(a, schoolYear)) });
  if (valid(asMan)) result.candidates.push({ basis: '만 나이 표기로 볼 때', manAges: asMan, birthYears: asMan.map((a) => birthYearForManAge(a, schoolYear)) });

  // 해석이 하나뿐이면(예: 6세반·7세반은 만6·7세반이 존재하지 않음) 확정
  if (result.candidates.length === 1) {
    const c = result.candidates[0];
    return { ...result, manAges: c.manAges, birthYears: c.birthYears, status: '확인됨', basis: `${c.basis}만 가능 (만 0~5세 범위)` };
  }

  // 같은 기관의 다른 반 이름으로 표기 관례를 추정 — 6·7세반이 있으면 세는나이 관례
  const siblings = (ctx.siblingNames ?? []).filter((n) => n !== text);
  const siblingCounting = siblings.some((n) => /(?<!만\s*)[67]\s*세/.test(n));
  if (siblingCounting) {
    const c = result.candidates.find((x) => x.basis.startsWith('옛 세는나이'));
    return { ...result, manAges: c.manAges, birthYears: c.birthYears, status: '대상 여부 확인 필요', basis: '같은 기관에 6·7세반이 있어 세는나이 표기로 추정 — 출생연도 확인 필요' };
  }
  return { ...result, basis: '숫자만 있는 반 이름이라 세는나이·만 나이 두 해석이 가능 — 출생연도 확인 필요' };
}

/**
 * 기관이 '유아반(만3세 이상, 생활 표현으로 5세 이상반)'을 운영하는지와
 * 특정 아이가 지원할 반이 있는지를 따로 판단한다.
 * @param {{ageClasses: {manAge:number|null, mixedAges?:number[], classCount:number|null, status?:string}[]}} inst
 * @param {number|null} childManAge
 */
export function eligibility(inst, childManAge = null) {
  const classes = inst.ageClasses ?? [];
  const covers = (c, age) => c.manAge === age || (c.mixedAges ?? []).includes(age);
  const known = (c) => c.classCount !== null && c.classCount !== undefined;

  const preschoolAges = [3, 4, 5];
  const hasPreschool = classes.some((c) => known(c) && c.classCount > 0 && preschoolAges.some((a) => covers(c, a)));
  const allUnknown = classes.length === 0 || classes.every((c) => !known(c));

  let hasPreschoolClass;
  if (hasPreschool) hasPreschoolClass = '있음';
  else if (allUnknown) hasPreschoolClass = '미확인';
  else hasPreschoolClass = '없음';

  let childClass = '미확인';
  if (childManAge !== null) {
    const mine = classes.filter((c) => covers(c, childManAge));
    const exact = mine.filter((c) => c.manAge === childManAge && known(c) && c.classCount > 0);
    const mixedOnly = mine.filter((c) => c.manAge === null && known(c) && c.classCount > 0);
    if (exact.length) childClass = '현재 운영 중';
    else if (mixedOnly.length) childClass = '혼합연령반만 있음(우리 아이 연령 포함 여부 확인 필요)';
    else if (mine.length && mine.every((c) => known(c) && c.classCount === 0)) childClass = '현재 공시상 없음(다음 학년도 개설 여부 확인 필요)';
    else if (!allUnknown) childClass = '현재 공시상 없음(다음 학년도 개설 여부 확인 필요)';
  }
  return { hasPreschoolClass, childClass };
}
