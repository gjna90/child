// data/roster/<날짜>.json → docs/03_기관명부_<날짜>.md (사람이 읽는 명부)
import fs from 'node:fs';
import path from 'node:path';
import { describeChildClass, eligibility } from '../src/lib/age.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dir = path.join(ROOT, 'data', 'roster');
const file = process.argv[2] ?? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().pop();
const R = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
const cand = (() => {
  const cdir = path.join(ROOT, 'data', 'candidates');
  const f = fs.readdirSync(cdir).filter((x) => x.endsWith('.json')).sort().pop();
  return f ? JSON.parse(fs.readFileSync(path.join(cdir, f), 'utf8')) : null;
})();

const v = (f) => (f && f.value !== null && f.value !== undefined ? f.value : '미확인');
const n = (x) => (x === null || x === undefined ? '미확인' : x);
const short = (a) => String(a ?? '').replace('충청남도 아산시 ', '');
const all = [...R.included, ...R.needsCheck];
all.sort((a, b) => (a.area ?? '').localeCompare(b.area ?? '') || a.name.localeCompare(b.name));

const birthYear = R.child?.birthYear ?? 2023; // 예시: 2023년생 (2027학년도 만3세, 옛 표기 5세반)
const child = describeChildClass(birthYear, R.schoolYear);

const L = [];
L.push(`# 배방읍·탕정면 기관 명부 (${R.checkedAt} 조회)`, '');
L.push(`- 모집 학년도: ${R.schoolYear} · 지역 판정: 공시 좌표 + 행정동 경계(좌표 없으면 주소)`);
L.push(`- 출처: ${R.perSource.map((s) => `${s.source} ${s.rows}건`).join(' / ')}`);
L.push(`- **유치원**: 충남 ${R.counts.fetched}곳 중 배방·탕정 **${R.included.length + R.needsCheck.length}곳** (포함 ${R.included.length} · 확인 필요 ${R.needsCheck.length} · 제외 ${R.excluded.length})`);
L.push(`- **어린이집: 아직 수집하지 못함** — 어린이집정보공개포털이 이 환경의 접속을 차단`);
L.push(`- ${R.rosterNote}`);
if (R.disclosureChanges?.prev) L.push(`- 직전 공시(${R.disclosureChanges.prev}) 대비 아산시 유치원 변화: 신규 ${R.disclosureChanges.added.length} · 사라짐 ${R.disclosureChanges.removed.length} (${R.disclosureChanges.prevCount}→${R.disclosureChanges.curCount}곳)`);
L.push('');
L.push('## 읽는 법', '');
L.push(`- 반 수·원아 수는 **${all[0]?.disclosureRound ? `${all[0].disclosureRound.slice(0, 4)}년 ${all[0].disclosureRound[4]}차 공시` : '공시'}** 기준, 즉 **2026학년도 현재** 반 구성이다. 2027학년도 개설 반·모집 인원은 모집요강으로 확인해야 한다.`);
L.push(`- 예시 아이: ${birthYear}년생 → ${R.schoolYear}학년도 **${child.label}** (생활 표현 ${child.countingLabel}).`);
L.push('- 교사 수는 **기관 전체** 인원(수석·보직·일반·특수 교사 합)이며 반별 배치가 아니다. 기간제교원/강사는 따로 표시.');
L.push('- ⚠️ 기간제교원/강사 수가 교사 수의 3배 이상인 곳: 방과후·특성화 외부강사까지 센 값일 수 있어 공시값 그대로 두고 기관 확인 필요.');
L.push('- 1학급당 원아수 = 해당 연령 원아수 ÷ 해당 연령 학급수 (공시값으로 계산).', '');

for (const area of ['배방읍', '탕정면']) {
  const list = all.filter((r) => r.area === area);
  L.push(`## ${area} (${list.length}곳)`, '');
  L.push('| 기관 | 공식 유형 | 만3세 반/원아 | 만4세 | 만5세 | 혼합 | 교사(전체) | 기간제·강사 | 통학차량 | 급식 | ' + `${child.label} 관점 |`);
  L.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of list) {
    const c = (age) => r.ageClasses.find((x) => x.manAge === age);
    const cell = (x) => (x ? `${n(x.classCount)}반/${n(x.enrolled)}명${x.classCount ? ` (반당 ${Math.round((x.enrolled / x.classCount) * 10) / 10})` : ''}` : '미확인');
    const mix = r.ageClasses.find((x) => x.manAge === null);
    const roles = r.staffWhole?.roles?.value ?? {};
    const bus = r.schoolBus?.value;
    const meal = r.meal?.value;
    const e = eligibility(r, child.manAge);
    const tt = r.staffWhole?.teacherTotal?.value;
    const extra = roles['기간제교원/강사수'];
    const odd = tt && extra !== null && extra !== undefined && extra >= tt * 3 ? ' ⚠️' : '';
    L.push(`| ${r.name} | ${v(r.officialType)} | ${cell(c(3))} | ${cell(c(4))} | ${cell(c(5))} | ${mix ? `${mix.classCount}반/${n(mix.enrolled)}명` : '없음'} | ${v(r.staffWhole?.teacherTotal)} | ${n(roles['기간제교원/강사수'])}${odd} | ${bus ? `${bus.운영여부}${bus.운행차량수 ? ` ${bus.운행차량수}대` : ''}` : '미확인'} | ${meal?.운영방식 ?? '미확인'} | ${e.childClass} |`);
  }
  L.push('');
}

L.push('## 연락처·주소', '');
L.push('| 기관 | 주소 | 전화 | 홈페이지 | 지역 판정 근거 |', '|---|---|---|---|---|');
for (const r of all) L.push(`| ${r.name} | ${short(r.address.value)} | ${v(r.phone)} | ${v(r.homepage)} | ${r.areaBasis} |`);
L.push('');

if (cand) {
  const names = new Set(all.map((r) => r.name.replace(/\s/g, '')));
  const kinderCand = cand['후보'].filter((c) => c['구분'] === '유치원');
  const missing = kinderCand.filter((c) => !names.has(c['이름'].replace(/\s/g, '')));
  const newOnes = all.filter((r) => !kinderCand.some((c) => c['이름'].replace(/\s/g, '') === r.name.replace(/\s/g, '')));
  L.push('## 검색 후보(1차 조사)와 대조', '');
  L.push(`- 검색 후보 유치원 ${kinderCand.length}곳 중 공식 공시에서 확인: ${kinderCand.length - missing.length}곳`);
  L.push(`- 공식 공시에 없음: ${missing.map((c) => `${c['이름']}(${c['메모'] ?? ''})`).join(', ') || '없음'} → 폐원·명칭 변경 확인 필요`);
  L.push(`- 검색으로는 못 찾았고 공시에서 새로 확인: ${newOnes.map((r) => r.name).join(', ') || '없음'}`);
  L.push('');
}

L.push('## 아직 없는 정보 (기관 확인 또는 추가 자료 필요)', '');
L.push('- 기관이 부르는 반 이름(예: 5세반·햇살반)과 반별 대상 출생연도');
L.push('- 2027학년도 연령별 모집 인원, 우선모집 자격, 쌍생아 처리, 설명회 일정');
L.push('- 운영시간(정규·방과후), 방학 중 돌봄, 비용(사립 원비·특성화비 등)');
L.push('- 교육 방향·프로그램·자연활동 빈도, 적응·생활 지원 방식');
L.push('- 통학버스 노선·승하차 장소·탑승시간 (공시는 운행 여부와 대수만)');
L.push('');

const out = path.join(ROOT, 'docs', `03_기관명부_${R.checkedAt}.md`);
fs.writeFileSync(out, L.join('\n'));
console.log(`저장: ${path.relative(ROOT, out)}`);
