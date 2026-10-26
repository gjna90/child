// 명부 합치기와 점검: 중복·동명 기관·범위 밖·제외·확인 필요를 분류하고 집계한다.

import { nameKey } from './common.js';
import { STATUS } from '../lib/fact.js';
import { districtOf } from '../lib/geo.js';
import { eligibility } from '../lib/age.js';
import { normalizeKinder, knownColumns as kinderCols } from './kinder.js';
import { normalizeDaycare, knownColumns as daycareCols } from './daycare.js';

export function unmappedColumns(rows, known) {
  const seen = new Set();
  for (const r of rows) for (const k of Object.keys(r)) if (!known.has(k)) seen.add(k);
  return [...seen].sort();
}

/**
 * @param {{kind:'유치원'|'어린이집', name:string, url:string, rows:object[], readMode:string, asOf?:string}[]} sources
 * @param {{checkedAt:string, areas?:string[], schoolYear:number, childManAge?:number|null}} opt
 */
export function buildRoster(sources, opt) {
  const perSource = [];
  const all = [];
  for (const s of sources) {
    const norm = s.kind === '유치원' ? normalizeKinder : normalizeDaycare;
    const known = s.kind === '유치원' ? kinderCols() : daycareCols();
    const recs = s.rows.map((r) => norm(r, { checkedAt: opt.checkedAt, sourceUrl: s.url, sourceName: s.name, readMode: s.readMode, areas: opt.areas, asOf: s.asOf }));
    perSource.push({ source: s.name, url: s.url, kind: s.kind, rows: s.rows.length, unmappedColumns: unmappedColumns(s.rows, known) });
    all.push(...recs);
  }

  // 1) 같은 공식 식별자 중복 제거 (페이지 중복 등)
  const byId = new Map();
  const duplicates = [];
  for (const r of all) {
    if (byId.has(r.id)) duplicates.push(r.id); else byId.set(r.id, r);
  }

  // 1-1) 출처가 달라 식별자 모양이 다른 같은 기관 합치기
  //      (API: kinder:<유치원코드> / 일괄자료: kinder:<이름>@<주소>)
  const merges = mergeAcrossSources(byId);

  // 1-2) 최신 공시에 없는 기관(예전 공시차수에만 남은 기관) 표시 — 운영 중으로 단정하지 않음
  markStaleRounds([...byId.values()]);

  // 좌표가 있으면 행정경계로 지역 판정 (주소에 읍·면이 빠진 경우가 많음)
  if (opt.boundaries) {
    const areas = opt.areas ?? [];
    for (const r of byId.values()) {
      const d = districtOf(r.location?.lat, r.location?.lng, opt.boundaries);
      if (!d) continue;
      const addrArea = r.area;
      r.flags = r.flags.filter((f) => !/지역 확인 필요/.test(f));
      r.district = d;
      r.area = d;
      r.areaBasis = '공시 좌표 + 행정동 경계';
      r.inScope = areas.includes(d);
      if (addrArea && addrArea !== d && areas.includes(addrArea) !== areas.includes(d)) r.flags.push(`주소 표기(${addrArea})와 좌표 위치(${d})가 다름 — 확인 필요`);
    }
  }
  const unique = [...byId.values()];

  // 2) 같은 이름의 서로 다른 기관 경고 (합치지 않음)
  const byName = new Map();
  for (const r of unique) {
    const k = nameKey(r.name);
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(r);
  }
  const sameName = [];
  for (const [k, list] of byName) {
    if (list.length > 1) {
      sameName.push({ name: list[0].name, ids: list.map((x) => x.id), addresses: list.map((x) => x.address.value) });
      // 따로 저장되므로 섞이지 않는다. 화면에서 주소를 함께 보여주라는 참고 메모
      for (const r of list) (r.notes ??= []).push(`같은 이름의 다른 기관 ${list.length - 1}곳 있음 — 주소로 구분`);
    }
  }

  // 3) 분류
  const included = [], excluded = [], needsCheck = [], outOfArea = [];
  for (const r of unique) {
    r.eligibility = eligibility(r, opt.childManAge ?? null);
    if (r.exclude) { excluded.push(r); continue; }
    if (r.inScope === false) { outOfArea.push(r); continue; }
    if (r.eligibility.hasPreschoolClass === '없음') { r.excludeReason = '유아반(만3세 이상, 생활 표현 5세 이상반) 없음'; excluded.push(r); continue; }
    if (r.inScope === null || r.eligibility.hasPreschoolClass === '미확인' || r.flags.length) needsCheck.push(r);
    else included.push(r);
  }

  return {
    checkedAt: opt.checkedAt,
    schoolYear: opt.schoolYear,
    areas: opt.areas,
    perSource,
    counts: {
      fetched: all.length,
      unique: unique.length,
      duplicatesRemoved: duplicates.length,
      mergedAcrossSources: merges.length,
      included: included.length,
      needsCheck: needsCheck.length,
      excluded: excluded.length,
      outOfArea: outOfArea.length,
    },
    sameName,
    merges,
    included, needsCheck, excluded, outOfArea,
    // 전체 명부와 대조했는지는 호출하는 쪽에서 판단해 기록한다
    rosterComplete: false,
  };
}

// ── 출처 간 합치기 ──────────────────────────────────────────────

const squash = (x) => String(x ?? '').replace(/\s+/g, '');
/** 같은 기관 판정 키: 종류 + 이름 + 주소 (띄어쓰기만 무시, 그 밖의 차이는 다른 기관으로 본다) */
export function matchKey(r) {
  const addr = r.address?.value;
  if (!r.name || !addr) return null;
  return `${r.kind}|${squash(r.name)}|${squash(addr)}`;
}

const isFact = (x) => x && typeof x === 'object' && 'value' in x && 'status' in x && 'history' in x;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * primary 를 기준으로 secondary 의 값을 합친다.
 * - primary 가 비어 있으면(null) secondary 값으로 채운다.
 * - 둘 다 값이 있고 다르면 primary 값을 두고 secondary 값을 history 에 남긴다.
 *   같은 공시차수인데 다르면 '출처 간 불일치'로 표시한다.
 */
function mergeInto(primary, secondary) {
  const sameRound = primary.disclosureRound && primary.disclosureRound === secondary.disclosureRound;
  for (const [k, b] of Object.entries(secondary)) {
    const a = primary[k];
    if (!isFact(b)) continue;
    if (!isFact(a)) { primary[k] = b; continue; }
    if (a.value === null) { if (b.value !== null) primary[k] = { ...b, history: [...a.history, ...b.history] }; continue; }
    if (b.value === null || same(a.value, b.value)) continue;
    primary[k] = { ...a, status: sameRound ? STATUS.CONFLICT : a.status, history: [...a.history, { ...b, history: undefined, note: '다른 출처 값' }] };
  }
  // 반 구성: 칸마다 비어 있는 것만 채운다
  for (const c of primary.ageClasses ?? []) {
    const o = (secondary.ageClasses ?? []).find((x) => x.manAge === c.manAge && !!x.mixedAges === !!c.mixedAges);
    if (!o) continue;
    for (const f of ['classCount', 'enrolled', 'capacity']) if (c[f] === null && o[f] !== null) c[f] = o[f];
  }
  for (const o of secondary.ageClasses ?? []) {
    if (!(primary.ageClasses ?? []).some((c) => c.manAge === o.manAge && !!c.mixedAges === !!o.mixedAges)) (primary.ageClasses ??= []).push(o);
  }
  if (primary.location && secondary.location) {
    if (primary.location.lat === null) primary.location.lat = secondary.location.lat;
    if (primary.location.lng === null) primary.location.lng = secondary.location.lng;
  }
  for (const k of ['edu', 'subEdu']) if (primary.office && !primary.office[k] && secondary.office?.[k]) primary.office[k] = secondary.office[k];
  primary.notes = [...new Set([...(primary.notes ?? []), ...(secondary.notes ?? [])])];
  primary.flags = [...new Set([...(primary.flags ?? []), ...(secondary.flags ?? [])])];
}

/**
 * 같은 이름+주소인데 한쪽만 공식 코드가 있으면 하나로 합치고 코드를 붙인다.
 * 코드가 서로 다른 두 기관은 합치지 않는다(같은 이름 경고에서 다룸).
 * @param {Map<string, object>} byId  (제자리에서 고침)
 */
export function mergeAcrossSources(byId) {
  const groups = new Map();
  for (const r of byId.values()) {
    const k = matchKey(r);
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const merges = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const codes = [...new Set(list.map((r) => r.officialId).filter(Boolean))];
    if (codes.length !== 1) continue; // 코드 없음끼리 또는 코드가 둘 이상 → 합치지 않음
    const coded = list.find((r) => r.officialId === codes[0]);
    const others = list.filter((r) => r !== coded && !r.officialId);
    if (!others.length) continue;
    // 기준: 공시차수가 더 최근인 쪽, 같으면 코드가 있는 쪽
    const ordered = [coded, ...others].sort((a, b) => String(b.disclosureRound ?? '').localeCompare(String(a.disclosureRound ?? '')));
    const primary = ordered.find((r) => r.disclosureRound === ordered[0].disclosureRound && r === coded) ?? ordered[0];
    for (const r of ordered) if (r !== primary) mergeInto(primary, r);
    const fromIds = list.map((r) => r.id);
    for (const id of fromIds) byId.delete(id);
    primary.id = `${primary.kind === '유치원' ? 'kinder' : 'daycare'}:${codes[0]}`;
    primary.officialId = codes[0];
    primary.idBasis = '공식 코드 (이름+주소로 다른 출처 자료와 연결)';
    primary.mergedFrom = fromIds;
    primary.sourceNames = [...new Set(list.flatMap((r) => r.sourceNames ?? []))];
    byId.set(primary.id, primary);
    merges.push({ id: primary.id, name: primary.name, from: fromIds });
  }
  return merges;
}

/** 같은 종류 안에서 가장 최근 공시차수보다 오래된 기관에 확인 필요 표시 */
export function markStaleRounds(records) {
  for (const kind of new Set(records.map((r) => r.kind))) {
    const list = records.filter((r) => r.kind === kind && r.disclosureRound);
    const latest = list.map((r) => String(r.disclosureRound)).sort().pop();
    if (!latest) continue;
    for (const r of list) {
      if (String(r.disclosureRound) >= latest) continue;
      r.staleRound = { last: r.disclosureRound, latest };
      r.flags.push(`최신 공시(${latest})에 없음 — 마지막 공시 ${r.disclosureRound}, 휴원·폐원·통폐합 확인 필요`);
    }
  }
}
