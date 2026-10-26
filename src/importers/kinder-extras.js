// 유치원알리미 추가 공시 항목을 기관 레코드에 붙인다 (이름+주소로 연결)
// - 교직원 수는 '기관 전체' 인원이다. 반별·시간대별 실제 배치가 아니다.
// - 자격 보유 수(…자격수)는 한 사람이 여러 자격을 가질 수 있어 인원으로 더하지 않는다.

import { fact, STATUS, SOURCE_KIND } from '../lib/fact.js';
import { clean, num } from './common.js';

const keyOf = (row) => `${clean(row['유치원명'])}@${clean(row['주소'])}`;

const STAFF_ROLES = ['원장수', '원감수', '수석 교사수', '보직 교사수', '일반 교사수', '특수 교사수', '보건 교사수', '영양 교사수', '기간제교원/강사수', '직원수'];
const TENURE = ['1년미만교사수', '1년이상2년미만교사수', '2년이상4년미만교사수', '4년이상6년미만교사수', '6년이상교사수'];

function index(rows) {
  const m = new Map();
  for (const r of rows ?? []) m.set(keyOf(r), r);
  return m;
}

const cache = new WeakMap();
function indexed(extras) {
  if (!cache.has(extras)) {
    const out = {};
    for (const [item, x] of Object.entries(extras)) out[item] = x.rows ? { idx: index(x.rows), url: x.url, header: x.header } : null;
    cache.set(extras, out);
  }
  return cache.get(extras);
}

export function attachKinderExtras(rec, extras, meta) {
  const ix = indexed(extras);
  const key = `${rec.name}@${rec.address.value}`;
  const asOf = `${meta.timing.slice(0, 4)}년 ${meta.timing[4]}차 공시`;
  const src = (item, name) => ({ kind: SOURCE_KIND.OFFICIAL_DISCLOSURE, name: `유치원알리미 ${name}`, url: ix[item]?.url, readMode: '공식 다운로드 원문' });
  const f = (v, item, name, unit) => fact(v, { unit, source: src(item, name), asOf, checkedAt: meta.checkedAt, status: STATUS.CONFIRMED });

  // 06 교직원 (기관 전체)
  const s = ix['06']?.idx.get(key);
  if (s) {
    const roles = {};
    for (const role of STAFF_ROLES) if (role in s) roles[role.replace(/\s/g, '')] = num(s[role]);
    const teachers = ['수석 교사수', '보직 교사수', '일반 교사수', '특수 교사수'].map((k) => num(s[k]));
    rec.staffWhole = {
      scope: '기관 전체 (반별 배치 아님)',
      roles: f(roles, '06', '직위·자격별 교직원현황', '명'),
      // 담임 가능 교사(수석·보직·일반·특수) 합계. 하나라도 비어 있으면 합계도 미확인
      teacherTotal: f(teachers.some((x) => x === null) ? null : teachers.reduce((a, b) => a + b, 0), '06', '직위·자격별 교직원현황', '명'),
    };
  }
  // 07 근속
  const t = ix['07']?.idx.get(key);
  if (t) {
    const tenure = {};
    for (const k of TENURE) if (k in t) tenure[k] = num(t[k]);
    rec.tenure = f(tenure, '07', '교사 근속연수', '명');
  }
  // 14 급식
  const g = ix['14']?.idx.get(key);
  if (g) rec.meal = f({ 운영방식: clean(g['급식운영방식구분']), 영양교사배치: clean(g['영양교사배치여부']), 위탁업체: clean(g['위탁업체명']) }, '14', '급식운영현황');
  // 19 통학차량
  const b = ix['19']?.idx.get(key);
  if (b) rec.schoolBus = f({ 운영여부: clean(b['차량운영여부']), 운행차량수: num(b['운행차량수']) }, '19', '통학차량현황', '대');
  // 노선·승하차 장소·탑승시간은 공시에 없음 → 기관 확인 필요
  rec.missing = ['반 이름(기관 호칭)', '2027 모집 인원', '프로그램·자연활동', '비용', '운영시간(정규·방과후)', '통학버스 노선·탑승시간', '설명회'].filter((x) => !(rec.missing ?? []).includes(x));
  return rec;
}

/** 직전 공시와 비교해 아산시 내 신규·사라진 기관을 찾는다 (폐원·신설·명칭변경 후보) */
export function compareRounds(prevRows, curRows, prevTiming, curTiming, filter = (a) => /아산시/.test(a ?? '')) {
  if (!prevRows) return { note: '직전 공시를 받지 못해 비교하지 못함' };
  const names = (rows) => new Map(rows.filter((r) => filter(clean(r['주소']))).map((r) => [keyOf(r), r]));
  const p = names(prevRows), c = names(curRows);
  const added = [...c.keys()].filter((k) => !p.has(k));
  const removed = [...p.keys()].filter((k) => !c.has(k));
  return { prev: prevTiming, cur: curTiming, prevCount: p.size, curCount: c.size, added, removed, note: '이름이나 주소가 바뀐 경우도 신규·사라짐으로 보일 수 있어 확인 필요' };
}
