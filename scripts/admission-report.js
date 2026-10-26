// 2027 모집 정보 문서: 기관마다 한 섹션 (공시 명부 + 모집요강 정리값)
//   node scripts/admission-report.js   → docs/04_2027_모집요강_기관별_<확인일>.md
import fs from 'node:fs';
import path from 'node:path';
import { CHECKED_AT, SCHOOL_YEAR, COMMON_SCHEDULE, COMMON_RULES, KINDER, PENDING } from '../data/admissions/2027_kinder.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rdir = path.join(ROOT, 'data', 'roster');
const R = JSON.parse(fs.readFileSync(path.join(rdir, fs.readdirSync(rdir).filter((f) => f.endsWith('.json')).sort().pop()), 'utf8'));
const list = [...R.included, ...R.needsCheck].filter((r) => r.kind === '유치원');
list.sort((a, b) => (a.area ?? '').localeCompare(b.area ?? '') || a.name.localeCompare(b.name));

const U = '미확인';
const v = (f) => (f && f.value !== null && f.value !== undefined ? f.value : U);
const short = (a) => String(a ?? '').replace('충청남도 아산시 ', '');
const n = (x) => (x === null || x === undefined ? U : x);

function srcRef(k, key) {
  const s = k.sources?.[key];
  return s ? `〔${s.title}${s.posted ? `, ${s.posted} 게시` : ''}〕` : '';
}
function line(label, item, k) {
  if (!item) return `- **${label}**: ${U}`;
  return `- **${label}**: ${item.value} ${srcRef(k, item.src)}`;
}

const L = [];
L.push(`# ${SCHOOL_YEAR}학년도 유치원·어린이집 모집 정보 — 기관별 (배방·탕정, ${CHECKED_AT} 확인)`, '');
L.push('## 읽는 법', '');
L.push('- 기관마다 한 섹션입니다. 각 섹션은 **① 기본정보(공시) → ② 2027 모집(요강) → ③ 운영·돌봄·통학·비용 → ④ 설명회 → ⑤ 아직 모르는 것** 순서입니다.');
L.push('- **2023년생 = 2027 모집요강의 "3세반"(만 나이)**. 옛 세는나이로는 "5세반"이지만, 요강의 "5세반"은 2021년생입니다. 반 이름만 보고 판단하지 말고 출생연도를 같이 보세요.');
L.push('- 요강 값은 각 유치원 홈페이지에 올라온 모집요강 원문(PDF·HWP)을 읽고 옮긴 것이며, 줄 끝 〔 〕에 출처 문서와 게시일을 적었습니다. 요강에 없는 값은 "미확인"입니다(없음·0원이 아님).');
L.push('- 공시 값(반 수·교사 수·면적 등)은 유치원알리미 2026년 공시 기준, 즉 **올해(2026학년도) 현황**입니다.');
const done = list.filter((r) => KINDER[r.name]?.recruit).length;
L.push(`- 유치원 ${list.length}곳 중 모집요강을 읽은 곳 ${done}곳. **어린이집은 아직 수집하지 못했습니다.** 모든 기관 조사 완료가 아닙니다.`, '');

L.push('## 충남 공통 일정 (요강을 읽은 곳 모두 같음)', '');
L.push('| 단계 | 일시 | 메모 |', '|---|---|---|');
for (const s of COMMON_SCHEDULE) L.push(`| ${s.step} | ${s.when} | ${s.note ?? ''} |`);
L.push('', '공통 규칙', '');
for (const x of COMMON_RULES) L.push(`- ${x}`);
L.push('- 접수·조회: 유보통합포털 https://enter.childinfo.go.kr → 유치원입학', '');

L.push('## 한눈에 보기 (2023년생 기준)', '');
L.push('| 기관 | 지역 | 3세반 모집 | 하루 운영 | 돌봄 | 통학버스 | 요강 |', '|---|---|---|---|---|---|---|');
for (const r of list) {
  const k = KINDER[r.name] ?? {};
  const c3 = k.recruit?.find((x) => /2023/.test(x.birth));
  const span = (it) => {
    const t = [...String(it?.value ?? '').matchAll(/(\d{2}):(\d{2})/g)].map((m) => m[0]);
    return t.length >= 2 ? `${t.sort()[0]}~${t.sort().pop()}` : it ? String(it.value).slice(0, 20) : U;
  };
  const bus = !k.bus ? U : /^(없음|미운행)/.test(k.bus.value) ? k.bus.value : '있음';
  const care = k.care ? span(k.care) : /07:30~19:30/.test(k.hours?.value ?? '') ? '운영시간에 포함' : U;
  const rc = c3 ? `${String(c3.recruit).replace(/\s*\((.*)\)/, '명 ($1)').replace(/^(\d+)$/, '$1명')}${/혼합/.test(c3.age) ? ' · 혼합반' : ''}` : U;
  L.push(`| [${r.name}](#${r.name}) | ${r.area} | ${rc} | ${k.hours ? span(k.hours) : U} | ${care} | ${bus} | ${k.recruit ? '읽음' : k.events?.length || k.notes?.length ? '일부' : '아직'} |`);
}
L.push('');

for (const area of ['배방읍', '탕정면']) {
  L.push(`# ${area} 유치원`, '');
  for (const r of list.filter((x) => x.area === area)) {
    const k = KINDER[r.name] ?? null;
    L.push(`## ${r.name}`, '');
    // ① 기본정보
    L.push('**① 기본정보 (유치원알리미 공시)**', '');
    L.push(`- 공식 유형: ${v(r.officialType)} · 유치원코드 ${r.officialId ?? U}`);
    L.push(`- 주소: ${short(r.address.value)} · 전화 ${v(r.phone)} · 홈페이지 ${v(r.homepage)}`);
    const cls = r.ageClasses.map((c) => `${c.label.replace('(공시 구분)', '')} ${n(c.classCount)}반/${n(c.enrolled)}명`).join(' · ');
    L.push(`- 2026 반 구성(공시): ${cls}`);
    L.push(`- 교사(기관 전체, 반별 배치 아님): ${v(r.staffWhole?.teacherTotal)}명 · 운영시간(공시, 방과후 포함): ${r.afterSchool?.hours?.value ?? v(r.operatingHours)}`);
    L.push(`- 체육장 면적(공시, 실내·실외 구분 없음): ${r.playgroundArea?.value ?? U}㎡ · 통학차량(공시): ${r.schoolBus?.value?.운영여부 ?? U}${r.schoolBus?.value?.운행차량수 ? ` ${r.schoolBus.value.운행차량수}대` : ''}`);
    if (k?.classNames) L.push(line('기관이 쓰는 반 이름', k.classNames, k));
    L.push('');
    if (!k || (!k.recruit && !k.events?.length && !k.notes?.length)) {
      L.push(`**② 2027 모집**: 요강 미확인 — ${PENDING[r.name] ?? '확인 필요'}. 10월 28일부터 유보통합포털에서 확인하거나 전화 ${v(r.phone)}`, '');
      continue;
    }
    // ② 모집
    L.push('**② 2027 모집 (요강)**', '');
    if (k.recruit) {
      L.push('| 반(요강 표기) | 대상 출생 | 학급 | 정원 | 재학 예정 | 모집 |', '|---|---|---|---|---|---|');
      for (const x of k.recruit) L.push(`| ${x.age} | ${x.birth} | ${n(x.classes)} | ${n(x.capacity)} | ${n(x.staying)} | **${n(x.recruit)}** |`);
      L.push(`출처 ${srcRef(k, k.recruit[0].src)} · 일정은 충남 공통 일정과 같음`, '');
    } else L.push(`- 모집인원·우선순위: ${U}`);
    if (k.priority3) { L.push('- **우선모집 순위(3세반 기준 비율)**'); for (const p of k.priority3) L.push(`  - ${p}`); }
    if (k.twins) L.push(`- **쌍생아**: ${k.twins}`);
    L.push('');
    // ③ 운영
    if (k.recruit) {
      L.push('**③ 운영·돌봄·통학·비용 (요강·안내자료)**', '');
      L.push(line('하루 운영', k.hours, k));
      L.push(line('아침·저녁 돌봄', k.care, k));
      L.push(line('통학버스', k.bus, k));
      L.push(line('부모 부담 비용', k.cost, k));
      if (k.program) L.push(line('교육·프로그램(기관 안내)', k.program, k));
      if (k.calendar) L.push(line('학사일정', k.calendar, k));
      L.push('');
    }
    // ④ 설명회
    L.push('**④ 설명회·공개 행사**', '');
    if (k.events?.length) for (const e of k.events) L.push(`- ${e.what}: ${e.when} ${srcRef(k, e.src)}`);
    else L.push(`- ${U} (요강·홈페이지에서 찾지 못함 — "설명회 없음"이 아님)`);
    for (const x of k.notes ?? []) L.push(`- 참고: ${x}`);
    L.push('');
    // ⑤ 미확인
    const gaps = ['반별 담임·보조 교사 배치', '자연·바깥놀이 빈도와 시간', '적응 기간·방식', '낮잠·식사·배변 도움', '방학 중 돌봄·급식·차량'];
    if (!k.bus || !/^(없음|미운행)/.test(k.bus.value)) gaps.push('버스 승하차 시각·탑승시간');
    if (!k.care && !/07:30~19:30/.test(k.hours?.value ?? '')) gaps.push('아침·저녁 돌봄');
    if (!k.cost) gaps.unshift('비용');
    if (!k.classNames) gaps.unshift('기관이 쓰는 반 이름');
    L.push(`**⑤ 아직 모르는 것 → 상담 때 물어볼 것**: ${gaps.join(', ')}`, '');
  }
}

// ── 영어유치원(유아 대상 영어학원) ───────────────────────────
const adir = path.join(ROOT, 'data', 'academies');
const afile = fs.existsSync(adir) ? fs.readdirSync(adir).filter((f) => f.endsWith('.json')).sort().pop() : null;
if (afile) {
  const A = JSON.parse(fs.readFileSync(path.join(adir, afile), 'utf8'));
  const won = (x) => (x === null || x === undefined ? U : `${Math.round(x).toLocaleString('ko-KR')}원`);
  const mins = (x) => (x === null || x === undefined ? U : `월 ${Math.round(x).toLocaleString('ko-KR')}분`);
  L.push('# 영어유치원 (유아 대상 영어학원)', '');
  L.push('- **영어유치원은 법적으로 유치원이 아니라 학원입니다.** 유치원알리미 공시·유보통합포털 모집 대상이 아니고, 유아학비(누리과정) 지원도 받지 않습니다. 모집은 학원이 직접 합니다.');
  L.push(`- 출처: ${A.source.name} (교육청 등록 자료, **${A.source.asOf} 기준**) ${A.source.url}`);
  L.push('- 교습비는 학원이 교육청에 **등록한 금액**입니다. 실제 청구액, 교재비, 차량비, 입학금은 학원에 확인하세요. "월 ○분"은 등록된 한 달 총 교습시간입니다.');
  L.push('- 대상 연령은 등록된 과목(반) 이름으로만 판단했습니다. 이름에 유아·유치가 없으면 "대상 연령 미표기"입니다.');
  L.push('- 이 목록은 배방·탕정 주소만 포함합니다. 천안 불당 등 인근 지역은 포함하지 않았습니다. 웹에서 2027 모집·설명회 공지는 찾지 못했습니다(→ 전화 확인).', '');
  for (const g of ['유아 종일 영어반 (영어유치원 형태)', '유아 전문 여부 확인 필요', '유치부 단과반 (유치원·어린이집 하원 후)']) {
    const list = A.academies.filter((x) => x.group === g);
    if (!list.length) continue;
    L.push(`## ${g} — ${list.length}곳`, '');
    if (/종일/.test(g)) L.push('유아반 이름이 있고 한 달 교습시간이 4,000분(월 20일 기준 하루 약 3시간 20분) 이상인 과정이 있는 곳', '');
    if (/단과/.test(g)) L.push('유치원·어린이집을 다니면서 하원 후 주 1~5회 다니는 짧은 유아 영어반', '');
    for (const a of list) {
      L.push(`### ${a.name}`, '');
      L.push(`- 구분: ${a.kind} · ${a.area} · 주소 ${String(a.address).replace('충청남도 아산시 ', '')} · 전화 ${a.phone ?? U} · 등록 강사 ${a.teachers ?? U}명 (학원 전체)`);
      if (a.note) L.push(`- 참고: ${a.note}`);
      const cs = a.preschoolCourses.length ? a.preschoolCourses : a.englishCourses;
      L.push(`- ${a.preschoolCourses.length ? '유아 관련 과정' : '영어 과정(대상 연령 미표기)'}:`, '');
      L.push('| 과목(반) | 정원 | 한 달 교습시간 | 등록 교습비(월) |', '|---|---|---|---|');
      for (const c of cs) L.push(`| ${c.name} | ${c.capacity ?? U} | ${mins(c.minutesTotal)} | ${won(c.tuition)} |`);
      L.push('', '- 아직 모르는 것: 2027 모집 일정·설명회, 대상 출생연도(반 이름의 "5세"·"7세"가 만 나이인지), 원어민·한국인 교사 배치, 하루 일과·바깥놀이, 급식·차량, 방학', '');
    }
  }
}

L.push('# 어린이집', '');
L.push('- **아직 수집하지 못했습니다.** 어린이집정보공개포털·아이사랑이 이 작업 환경(해외 서버)의 접속을 막습니다.');
L.push('- 어린이집 입소는 유치원과 달리 아이사랑 입소대기 신청으로 진행되며, 기관별 2027 모집 일정은 확인하지 못했습니다.');
L.push('- 자료가 들어오면 같은 구조(기관마다 한 섹션)로 이 문서에 추가합니다. 가정어린이집은 제외, 직장어린이집은 이용 자격 제한을 표시합니다.', '');

L.push('## 원문 파일', '');
L.push('- 내려받은 요강 원문: `data/raw/notices/<유치원>/` (공개 저장소 제외) · 글 목록: `data/notices/` · 정리값: `data/admissions/2027_kinder.js`');
L.push('- 영어유치원: `python3 -I scripts/academy-extract.py <충남 학원 현황 xlsx> <기준일>` → `data/academies/`');
L.push('- 다시 수집: `npm run notices` → 새 요강을 읽고 `data/admissions/2027_kinder.js`에 옮긴 뒤 `node scripts/admission-report.js`');

const out = path.join(ROOT, 'docs', `04_2027_모집요강_기관별_${CHECKED_AT}.md`);
fs.writeFileSync(out, L.join('\n'));
console.log(`저장: ${path.relative(ROOT, out)}`);
