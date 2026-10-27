// 2단계 화면용 자료 묶기 → app/index.html (템플릿에 자료를 끼워 넣은 한 파일)
//   node scripts/build-app.js
// 입력: data/roster/최신.json (공시), data/admissions/2027_kinder.js (요강), data/academies/최신.json (영어유치원), data/geo (경계)
// 화면에서 쓰는 값은 모두 출처·기준일과 함께 넣는다. 모르는 값은 null.
import fs from 'node:fs';
import path from 'node:path';
import { KINDER, PENDING, PRIO, COMMON_SCHEDULE, CHECKED_AT as ADM_CHECKED } from '../data/admissions/2027_kinder.js';
import { monthlyFor } from './collect-costs.js';
import { STYLES } from '../src/lib/profile.js';
import { CURATED, CURATED_AT } from '../data/profiles/curated_2026.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const latest = (dir) => {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) return null;
  const f = fs.readdirSync(d).filter((x) => x.endsWith('.json')).sort().pop();
  return f ? JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')) : null;
};
// 시험용: ROSTER_FILE·APP_OUT 환경 변수로 다른 명부·출력 파일을 쓸 수 있음(가상 자료는 실제 화면에 넣지 않음)
const R = process.env.ROSTER_FILE ? JSON.parse(fs.readFileSync(process.env.ROSTER_FILE, 'utf8')) : latest('data/roster');
const A = latest('data/academies');
// 교육 특징: 운영계획 공시 자동 분석(data/profiles) + 사람이 읽고 정리한 값(data/profiles/curated_2026.js)
const PROF = latest('data/profiles');
function profileOf(r) {
  const p = PROF?.items?.[r.id] ?? null;
  const c = CURATED[r.name] ?? null;
  if (!p && !c) return null;
  const source = c?.src ? { kind: c.src.kind, title: c.src.title, url: c.src.url, checkedAt: CURATED_AT } : p?.source ? { kind: 'plan', ...p.source, checkedAt: p.checkedAt, status: p.status } : null;
  const newer = !!(c && !c.missing && p?.source?.registered && p.source.registered > CURATED_AT && !c.src); // 정리한 뒤 새 계획 파일이 올라옴
  if (c && !c.missing) {
    return {
      reviewed: true, reviewedAt: CURATED_AT, newer, source,
      motto: c.motto ?? null, focus: c.focus ?? [], outdoor: c.outdoor ?? null, highlights: c.highlights ?? [],
      tags: Object.keys(STYLES).map((k) => ({ key: k, level: c.styles?.[k] ?? '중점에 없음' })),
    };
  }
  return {
    reviewed: false, newer, source, missing: c?.missing ?? p?.note ?? null,
    motto: null, focus: [], outdoor: p?.outdoor?.[0] ?? null, highlights: [],
    tags: (p?.tags ?? []).map((t) => ({ key: t.key, level: t.level, auto: true })),
  };
}

// 유치원알리미 '교육·보육 비용' 공시 (scripts/collect-costs.js)
const COST = latest('data/costs');
function pubCostOf(id) {
  const c = COST?.items?.[id];
  if (!c || !c.course) return null;
  const rows = (t, kind) => Object.entries(t ?? {}).filter(([k, x]) => !/합계|소계/.test(k) && [x.m3, x.m4, x.m5].some((n) => n)).map(([k, x]) => ({ kind, label: k, m3: x.m3, m4: x.m4, m5: x.m5, cycle: x.cycle }));
  return {
    asOf: c.asOf, asOfDate: c.asOfDate, checkedAt: c.checkedAt, status: c.status,
    byAge: Object.fromEntries([3, 4, 5].map((a) => [a, monthlyFor(c, a)])),
    lines: [...rows(c.course, '교육과정'), ...rows(c.afterSchool, '방과후')],
    special: c.special ?? null,
  };
}

const v = (f) => (f && f.value !== undefined ? f.value : null);
const endTime = (s) => {
  const m = [...String(s ?? '').matchAll(/(\d{2}):(\d{2})/g)].map((x) => x[0]).sort();
  return m.length ? m[m.length - 1] : null;
};

// 카카오 주소 검색으로 찾은 좌표(공시 좌표가 없는 기관·영어유치원) — data/geo/geocoded.json
const readOpt = (rel) => { const f = path.join(ROOT, rel); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const GEO = readOpt('data/geo/geocoded.json');
const geoOf = (id) => (GEO?.items?.[id]?.lat ? GEO.items[id] : null);

const kinder = [...R.included, ...R.needsCheck].filter((r) => r.kind === '유치원').map((r) => {
  const k = KINDER[r.name] ?? null;
  const c3 = k?.recruit?.find((x) => /2023/.test(x.birth)) ?? null;
  const src = (key) => (k?.sources?.[key] ? { title: k.sources[key].title, posted: k.sources[key].posted, url: k.sources[key].url } : null);
  const item = (it) => (it ? { text: it.value, src: src(it.src) } : null);
  const hoursPub = r.afterSchool?.hours?.value ?? null;
  return {
    id: r.id,
    kind: '유치원',
    name: r.name,
    type: v(r.officialType),
    isPublic: r.isPublic,
    area: r.area,
    address: v(r.address),
    phone: v(r.phone),
    homepage: v(r.homepage),
    lat: r.location?.lat ?? geoOf(r.id)?.lat ?? null,
    lng: r.location?.lng ?? geoOf(r.id)?.lng ?? null,
    locBasis: r.location?.lat ? '공시 좌표' : geoOf(r.id) ? '주소 → 좌표 (카카오 주소 검색)' : null,
    classes: r.ageClasses.map((c) => ({ manAge: c.manAge, mixed: !!c.mixedAges, count: c.classCount, enrolled: c.enrolled, capacity: c.capacity })),
    teacherTotal: v(r.staffWhole?.teacherTotal),
    hoursPub,
    hoursPubEnd: endTime(hoursPub),
    busPub: r.schoolBus?.value ? { operating: r.schoolBus.value.운영여부, count: r.schoolBus.value.운행차량수 } : null,
    playground: r.playgroundArea?.value ?? null,
    pubAsOf: r.disclosureRound,
    pubCost: pubCostOf(r.id),
    profile: profileOf(r),
    admission: k ? {
      read: !!k.recruit,
      recruit: k.recruit ?? null,
      recruit2023: c3 ? { label: c3.age, recruit: c3.recruit, capacity: c3.capacity, classes: c3.classes } : null,
      classNames: item(k.classNames),
      priority: k.priority3 ?? null,
      prio: PRIO[r.name] ?? null,
      twins: k.twins ?? null,
      hours: item(k.hours),
      care: item(k.care),
      bus: item(k.bus),
      cost: item(k.cost),
      program: item(k.program),
      events: (k.events ?? []).map((e) => ({ what: e.what, when: e.when, src: src(e.src) })),
      notes: k.notes ?? [],
      sources: Object.values(k.sources ?? {}),
    } : null,
    pending: PENDING[r.name] ?? null,
  };
});

// 어린이집 (어린이집정보공개포털 기본정보). 가정어린이집·폐지는 명부 단계에서 이미 제외됨
const daycares = [...R.included, ...R.needsCheck].filter((r) => r.kind === '어린이집').map((r) => ({
  id: r.id,
  kind: '어린이집',
  name: r.name,
  type: v(r.officialType),
  isPublic: r.isPublic,
  area: r.area,
  address: v(r.address),
  phone: v(r.phone),
  homepage: v(r.homepage),
  lat: r.location?.lat || geoOf(r.id)?.lat || null,
  lng: r.location?.lng || geoOf(r.id)?.lng || null,
  locBasis: r.location?.lat ? '공시 좌표' : geoOf(r.id) ? '주소 → 좌표 (카카오 주소 검색)' : null,
  classes: r.ageClasses.map((c) => ({ manAge: c.manAge, mixed: !!c.mixedAges, mixedAges: c.mixedAges ?? null, count: c.classCount, enrolled: c.enrolled, capacity: c.capacity })),
  capacityTotal: v(r.totalCapacity),
  enrolledTotal: v(r.totalEnrolled),
  busPub: v(r.schoolBus) ? { operating: v(r.schoolBus) } : null,
  status: v(r.operatingStatus),
  restriction: r.restriction ?? null,
  flags: r.flags ?? [],
  pubAsOf: r.officialType?.asOf ?? null,
  source: r.officialType?.source?.name ?? '어린이집정보공개포털',
}));

const academies = (A?.academies ?? []).map((a) => ({
  id: `academy:${a.name}`,
  kind: '영어유치원(학원)',
  name: a.name,
  type: a.kind,
  isPublic: false,
  area: a.area,
  address: a.address,
  phone: a.phone,
  homepage: null,
  lat: geoOf(`academy:${a.name}`)?.lat ?? null,
  lng: geoOf(`academy:${a.name}`)?.lng ?? null,
  locBasis: geoOf(`academy:${a.name}`) ? '주소 → 좌표 (카카오 주소 검색)' : null,
  group: a.group,
  note: a.note,
  teachers: a.teachers,
  courses: (a.preschoolCourses.length ? a.preschoolCourses : a.englishCourses).map((c) => ({ name: c.name, capacity: c.capacity, minutes: c.minutesTotal, tuition: c.tuition })),
  preschoolNamed: a.preschoolCourses.length > 0,
}));

// 지도: 배방·탕정은 진하게, 둘레 읍면동은 흐리게. 좌표는 소수 넷째 자리(약 10m)로 줄임
const geo = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'geo', 'asan_admdong_20261001.geojson'), 'utf8'));
const FOCUS = ['배방읍', '탕정면'];
const NEAR = ['음봉면', '염치읍', '온양1동', '온양2동', '온양3동', '온양4동', '온양5동', '온양6동', '송악면'];
const shrink = (ring) => {
  const out = [];
  for (const [x, y] of ring) {
    const p = [Math.round(x * 1e4) / 1e4, Math.round(y * 1e4) / 1e4];
    const q = out[out.length - 1];
    if (!q || q[0] !== p[0] || q[1] !== p[1]) out.push(p);
  }
  return out;
};
const areas = geo.features
  .map((f) => ({ name: f.properties.adm_nm.split(' ').pop(), polys: f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates }))
  .filter((f) => FOCUS.includes(f.name) || NEAR.includes(f.name))
  .map((f) => ({ name: f.name, focus: FOCUS.includes(f.name), rings: f.polys.map((p) => shrink(p[0])) }));

// 아파트 단지와 단지→기관 도보·자동차 경로 (미리 계산, data/routes/kakao_routes.json)
const APT = readOpt('data/geo/apartments.json');
const RT = readOpt('data/routes/kakao_routes.json');
const instList = [...kinder, ...daycares, ...academies];
const idx = new Map(instList.map((x, i) => [x.id, i]));
const aptRoutes = {};
for (const [k, p] of Object.entries(RT?.pairs ?? {})) {
  const [aid, iid] = [k.slice(0, k.indexOf('|')), k.slice(k.indexOf('|') + 1)];
  if (!idx.has(iid)) continue;
  (aptRoutes[aid] ??= {})[idx.get(iid)] = [p.walk?.m ?? null, p.walk?.s ?? null, p.car?.m ?? null, p.car?.s ?? null];
}
const apartments = (APT?.apartments ?? []).map((a) => ({ id: a.id, name: a.name.replace(/아파트/, '').trim() || a.name, area: a.area, lat: Math.round(a.lat * 1e5) / 1e5, lng: Math.round(a.lng * 1e5) / 1e5, planned: /예정/.test(a.name) }));

const data = {
  builtAt: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date()),
  schoolYear: R.schoolYear,
  roster: { checkedAt: R.checkedAt, note: R.rosterNote, counts: R.counts },
  admissionCheckedAt: ADM_CHECKED,
  schedule: COMMON_SCHEDULE,
  academySource: A ? A.source : null,
  institutions: instList,
  styles: Object.fromEntries(Object.entries(STYLES).map(([k, v]) => [k, { label: v.label, short: v.short }])),
  profileSource: PROF ? { source: PROF.source, checkedAt: PROF.checkedAt, curatedAt: CURATED_AT } : null,
  apartments,
  aptRoutes,
  routeInfo: RT ? { walk: RT.source?.walk, car: RT.source?.car, rules: RT.rules, checkedAt: RT.log?.at(-1)?.at, remaining: RT.log?.at(-1)?.remaining, aptSource: APT?.source, aptCheckedAt: APT?.checkedAt } : null,
  map: { areas, source: '행정동 경계: vuski/admdongkor ver20261001 (통계청 경계 정리 공개 자료)' },
};

const tpl = fs.readFileSync(path.join(ROOT, 'app', 'template.html'), 'utf8');
const json = JSON.stringify(data).replace(/</g, '\\u003c');
// 추천 계산 규칙(src/lib/recommend.js)을 화면에 그대로 넣는다 — 테스트한 코드와 화면 코드가 같도록
const reco = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'recommend.js'), 'utf8').replace(/^export /gm, '')
  // 교육 방향 맞춤 계산(src/lib/profile.js)도 같은 코드를 넣음 — 화면에 필요한 함수만
  + '\n' + fs.readFileSync(path.join(ROOT, 'src', 'lib', 'profile.js'), 'utf8').replace(/^export /gm, '');
fs.writeFileSync(process.env.APP_OUT ?? path.join(ROOT, 'app', 'index.html'), tpl.replace('/*__DATA__*/null', () => json).replace('/*__RECO__*/', () => reco));
console.log(`아파트 ${apartments.length}곳 · 경로 ${Object.values(aptRoutes).reduce((a, x) => a + Object.keys(x).length, 0)}쌍 · app/index.html: 기관 ${data.institutions.length}곳 (유치원 ${kinder.length}, 어린이집 ${daycares.length}, 영어유치원·유아 영어학원 ${academies.length}), ${(json.length / 1024).toFixed(0)}KB`);
