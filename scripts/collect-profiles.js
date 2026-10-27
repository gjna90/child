// 유치원 교육 특징 수집: 유치원알리미 '연간 교육과정 편성 계획안(필수)' 공시 파일 (인증키 필요 없음)
//   node scripts/collect-profiles.js            # 내려받기 + 글자 뽑기 + 분석
//   node scripts/collect-profiles.js --offline  # 이미 받은 파일로 분석만 다시
// 모든 유치원이 의무로 올리는 '교육과정 운영계획' 문서에서 교육방침·특색교육·역점교육·활동 빈도를 뽑고,
// 교육 방향(자연·바깥놀이, 놀이·프로젝트 등)을 자동 분류한다(src/lib/profile.js).
// 원본 파일·전체 글자는 data/raw/profiles/ (저장소에 올리지 않음), 정리값은 data/profiles/<조회일>.json
// 문서 안의 문장은 자료로만 읽는다(지시로 따르지 않음).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { analyzePlan } from '../src/lib/profile.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BASE = 'https://e-childschoolinfo.moe.go.kr';
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
const UA = 'Mozilla/5.0 (child-info collector)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OFFLINE = process.argv.includes('--offline');
const RAW = path.join(ROOT, 'data', 'raw', 'profiles');

/** 교육과정 탭 HTML → 계획안 파일 목록 [{name, type, ref, fileId, size, date}] */
export function parsePlanFiles(html) {
  const i = html.indexOf('<h4>연간 교육과정 편성 계획안');
  if (i < 0) return [];
  const j = html.indexOf('</table>', i);
  const seg = html.slice(i, j);
  return [...seg.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => {
    const d = m[1].match(/fn_downLoad\('(\w+)',\s*'([^']+)',\s*'(\d+)'\)/);
    if (!d) return null;
    const a = m[1].match(/class="file[^"]*"[^>]*>([\s\S]*?)<\/a>/);
    const name = a ? a[1].replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>?/g, '').replace(/\s+/g, ' ').trim() || null : null;
    const tds = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1].replace(/<[^>]+>/g, '').trim());
    return { name, type: d[1], ref: d[2], fileId: d[3], size: tds[2] ?? null, date: tds[3] ?? null };
  }).filter(Boolean);
}

function toText(file) {
  const head = fs.readFileSync(file).subarray(0, 8);
  const out = file + '.txt';
  if (head.subarray(0, 4).toString() === '%PDF') execFileSync('pdftotext', ['-q', file, out]);
  else if (head[0] === 0xd0 && head[1] === 0xcf) fs.writeFileSync(out, execFileSync('python3', ['-I', path.join(ROOT, 'scripts', 'hwp2txt.py'), file], { maxBuffer: 64 << 20 }));
  else if (head.subarray(0, 2).toString() === 'PK') {
    const xml = execFileSync('unzip', ['-p', file, 'Contents/section*.xml'], { maxBuffer: 64 << 20 }).toString();
    fs.writeFileSync(out, xml.replace(/<\/hp:p>/g, '\n').replace(/<[^>]+>/g, ''));
  } else throw new Error('알 수 없는 파일 형식');
  return fs.readFileSync(out, 'utf8');
}

async function download(ittId) {
  const res = await fetch(`${BASE}/kinderMt/kinderEducateAndCare.do`, { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ittId }) });
  if (!res.ok) throw new Error(`교육과정 탭 HTTP ${res.status}`);
  const html = await res.text();
  const timing = html.match(/setSelectBoxValue\("select-time",\s*(\d+)\)/)?.[1] ?? '';
  const files = parsePlanFiles(html);
  if (!files.length) return { files: [], note: '계획안 파일 없음' };
  const f = files[0];
  const q = new URLSearchParams({ ittId, fileTypeCode: f.type, fileRefrnId: f.ref, fileId: f.fileId, timing });
  const r = await fetch(`${BASE}/kinderMt/download.do?${q}`, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`파일 HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const dir = path.join(RAW, ittId); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'plan.bin');
  fs.writeFileSync(file, buf);
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ ...f, timing, downloadedAt: today }, null, 2));
  return { files, file };
}

async function main() {
  const rdir = path.join(ROOT, 'data', 'roster');
  const R = JSON.parse(fs.readFileSync(path.join(rdir, fs.readdirSync(rdir).filter((x) => x.endsWith('.json')).sort().pop()), 'utf8'));
  const kinders = [...R.included, ...R.needsCheck].filter((r) => r.kind === '유치원' && /^kinder:[0-9a-f-]{36}$/.test(r.id));
  const outDir = path.join(ROOT, 'data', 'profiles');
  const prevF = fs.existsSync(outDir) ? fs.readdirSync(outDir).filter((x) => x.endsWith('.json')).sort().pop() : null;
  const prev = prevF ? JSON.parse(fs.readFileSync(path.join(outDir, prevF), 'utf8')) : null;
  const items = {};
  let ok = 0;
  for (const r of kinders) {
    const ittId = r.id.slice(7);
    const dir = path.join(RAW, ittId);
    try {
      if (!OFFLINE) { const d = await download(ittId); if (!d.file) { items[r.id] = { name: r.name, status: '계획안 파일 없음' }; continue; } await sleep(400); }
      const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
      const text = toText(path.join(dir, 'plan.bin'));
      if (text.replace(/\s/g, '').length < 500) throw new Error('글자를 거의 뽑지 못함 (그림으로 된 문서일 수 있음)');
      items[r.id] = {
        name: r.name, status: '확인', checkedAt: OFFLINE ? (prev?.items?.[r.id]?.checkedAt ?? meta.downloadedAt) : today,
        source: { title: meta.name, registered: meta.date, round: meta.timing ? `${meta.timing.slice(0, 4)}년 ${meta.timing.slice(4)}차` : null },
        ...analyzePlan(text),
      };
      ok++;
    } catch (e) {
      const old = prev?.items?.[r.id];
      items[r.id] = old ? { ...old, status: '이번 조회 실패 — 이전 값 유지', lastError: String(e.message) } : { name: r.name, status: '실패', error: String(e.message) };
    }
  }
  if (!ok) { console.log('모든 유치원 실패 — 파일을 바꾸지 않음'); process.exit(1); }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${today}.json`), JSON.stringify({
    source: '유치원알리미 > 학급·교육 > 연간 교육과정 편성 계획안(필수) 공시 파일',
    checkedAt: today,
    rules: '교육 방향 분류는 운영계획 글에 나온 표현을 세어 자동으로 나눈 것(규칙: docs/09_교육특징_분류.md). 기관이 실제로 그렇게 운영하는지는 상담·참관으로 확인',
    items,
  }, null, 2));
  console.log(`교육과정 운영계획 ${ok}/${kinders.length}곳 → data/profiles/${today}.json`);
  for (const v of Object.values(items)) console.log(`  ${v.name}: ${v.status}${v.tags ? ' · ' + v.tags.filter((t) => t.level === '강조').map((t) => t.label).join(', ') : ''}${v.error ? ' · ' + v.error : ''}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
