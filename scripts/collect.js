// 1단계 수집 스크립트
//
// 사용법
//   node scripts/collect.js              # .env 의 인증키로 API 조회 + data/raw 의 내려받은 파일 읽기
//   node scripts/collect.js --offline    # 내려받은 파일만 읽기
//
// 결과: data/roster/<조회일>.json  (기관 명부와 집계)
// 비밀키는 .env 에만 두고 화면(브라우저)이나 공개 저장소에 올리지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import { buildRoster } from '../src/importers/roster.js';
import { describeChildClass } from '../src/lib/age.js';
import { loadBoundaries } from '../src/lib/geo.js';
import { attachKinderExtras, compareRounds } from '../src/importers/kinder-extras.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());

function loadEnv() {
  const f = path.join(ROOT, '.env');
  const env = {};
  if (fs.existsSync(f)) {
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return { ...env, ...process.env };
}

/** 따옴표를 지원하는 간단한 CSV 읽기 */
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ''));
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i]])));
}

async function fetchKinder(env) {
  const key = env.KINDER_API_KEY;
  if (!key) return { skipped: 'KINDER_API_KEY 없음' };
  const sido = env.KINDER_SIDO_CODE ?? '44'; // 충청남도
  const sgg = env.KINDER_SGG_CODE ?? '44200'; // 아산시 (첫 실행 때 응답 건수로 확인)
  const base = 'https://e-childschoolinfo.moe.go.kr/api/notice/basicInfo2.do';
  const url = `${base}?${new URLSearchParams({ key, sidoCode: sido, sggCode: sgg })}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'kinder-app/0.1' } });
    const data = await res.json();
    if (data.status !== 'SUCCESS') return { error: `응답 상태 ${data.status}: ${data.message ?? ''}` };
    return { rows: data.kinderInfo ?? [], url: `${base}?sidoCode=${sido}&sggCode=${sgg}` };
  } catch (e) {
    return { error: `조회 실패: ${e.message}` };
  }
}

/** 유치원알리미 공시자료 일괄 다운로드 (인증키 불필요). 최신 공시차수부터 시도 */
function candidateTimings(now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth() + 1;
  const list = m >= 10 ? [`${y}2`, `${y}1`] : m >= 4 ? [`${y}1`, `${y - 1}2`] : [`${y - 1}2`, `${y - 1}1`];
  return list;
}
// 공시 항목 코드 (일괄 다운로드에서 확인한 것만)
export const BULK_ITEMS = { '05': '일반현황', '06': '직위·자격별 교직원현황', '07': '교사 근속연수', '14': '급식운영현황', '19': '통학차량현황' };

async function fetchBulkItem(sidoCode, sidoName, timing, item) {
  const dir = path.join(ROOT, 'data', 'raw', 'src_kinder');
  fs.mkdirSync(dir, { recursive: true });
  const base = 'https://e-childschoolinfo.moe.go.kr/download/getOpenData.do';
  const q = new URLSearchParams({ combineSidoCode: sidoCode, combineSidoName: sidoName, timingListCode: timing, gongsiListCode: item, ExcelCsv: '3' });
  try {
    const res = await fetch(`${base}?${q}`, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://e-childschoolinfo.moe.go.kr/openData.do' } });
    const text = (await res.text()).replace(/^\uFEFF/, '');
    const data = JSON.parse(text);
    if (!Array.isArray(data.header) || !Array.isArray(data.body) || !data.body.length) return null;
    fs.writeFileSync(path.join(dir, `bulk_${sidoCode}_${timing}_${item}.json`), text);
    const rows = data.body.map((r) => Object.fromEntries(data.header.map((h, i) => [h, r[i]])));
    return { rows, header: data.header, timing, item, url: `${base}?combineSidoCode=${sidoCode}&timingListCode=${timing}&gongsiListCode=${item}` };
  } catch {
    return null; // 수집 실패: 기존 자료와 확인일을 건드리지 않는다
  }
}

/** 유치원알리미 공시자료 일괄 다운로드 (인증키 불필요). 최신 공시차수부터 시도 */
async function fetchKinderBulk(sidoCode = '44', sidoName = '충청남도') {
  for (const timing of candidateTimings()) {
    const main = await fetchBulkItem(sidoCode, sidoName, timing, '05');
    if (!main) continue;
    const extras = {};
    for (const item of ['06', '07', '14', '19']) {
      const r = await fetchBulkItem(sidoCode, sidoName, timing, item);
      extras[item] = r ?? { error: '받지 못함' };
    }
    // 직전 차수 명단(신설·폐원 대조용)
    const prevTiming = timing.endsWith('2') ? `${timing.slice(0, 4)}1` : `${Number(timing.slice(0, 4)) - 1}2`;
    const prev = await fetchBulkItem(sidoCode, sidoName, prevTiming, '05');
    return { ...main, extras, prev };
  }
  return { error: '일괄 다운로드 실패 (모든 공시차수)' };
}

async function fetchDaycare(env) {
  // 어린이집 API 주소는 명세서에서 확인한 값을 .env 에 직접 넣는다(이 코드가 주소를 지어내지 않도록).
  // 예: CHILDCARE_API_URL=https://.../request?key={KEY}&arcode=44200
  const tpl = env.CHILDCARE_API_URL;
  if (!tpl || !env.CHILDCARE_API_KEY) return { skipped: 'CHILDCARE_API_URL 또는 CHILDCARE_API_KEY 없음' };
  const url = tpl.replace('{KEY}', encodeURIComponent(env.CHILDCARE_API_KEY));
  try {
    const res = await fetch(url);
    const text = await res.text();
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      const data = JSON.parse(text);
      return { rows: Array.isArray(data) ? data : data.item ?? data.items ?? data.data ?? [], url: tpl.replace(/key=[^&]*/, 'key=***') };
    }
    // XML 응답: <item> 안의 단순 태그만 읽는다
    const items = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) =>
      Object.fromEntries([...m[1].matchAll(/<([A-Za-z0-9_]+)>([\s\S]*?)<\/\1>/g)].map((x) => [x[1], x[2].replace(/<!\[CDATA\[|\]\]>/g, '').trim()])));
    return { rows: items, url: tpl.replace(/key=[^&{]*/, 'key=***') };
  } catch (e) {
    return { error: `조회 실패: ${e.message}` };
  }
}

/** data/raw 의 내려받은 파일: 파일 이름에 '유치원' 또는 '어린이집'을 넣어 구분 */
function loadRawFiles() {
  const dir = path.join(ROOT, 'data', 'raw');
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) continue;
    const kind = /유치원|kinder/i.test(f) ? '유치원' : /어린이집|daycare|childcare/i.test(f) ? '어린이집' : null;
    if (!kind) { console.warn(`[건너뜀] ${f}: 파일 이름에 '유치원' 또는 '어린이집'을 넣어주세요`); continue; }
    let rows;
    if (f.endsWith('.csv')) rows = parseCsv(fs.readFileSync(p, 'utf8'));
    else if (f.endsWith('.json')) {
      const d = JSON.parse(fs.readFileSync(p, 'utf8'));
      rows = Array.isArray(d) ? d : d.kinderInfo ?? d.rows ?? d.body ?? [];
    } else if (f.endsWith('.xml')) {
      const text = fs.readFileSync(p, 'utf8');
      rows = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) =>
        Object.fromEntries([...m[1].matchAll(/<([A-Za-z0-9_]+)>([\s\S]*?)<\/\1>/g)].map((x) => [x[1], x[2].replace(/<!\[CDATA\[|\]\]>/g, '').trim()])));
    } else { console.warn(`[건너뜀] ${f}: CSV·JSON·XML만 읽습니다 (엑셀은 CSV로 저장해 주세요)`); continue; }
    out.push({ kind, name: `내려받은 파일: ${f}`, url: `file:data/raw/${f}`, rows, readMode: '공식 사이트에서 내려받은 파일' });
  }
  return out;
}

async function main() {
  const env = loadEnv();
  const offline = process.argv.includes('--offline');
  const schoolYear = Number(env.SCHOOL_YEAR ?? 2027);
  const childBirthYear = env.CHILD_BIRTH_YEAR ? Number(env.CHILD_BIRTH_YEAR) : null;
  const child = childBirthYear ? describeChildClass(childBirthYear, schoolYear) : null;

  const sources = loadRawFiles();
  const log = [];
  let kinderBulk = null;
  if (!offline) {
    const b = await fetchKinderBulk();
    log.push({ source: '유치원알리미 공시자료 일괄 다운로드', error: b.error, rows: b.rows?.length, timing: b.timing });
    if (b.rows) {
      sources.push({ kind: '유치원', name: `유치원알리미 일반현황 일괄자료 (${b.timing.slice(0, 4)}년 ${b.timing[4]}차 공시)`, url: b.url, rows: b.rows.map((r) => ({ ...r, 공시차수: b.timing })), readMode: '공식 다운로드 원문' });
      kinderBulk = b;
    }
    const k = await fetchKinder(env);
    log.push({ source: '유치원알리미 API', ...k, rows: k.rows?.length });
    if (k.rows) sources.push({ kind: '유치원', name: '유치원알리미 기본현황 API', url: k.url, rows: k.rows, readMode: 'API 응답 원문' });
    const d = await fetchDaycare(env);
    log.push({ source: '어린이집 API', ...d, rows: d.rows?.length });
    if (d.rows) sources.push({ kind: '어린이집', name: '어린이집 기본정보 API', url: d.url, rows: d.rows, readMode: 'API 응답 원문' });
  }

  const areas = (env.AREAS ?? '배방읍,탕정면').split(',').map((x) => x.trim());
  const boundaries = loadBoundaries(path.join(ROOT, 'data', 'geo', 'asan_admdong_20261001.geojson'));
  const roster = buildRoster(sources, { checkedAt: today, schoolYear, areas, childManAge: child?.manAge ?? null, boundaries });
  roster.fetchLog = log;
  if (kinderBulk) {
    const meta = { checkedAt: today, timing: kinderBulk.timing };
    for (const r of [...roster.included, ...roster.needsCheck, ...roster.excluded]) {
      if (r.kind === '유치원') attachKinderExtras(r, kinderBulk.extras, meta);
    }
    roster.disclosureChanges = compareRounds(kinderBulk.prev?.rows ?? null, kinderBulk.rows, kinderBulk.prev?.timing, kinderBulk.timing);
    for (const [item, x] of Object.entries(kinderBulk.extras)) log.push({ source: `유치원알리미 ${BULK_ITEMS[item]}`, error: x.error, rows: x.rows?.length });
  }
  roster.child = child;
  roster.rosterComplete = sources.some((s) => s.kind === '유치원') && sources.some((s) => s.kind === '어린이집');
  roster.rosterNote = roster.rosterComplete
    ? '유치원·어린이집 공식 명부를 모두 읽음 (폐원·신설은 다음 공시 때 다시 대조)'
    : '공식 명부를 일부만 읽음 — "모든 기관 조사 완료" 아님';

  const outDir = path.join(ROOT, 'data', 'roster');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${today}.json`);
  fs.writeFileSync(out, JSON.stringify(roster, null, 2));

  console.log(`조회일 ${today} · ${schoolYear}학년도 · 지역 ${roster.areas.join('·')}`);
  for (const l of log) console.log(`- ${l.source}: ${l.skipped ?? l.error ?? `${l.rows}건`}`);
  for (const s of roster.perSource) console.log(`- ${s.source}: ${s.rows}건${s.unmappedColumns.length ? ` (처리하지 않은 열 ${s.unmappedColumns.length}개)` : ''}`);
  console.log(roster.counts);
  console.log(roster.rosterNote);
  console.log(`저장: ${path.relative(ROOT, out)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
