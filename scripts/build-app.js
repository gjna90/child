// 2단계 화면용 자료 묶기 → app/index.html (템플릿에 자료를 끼워 넣은 한 파일)
//   node scripts/build-app.js
// 입력: data/roster/최신.json (공시), data/admissions/2027_kinder.js (요강), data/academies/최신.json (영어유치원), data/geo (경계)
// 화면에서 쓰는 값은 모두 출처·기준일과 함께 넣는다. 모르는 값은 null.
import fs from 'node:fs';
import path from 'node:path';
import { KINDER, PENDING, PRIO, COMMON_SCHEDULE, CHECKED_AT as ADM_CHECKED } from '../data/admissions/2027_kinder.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const latest = (dir) => {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) return null;
  const f = fs.readdirSync(d).filter((x) => x.endsWith('.json')).sort().pop();
  return f ? JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')) : null;
};
const R = latest('data/roster');
const A = latest('data/academies');

const v = (f) => (f && f.value !== undefined ? f.value : null);
const endTime = (s) => {
  const m = [...String(s ?? '').matchAll(/(\d{2}):(\d{2})/g)].map((x) => x[0]).sort();
  return m.length ? m[m.length - 1] : null;
};

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
    lat: r.location?.lat ?? null,
    lng: r.location?.lng ?? null,
    locBasis: r.location?.lat ? '공시 좌표' : null,
    classes: r.ageClasses.map((c) => ({ manAge: c.manAge, mixed: !!c.mixedAges, count: c.classCount, enrolled: c.enrolled, capacity: c.capacity })),
    teacherTotal: v(r.staffWhole?.teacherTotal),
    hoursPub,
    hoursPubEnd: endTime(hoursPub),
    busPub: r.schoolBus?.value ? { operating: r.schoolBus.value.운영여부, count: r.schoolBus.value.운행차량수 } : null,
    playground: r.playgroundArea?.value ?? null,
    pubAsOf: r.disclosureRound,
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
  lat: null,
  lng: null,
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

const data = {
  builtAt: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date()),
  schoolYear: R.schoolYear,
  roster: { checkedAt: R.checkedAt, note: R.rosterNote, counts: R.counts },
  admissionCheckedAt: ADM_CHECKED,
  schedule: COMMON_SCHEDULE,
  academySource: A ? A.source : null,
  institutions: [...kinder, ...academies],
  map: { areas, source: '행정동 경계: vuski/admdongkor ver20261001 (통계청 경계 정리 공개 자료)' },
};

const tpl = fs.readFileSync(path.join(ROOT, 'app', 'template.html'), 'utf8');
const json = JSON.stringify(data).replace(/</g, '\\u003c');
fs.writeFileSync(path.join(ROOT, 'app', 'index.html'), tpl.replace('/*__DATA__*/null', json));
console.log(`app/index.html: 기관 ${data.institutions.length}곳 (유치원 ${kinder.length}, 영어유치원·유아 영어학원 ${academies.length}), ${(json.length / 1024).toFixed(0)}KB`);
