// 정기 수집 뒤 '바뀐 내용' 찾기
//   node scripts/snapshot.js
// 1) 최신 명부(data/roster)와 공지 목록(data/notices)에서 핵심 값만 뽑아 data/snapshots/<조회일>.json 저장(저장소에 남김)
// 2) 바로 전 스냅숏과 비교해 docs/changes/<조회일>.md 작성 — 신규·사라진 기관, 바뀐 값, 새 공지
// 수집이 실패해 명부가 없으면 아무것도 바꾸지 않는다(확인일을 새로 쓰지 않음).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const latestFile = (dir) => {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) return null;
  const f = fs.readdirSync(d).filter((x) => x.endsWith('.json')).sort().pop();
  return f ? path.join(d, f) : null;
};

/** 기관 하나의 비교용 핵심 값 */
export function keyFacts(r) {
  const v = (f) => (f && f.value !== undefined ? f.value : null);
  return {
    name: r.name,
    type: v(r.officialType),
    area: r.area,
    address: v(r.address),
    phone: v(r.phone),
    homepage: v(r.homepage),
    disclosure: r.disclosureRound ?? null,
    classes: (r.ageClasses ?? []).map((c) => `${c.manAge === null ? '혼합' : `만${c.manAge}`}:${c.classCount ?? '?'}반/${c.enrolled ?? '?'}명`).join(' '),
    teachers: v(r.staffWhole?.teacherTotal),
    hours: r.afterSchool?.hours?.value ?? v(r.operatingHours),
    bus: r.schoolBus?.value ? `${r.schoolBus.value.운영여부}${r.schoolBus.value.운행차량수 ? ` ${r.schoolBus.value.운행차량수}대` : ''}` : null,
  };
}

/** 두 스냅숏 비교 */
export function diffSnapshots(prev, cur) {
  const P = new Map(prev.institutions.map((x) => [x.id, x]));
  const C = new Map(cur.institutions.map((x) => [x.id, x]));
  const added = [...C.keys()].filter((k) => !P.has(k)).map((k) => C.get(k).name);
  const removed = [...P.keys()].filter((k) => !C.has(k)).map((k) => P.get(k).name);
  const changed = [];
  for (const [k, c] of C) {
    const p = P.get(k); if (!p) continue;
    for (const f of Object.keys(c)) if (f !== 'id' && JSON.stringify(c[f]) !== JSON.stringify(p[f])) changed.push({ name: c.name, field: f, from: p[f], to: c[f] });
  }
  const seen = new Set((prev.notices ?? []).map((n) => `${n.who}|${n.title}|${n.date}`));
  const newNotices = (cur.notices ?? []).filter((n) => !seen.has(`${n.who}|${n.title}|${n.date}`));
  return { added, removed, changed, newNotices };
}

const LABEL = { name: '이름', type: '유형', area: '지역', address: '주소', phone: '전화', homepage: '홈페이지', disclosure: '공시차수', classes: '반 구성', teachers: '교사 수', hours: '운영시간', bus: '통학차량' };

function main() {
  const rf = latestFile('data/roster');
  if (!rf) { console.log('명부 없음 — 수집이 실패했거나 아직 안 함. 아무것도 바꾸지 않음'); return; }
  const R = JSON.parse(fs.readFileSync(rf, 'utf8'));
  const nf = latestFile('data/notices');
  const N = nf ? JSON.parse(fs.readFileSync(nf, 'utf8')) : null;
  const cur = {
    checkedAt: R.checkedAt,
    institutions: [...R.included, ...R.needsCheck].map((r) => ({ id: r.id, ...keyFacts(r) })),
    notices: (N?.kindergartens ?? []).flatMap((k) => (k.found ?? []).map((f) => ({ who: k.name, title: f.title, date: f.date }))),
    noticeStatus: Object.fromEntries((N?.kindergartens ?? []).map((k) => [k.name, k.status])),
  };
  const sdir = path.join(ROOT, 'data', 'snapshots');
  fs.mkdirSync(sdir, { recursive: true });
  const prevFile = fs.readdirSync(sdir).filter((x) => x.endsWith('.json') && x !== `${cur.checkedAt}.json`).sort().pop();
  fs.writeFileSync(path.join(sdir, `${cur.checkedAt}.json`), JSON.stringify(cur, null, 2));
  if (!prevFile) { console.log(`첫 스냅숏 저장: data/snapshots/${cur.checkedAt}.json (비교할 이전 자료 없음)`); return; }
  const prev = JSON.parse(fs.readFileSync(path.join(sdir, prevFile), 'utf8'));
  const d = diffSnapshots(prev, cur);
  const L = [`# 바뀐 내용 — ${prev.checkedAt} → ${cur.checkedAt}`, ''];
  L.push(`- 배방·탕정 유치원: ${prev.institutions.length}곳 → ${cur.institutions.length}곳`);
  L.push(`- 새로 생긴 곳: ${d.added.join(', ') || '없음'} · 사라진 곳: ${d.removed.join(', ') || '없음'} (폐원·명칭변경 여부는 확인 필요)`, '');
  L.push('## 바뀐 값', '');
  if (d.changed.length) { L.push('| 기관 | 항목 | 이전 | 지금 |', '|---|---|---|---|'); for (const c of d.changed) L.push(`| ${c.name} | ${LABEL[c.field] ?? c.field} | ${c.from ?? '미확인'} | ${c.to ?? '미확인'} |`); } else L.push('없음');
  L.push('', '## 새 공지 (홈페이지)', '');
  if (d.newNotices.length) for (const n of d.newNotices) L.push(`- ${n.date ?? ''} ${n.who}: ${n.title}`); else L.push('없음');
  L.push('', '새 모집요강이 있으면 원문을 읽고 `data/admissions/2027_kinder.js`에 옮긴 뒤 `node scripts/admission-report.js`, `node scripts/build-app.js`를 실행합니다.');
  const cdir = path.join(ROOT, 'docs', 'changes');
  fs.mkdirSync(cdir, { recursive: true });
  fs.writeFileSync(path.join(cdir, `${cur.checkedAt}.md`), L.join('\n'));
  console.log(`비교 ${prev.checkedAt} → ${cur.checkedAt}: 신규 ${d.added.length} · 사라짐 ${d.removed.length} · 바뀐 값 ${d.changed.length} · 새 공지 ${d.newNotices.length} → docs/changes/${cur.checkedAt}.md`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
