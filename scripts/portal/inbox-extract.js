// PC에서 올라온 유보통합포털 요강(data/portal_inbox)을 클라우드에서 글자로 풀기
//   node scripts/portal/inbox-extract.js   → 첨부(PDF·HWP·HWPX) 옆에 .txt 생성, 아직 정리 안 된 곳 목록 출력
// 정리(모집인원·우선순위 등)는 사람이 원문을 읽고 data/admissions/2027_kinder.js 에 옮긴다 — 정기 루틴이 수행.
import fs from 'node:fs';
import path from 'node:path';
import { extractText } from '../collect-notices.js';
import { KINDER } from '../../data/admissions/2027_kinder.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const BASE = path.join(ROOT, 'data', 'portal_inbox');
if (!fs.existsSync(BASE)) { console.log('받은 요강 없음 (data/portal_inbox 없음)'); process.exit(0); }
const todo = [];
for (const day of fs.readdirSync(BASE).sort()) {
  const idx = path.join(BASE, day, 'index.json');
  if (!fs.existsSync(idx)) continue;
  for (const it of JSON.parse(fs.readFileSync(idx, 'utf8')).items) {
    const dir = path.join(BASE, day, it.name.replace(/[\\/:*?"<>|\s]+/g, '_'));
    for (const f of it.files ?? []) {
      const src = path.join(dir, f);
      if (!fs.existsSync(src) || fs.existsSync(src + '.txt')) continue;
      const r = extractText(src);
      if (r.text) fs.writeFileSync(src + '.txt', r.text);
      console.log(`  ${it.name}/${f}: ${r.text ? `${r.text.length}자` : r.how}`);
    }
    if (!KINDER[it.name]?.recruit) todo.push(`${day} ${it.name}`);
  }
}
console.log(todo.length ? `정리할 곳(요강 받았지만 아직 앱에 없음): ${todo.join(', ')}` : '받은 요강은 모두 정리됨');
