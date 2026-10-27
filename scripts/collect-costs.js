// 유치원알리미 '비용·회계 > 교육·보육 비용' 공시 수집 (인증키 필요 없음)
//   node scripts/collect-costs.js
// 유치원마다 교육과정·방과후 과정 학부모 부담금(만3·4·5세)과 특성화 활동비(프로그램·업체·횟수·월 부담금)를 읽어
// data/costs/<조회일>.json 에 저장한다. 원본 HTML은 data/raw/costs/ (저장소에 올리지 않음)
// 공시 규칙: 0원 = 운영하지만 부담금 없음, '-' = 그 연령 과정을 운영하지 않음 → null 로 저장(0으로 바꾸지 않음)
// 한 곳이라도 실패하면 그곳은 status: '실패'로 남기고, 이전 파일의 값을 덮어쓰지 않는다.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const URL_COST = 'https://e-childschoolinfo.moe.go.kr/kinderMt/kinderEducateAndCost.do';
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const clean = (s) => decode(s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** '10,000' → 10000, '-'·빈칸 → null */
export function won(s) {
  const t = String(s ?? '').replace(/[,\s원]/g, '');
  if (!t || t === '-') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** h4 제목 뒤 첫 번째 표의 tbody 행들 → [{ th: [...], td: [...] , cells: [...] }] */
function tableAfter(html, title) {
  const i = html.indexOf(title);
  if (i < 0) return null;
  const s = html.indexOf('<tbody', i), e = html.indexOf('</tbody>', s);
  if (s < 0 || e < 0) return null;
  const body = html.slice(s, e);
  return [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => {
    const cells = [...m[1].matchAll(/<(th|td)([^>]*)>([\s\S]*?)<\/\1>/g)].map((c) => ({ tag: c[1], text: clean(c[3]), rowspan: +(c[2].match(/rowspan="(\d+)"/)?.[1] ?? 1) }));
    return cells;
  });
}

/** 교육과정/방과후 과정 비용 표 → { 합계: {m3,m4,m5,cycle}, 수업료: {...}, ... } */
export function parseCostTable(rows) {
  if (!rows) return null;
  const out = {};
  let group = null;
  for (const cells of rows) {
    if (cells.length < 5) continue;
    const ths = cells.filter((c) => c.tag === 'th');
    const tds = cells.filter((c) => c.tag === 'td');
    if (tds.length < 4) continue;
    if (ths.length === 2) group = ths[0].text;
    let label = ths[ths.length - 1]?.text ?? '';
    if (/^합계/.test(label)) { label = '합계'; group = null; } else if (/^소계/.test(label)) label = `${group ?? ''} 소계`.trim();
    const [a, b, c, cyc] = tds.slice(-4).map((x) => x.text);
    out[label] = { m3: won(a), m4: won(b), m5: won(c), cycle: cyc && cyc !== '-' ? cyc : null };
  }
  return Object.keys(out).length ? out : null;
}

/** 특성화 활동비 표 → { 3: { total, programs: [...] }, 4: ..., 5: ... } */
export function parseSpecialTable(rows) {
  if (!rows) return null;
  const out = {};
  let cur = null;
  for (const cells of rows) {
    const head = cells[0];
    if (head?.tag === 'th' && /만\s*(\d)\s*세/.test(head.text)) {
      const age = +head.text.match(/만\s*(\d)/)[1];
      const rest = cells.slice(1).map((c) => c.text);
      cur = out[age] = { count: won(rest[0]), total: won(rest[rest.length - 1]), programs: [] };
      if (rest.length >= 8) cur.programs.push(prog(rest.slice(1, 7)));
      else if (rest.length >= 2) cur.note = rest.slice(1, -1).join(' ') || null; // 프로그램 없음 등
      continue;
    }
    if (cur && cells.length >= 6 && cells.every((c) => c.tag === 'td')) cur.programs.push(prog(cells.slice(0, 6).map((c) => c.text)));
  }
  return Object.keys(out).length ? out : null;
  function prog([area, name, vendor, perWeek, minutes, fee]) {
    return { area: area || null, name: name || null, vendor: vendor || null, perWeek: won(perWeek), minutes: won(minutes), fee: won(fee) };
  }
}

/** 페이지 전체 → 정리값 */
export function parseCostPage(html) {
  const asOf = clean(html).match(/자료기준일\s*:\s*(\d{4}년\s*\d학기)(?:\s*\(([\d.\s]+)\))?/);
  const timing = html.match(/setSelectBoxValue\("select-time",\s*(\d+)\)/)?.[1] ?? null;
  return {
    asOf: asOf ? asOf[1].replace(/\s+/g, ' ') : null,
    asOfDate: asOf?.[2] ? asOf[2].replace(/\s/g, '').replace(/\.$/, '') : null,
    round: timing ? `${timing.slice(0, 4)}년 ${timing.slice(4)}차` : null,
    course: parseCostTable(tableAfter(html, '<h4>교육과정 교육비용')),
    afterSchool: parseCostTable(tableAfter(html, '<h4>방과후 과정 교육비용')),
    special: parseSpecialTable(tableAfter(html, '<h4>특성화 활동비')),
  };
}

/** 만 n세 한 달 공시 부담금 합 (교육과정 + 방과후 + 특성화). 하나라도 모르면 known:false */
export function monthlyFor(c, age) {
  const k = `m${age}`;
  const parts = [
    ['교육과정', c?.course?.합계?.[k]],
    ['방과후', c?.afterSchool?.합계?.[k]],
    ['특성화', c?.special?.[age]?.total ?? (c?.special?.[age] ? 0 : null)],
  ];
  const known = parts.every(([, v]) => v !== null && v !== undefined);
  return { total: parts.reduce((s, [, v]) => s + (v ?? 0), 0), parts: Object.fromEntries(parts), known };
}

async function main() {
  const rdir = path.join(ROOT, 'data', 'roster');
  const rf = fs.readdirSync(rdir).filter((x) => x.endsWith('.json')).sort().pop();
  const R = JSON.parse(fs.readFileSync(path.join(rdir, rf), 'utf8'));
  const kinders = [...R.included, ...R.needsCheck].filter((r) => r.kind === '유치원' && /^kinder:[0-9a-f-]{36}$/.test(r.id));
  const outDir = path.join(ROOT, 'data', 'costs');
  const prevFile = fs.existsSync(outDir) ? fs.readdirSync(outDir).filter((x) => x.endsWith('.json')).sort().pop() : null;
  const prev = prevFile ? JSON.parse(fs.readFileSync(path.join(outDir, prevFile), 'utf8')) : null;
  const rawDir = path.join(ROOT, 'data', 'raw', 'costs');
  fs.mkdirSync(rawDir, { recursive: true });
  const items = {};
  let ok = 0;
  for (const r of kinders) {
    const ittId = r.id.slice('kinder:'.length);
    try {
      const res = await fetch(URL_COST, { method: 'POST', headers: { 'User-Agent': 'Mozilla/5.0 (child-info collector)', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ittId }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      fs.writeFileSync(path.join(rawDir, `${ittId}.html`), html);
      const p = parseCostPage(html);
      if (!p.course && !p.special) throw new Error('비용 표를 찾지 못함 (화면 구조 변경?)');
      items[r.id] = { name: r.name, status: '확인', checkedAt: today, ...p };
      ok++;
    } catch (e) {
      const old = prev?.items?.[r.id];
      items[r.id] = old ? { ...old, status: '이번 조회 실패 — 이전 값 유지', lastError: String(e.message) } : { name: r.name, status: '실패', error: String(e.message) };
    }
    await sleep(300);
  }
  if (!ok) { console.log('모든 조회 실패 — 파일을 바꾸지 않음'); process.exit(1); }
  fs.mkdirSync(outDir, { recursive: true });
  const out = {
    source: '유치원알리미 > 유치원 상세 > 비용·회계 > 교육·보육 비용 (가장 최근 공시)',
    url: URL_COST,
    checkedAt: today,
    rules: '학부모 부담금 = 지원금 제외 고지 금액(실제와 다를 수 있음). 0 = 운영하지만 부담금 없음, null = 해당 연령 과정 운영 안 함(공시 표기 "-")',
    items,
  };
  fs.writeFileSync(path.join(outDir, `${today}.json`), JSON.stringify(out, null, 2));
  console.log(`비용 공시 ${ok}/${kinders.length}곳 → data/costs/${today}.json`);
  for (const [, v] of Object.entries(items)) {
    const m = v.course ? monthlyFor(v, 3) : null;
    console.log(`  ${v.name}: ${v.status}${m ? ` · 만3세 월 ${m.total.toLocaleString('ko-KR')}원 (교육과정 ${m.parts.교육과정 ?? '?'} · 방과후 ${m.parts.방과후 ?? '?'} · 특성화 ${m.parts.특성화 ?? '?'})` : ''} ${v.asOf ?? ''}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
