// 명부 합치기와 점검: 중복·동명 기관·범위 밖·제외·확인 필요를 분류하고 집계한다.

import { nameKey } from './common.js';
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
      included: included.length,
      needsCheck: needsCheck.length,
      excluded: excluded.length,
      outOfArea: outOfArea.length,
    },
    sameName,
    included, needsCheck, excluded, outOfArea,
    // 전체 명부와 대조했는지는 호출하는 쪽에서 판단해 기록한다
    rosterComplete: false,
  };
}
