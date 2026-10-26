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
if (R.counts.mergedAcrossSources) L.push(`- 같은 유치원이 두 출처에 모두 있는 경우 이름+주소로 맞춰 하나로 합치고 유치원코드를 붙임: ${R.counts.mergedAcrossSources}곳 → 서로 다른 기관 ${R.counts.unique}곳`);
L.push(`- **유치원**: 배방·탕정 **${R.included.length + R.needsCheck.length}곳** (포함 ${R.included.length} · 확인 필요 ${R.needsCheck.length} · 제외 ${R.excluded.length})`);
L.push(`- **어린이집: 아직 수집하지 못함** — 어린이집정보공개포털이 이 환경의 접속을 차단`);
L.push(`- ${R.rosterNote}`);
if (R.disclosureChanges?.prev) L.push(`- 직전 공시(${R.disclosureChanges.prev}) 대비 아산시 유치원 변화: 신규 ${R.disclosureChanges.added.length} · 사라짐 ${R.disclosureChanges.removed.length} (${R.disclosureChanges.prevCount}→${R.disclosureChanges.curCount}곳)`);
L.push('');
L.push('## 읽는 법', '');
L.push(`- 반 수·원아 수는 **${all[0]?.disclosureRound ? `${all[0].disclosureRound.slice(0, 4)}년 ${all[0].disclosureRound[4]}차 공시` : '공시'}** 기준, 즉 **2026학년도 현재** 반 구성이다. 2027학년도 개설 반·모집 인원은 모집요강으로 확인해야 한다.`);
L.push(`- 예시 아이: ${birthYear}년생 → ${R.schoolYear}학년도 **${child.label}** (생활 표현 ${child.countingLabel}).`);
L.push('- 교사 수는 **기관 전체** 인원(수석·보직·일반·특수 교사 합)이며 반별 배치가 아니다. 기간제교원/강사는 따로 표시.');
L.push('- ⚠️ 기간제교원/강사 수가 교사 수의 3배 이상인 곳: 방과후·특성화 외부강사까지 센 값일 수 있어 공시값 그대로 두고 기관 확인 필요.');
L.push('- 1학급당 원아수 = 해당 연령 원아수 ÷ 해당 연령 학급수 (공시값으로 계산).');
if (R.apiExtras) {
  L.push('- 아래 \'운영시간·시설·안전\' 표는 유치원알리미 Open API(인증키) 자료. 방과후·교실면적·건물·수업일수는 **2026년 1차 공시**(연 1회 항목), 안전점검은 **2026년 2차 공시** 기준.');
  L.push('- 운영시간은 공시값 그대로이며 방과후 과정까지 포함한 시간이다(기본현황의 운영시간과 방과후 운영시간이 같음). 정규과정 시작·끝 시간은 따로 공시되지 않는다.');
  L.push('- 방과후 담당 인원은 기관 전체의 직위별 공시값으로, 반별 배치가 아니다.');
  L.push("- 체육장 면적: 공시 항목명이 '체육장'이며 실내·실외 구분이 없다. **0㎡는 공시값**(빈칸 아님) — 병설은 초등학교 운동장을, 단설은 인근 시설을 쓰는지 기관 확인 필요.");
  L.push('- 수업일수에서 해당 연령 반이 없으면 0일로 공시된다(혼합반만 있는 곳은 혼합연령 일수를 봄).');
}
L.push('');

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

if (R.apiExtras) {
  const val = (f, k) => (f?.value && f.value[k] !== null && f.value[k] !== undefined ? f.value[k] : '미확인');
  for (const area of ['배방읍', '탕정면']) {
    const list = all.filter((r) => r.area === area);
    L.push(`## 운영시간·시설·안전 — ${area} (인증키 API)`, '');
    L.push('| 기관 | 운영시간(방과후 포함) | 방과후 학급·참여원아 | 방과후 담당 정규/기간제/전담·보육·기타 | 수업일수 만3세·혼합/방과후 | 교실 수·면적 | 체육장 면적 | 건물(건축·층) | 놀이시설 안전검사 | CCTV(안/밖) |');
    L.push('|---|---|---|---|---|---|---|---|---|---|');
    for (const r of list) {
      const a = r.afterSchool;
      if (!a) { L.push(`| ${r.name} | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 |`); continue; }
      const cl = a.classes;
      const ind = val(cl, '독립편성학급수'), pm = val(cl, '오후재편성학급수');
      const prog = `독립 ${ind}반/${val(cl, '독립편성참여원아수')}명${pm ? ` · 오후재편성 ${pm}반/${val(cl, '오후재편성참여원아수')}명` : ''}`;
      const st = a.staff;
      const others = ['전담사수(구)', '보육교사수(신)', '기타전담사수(신)'].map((k) => val(st, k));
      const othersTxt = others.includes('미확인') ? '미확인' : others.reduce((x, y) => x + y, 0) ? others.join('·') : '0';
      const ld = r.lessonDays;
      const mixOnly = r.ageClasses.every((c) => c.manAge === null || !c.classCount);
      const ldTxt = `${mixOnly ? `혼합 ${val(ld, '혼합연령')}` : `만3세 ${val(ld, '만3세')}`}/${val(ld, '방과후과정')}일`;
      const fa = r.facilityArea;
      const b = r.building;
      const sf = r.safety;
      const pg = r.playgroundArea?.value;
      L.push(`| ${r.name} | ${v(a.hours)} | ${prog} | ${val(st, '정규교사수')}/${val(st, '기간제교사수')}/${othersTxt} | ${ldTxt} | ${val(fa, '교실수')}개·${val(fa, '교실면적')}㎡ | ${pg === null || pg === undefined ? '미확인' : `${pg}㎡`} | ${val(b, '건축년도')}년·지상${val(b, '지상층수')}${val(b, '지하층수') ? `/지하${val(b, '지하층수')}` : ''}층 | ${val(sf, '놀이시설안전검사대상') === '예' ? `${val(sf, '놀이시설점검결과')} (${val(sf, '놀이시설점검일')})` : val(sf, '놀이시설안전검사대상') === '아니오' ? '대상 아님' : '미확인'} | ${val(sf, 'CCTV설치') === '예' ? `${val(sf, 'CCTV총')}대(${val(sf, 'CCTV건물안')}/${val(sf, 'CCTV건물밖')})` : val(sf, 'CCTV설치') === '아니오' ? '설치 안 함' : '미확인'} |`);
    }
    L.push('');
  }
  const bs = all.filter((r) => /병설/.test(r.officialType?.value ?? ''));
  if (bs.length) L.push(`- 병설 ${bs.length}곳은 건물·대지 공시값이 초등학교 전체 기준일 수 있어 건물 정보는 참고만 한다.`, '');
}

const stale = (R.outOfArea ?? []).concat(R.needsCheck).filter((r) => r.staleRound && /아산시/.test(r.address?.value ?? ''));
if (stale.length) {
  L.push('## 최신 공시에 없는 아산시 유치원 (참고)', '');
  L.push(`- API에는 남아 있지만 최신 공시(${stale[0].staleRound.latest})에 없는 ${stale.length}곳: ${stale.map((r) => `${r.name}(마지막 ${r.staleRound.last})`).join(', ')}`);
  L.push(`- 모두 ${R.areas.join('·')} 밖이라 명부에는 넣지 않음. 휴원·폐원·통폐합 여부는 확인하지 않음.`, '');
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
L.push(R.apiExtras ? '- 정규과정 시작·끝 시간, 방학 중 돌봄, 비용(사립 원비·특성화비 등)' : '- 운영시간(정규·방과후), 방학 중 돌봄, 비용(사립 원비·특성화비 등)');
L.push('- 교육 방향·프로그램·자연활동 빈도, 적응·생활 지원 방식');
L.push('- 통학버스 노선·승하차 장소·탑승시간 (공시는 운행 여부와 대수만)');
L.push('');

const out = path.join(ROOT, 'docs', `03_기관명부_${R.checkedAt}.md`);
fs.writeFileSync(out, L.join('\n'));
console.log(`저장: ${path.relative(ROOT, out)}`);
