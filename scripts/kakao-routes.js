// 카카오 API로 '우리 아파트 → 유치원' 도보·자동차 경로를 미리 계산한다 (화면 페이지는 카카오에 직접 연결할 수 없음)
//   node scripts/kakao-routes.js apartments   # 배방·탕정 아파트 단지 목록 → data/geo/apartments.json
//   node scripts/kakao-routes.js geocode      # 좌표 없는 기관(영어유치원·일부 유치원) 주소 → data/geo/geocoded.json
//   node scripts/kakao-routes.js routes       # 단지×기관 도보·자동차 → data/routes/kakao_routes.json (이어서 계산 가능)
// 키: 환경 변수 KAKAO_REST_API_KEY (출력·파일에 남기지 않음)
// 사용자의 집 위치는 어디에도 보내지 않는다. 미리 정한 아파트 목록의 좌표만 카카오에 보낸다.
import fs from 'node:fs';
import path from 'node:path';
import { loadBoundaries, districtOf } from '../src/lib/geo.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const KEY = process.env.KAKAO_REST_API_KEY;
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
const AREAS = ['배방읍', '탕정면'];
const WALK_MAX_M = 2500; // 직선 2.5km 넘으면 도보 계산 안 함(아이 걸음으로 비현실적)
const CAR_MAX_M = 7000;  // 직선 7km 넘으면 자동차 계산 안 함
const WALK_DAILY = Number(process.env.KAKAO_WALK_BUDGET ?? 950); // 도보 경로 무료 하루 1,000건
const CAR_DAILY = Number(process.env.KAKAO_CAR_BUDGET ?? 2000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function kakao(url) {
  if (!KEY) throw new Error('KAKAO_REST_API_KEY 없음');
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, { headers: { Authorization: 'KakaoAK ' + KEY } });
    if (res.status === 429) return { quota: true };
    if (res.ok) return { json: await res.json() };
    if (res.status >= 500) { await sleep(800 * (i + 1)); continue; }
    const t = (await res.text()).split(KEY).join('***').slice(0, 200);
    return { error: `HTTP ${res.status} ${t}` };
  }
  return { error: '서버 응답 없음' };
}
const readJson = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const writeJson = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 2)); };
export function haversine(a, b) {
  const R = 6371000, r = (x) => (x * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 장소 검색 결과에서 '아파트 단지' 하나만 남기기(동·상가·관리사무소 등 제외) */
export function isComplex(doc) {
  if (!/주거시설 > 아파트/.test(doc.category_name ?? '')) return false;
  if (/\d+\s*동$|상가|관리사무소|주차장|정문|후문|경로당|어린이집|유치원|놀이터|입구|커뮤니티|휘트니스|분양|모델하우스|홍보관/.test(doc.place_name)) return false;
  return true;
}

async function apartments() {
  const B = loadBoundaries(path.join(ROOT, 'data', 'geo', 'asan_admdong_20261001.geojson'));
  const focus = B.filter((b) => AREAS.includes(b.name));
  let minX = 180, maxX = -180, minY = 90, maxY = -90;
  for (const b of focus) for (const p of b.polys) for (const [x, y] of p[0]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const stepLat = 0.012, stepLng = 0.015; // 약 1.3km 간격
  const found = new Map();
  let calls = 0;
  for (let y = minY; y <= maxY; y += stepLat) {
    for (let x = minX; x <= maxX; x += stepLng) {
      if (!districtOf(y, x, focus) && !districtOf(y + stepLat / 2, x + stepLng / 2, focus)) continue;
      for (let page = 1; page <= 3; page++) {
        const q = new URLSearchParams({ query: '아파트', x: String(x), y: String(y), radius: '1000', page: String(page), size: '15' });
        const r = await kakao('https://dapi.kakao.com/v2/local/search/keyword.json?' + q); calls++;
        if (!r.json) { console.log('검색 실패', r.error ?? '사용량 초과'); break; }
        for (const d of r.json.documents) {
          if (!isComplex(d)) continue;
          const lat = +d.y, lng = +d.x;
          const area = districtOf(lat, lng, focus);
          if (!area) continue;
          if (!found.has(d.id)) found.set(d.id, { id: d.id, name: d.place_name, area, roadAddress: d.road_address_name || null, address: d.address_name, lat, lng, placeUrl: d.place_url });
        }
        if (r.json.meta.is_end) break;
        await sleep(120);
      }
    }
  }
  const list = [...found.values()].sort((a, b) => a.area.localeCompare(b.area) || a.name.localeCompare(b.name, 'ko'));
  writeJson(path.join(ROOT, 'data', 'geo', 'apartments.json'), { source: '카카오 로컬 API 키워드 검색("아파트", 1km 반경 격자), 카테고리 "주거시설 > 아파트"만', checkedAt: today, areas: AREAS, count: list.length, apartments: list });
  console.log(`아파트 단지 ${list.length}곳 (검색 ${calls}회) → data/geo/apartments.json`);
}

function latest(dir) { const d = path.join(ROOT, dir); const f = fs.readdirSync(d).filter((x) => x.endsWith('.json')).sort().pop(); return JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')); }

async function geocode() {
  const R = latest('data/roster'); const A = latest('data/academies');
  const need = [
    ...[...R.included, ...R.needsCheck].filter((r) => !r.location?.lat).map((r) => ({ id: r.id, name: r.name, address: r.address.value })),
    ...A.academies.map((a) => ({ id: `academy:${a.name}`, name: a.name, address: a.address })),
  ];
  const out = readJson(path.join(ROOT, 'data', 'geo', 'geocoded.json'), { items: {} });
  for (const n of need) {
    if (out.items[n.id]) continue;
    const addr = String(n.address).replace(/\s*,.*$/, '').replace(/\(.*?\)/g, '').trim(); // 호수·괄호 떼고 도로명까지
    const r = await kakao('https://dapi.kakao.com/v2/local/search/address.json?' + new URLSearchParams({ query: addr }));
    const d = r.json?.documents?.[0];
    out.items[n.id] = d ? { name: n.name, query: addr, lat: +d.y, lng: +d.x, matched: d.address_name } : { name: n.name, query: addr, lat: null, lng: null, note: '주소 검색 결과 없음' };
    await sleep(120);
  }
  out.source = '카카오 로컬 API 주소 검색(도로명 주소 → 좌표)'; out.checkedAt = today;
  writeJson(path.join(ROOT, 'data', 'geo', 'geocoded.json'), out);
  console.log(`좌표 찾기 ${Object.values(out.items).filter((x) => x.lat).length}/${need.length}곳 → data/geo/geocoded.json`);
}

async function routes() {
  const apts = readJson(path.join(ROOT, 'data', 'geo', 'apartments.json'), null)?.apartments;
  if (!apts) throw new Error('먼저 apartments 실행');
  const R = latest('data/roster'); const geo = readJson(path.join(ROOT, 'data', 'geo', 'geocoded.json'), { items: {} }).items;
  const A = latest('data/academies');
  const inst = [
    ...[...R.included, ...R.needsCheck].map((r) => ({ id: r.id, lat: r.location?.lat || geo[r.id]?.lat, lng: r.location?.lng || geo[r.id]?.lng })),
    ...A.academies.map((a) => ({ id: `academy:${a.name}`, lat: geo[`academy:${a.name}`]?.lat, lng: geo[`academy:${a.name}`]?.lng })),
  ].filter((x) => x.lat);
  const file = path.join(ROOT, 'data', 'routes', 'kakao_routes.json');
  const db = readJson(file, { pairs: {}, log: [] });
  let walk = 0, car = 0, stop = { walk: false, car: false };
  const jobs = [];
  for (const a of apts) for (const i of inst) {
    const d = haversine(a, i); const k = `${a.id}|${i.id}`; const cur = db.pairs[k] ?? {};
    if (d <= WALK_MAX_M && !cur.walk) jobs.push({ k, a, i, kind: 'walk', d });
    if (d <= CAR_MAX_M && !cur.car) jobs.push({ k, a, i, kind: 'car', d });
  }
  jobs.sort((x, y) => x.d - y.d); // 가까운 쌍부터
  for (const j of jobs) {
    if (j.kind === 'walk' && (stop.walk || walk >= WALK_DAILY)) continue;
    if (j.kind === 'car' && (stop.car || car >= CAR_DAILY)) continue;
    const p = (db.pairs[j.k] ??= {});
    if (j.kind === 'walk') {
      const r = await kakao('https://dapi.kakao.com/v2/routing/walk?' + new URLSearchParams({ start_x: String(j.a.lng), start_y: String(j.a.lat), end_x: String(j.i.lng), end_y: String(j.i.lat) })); walk++;
      if (r.quota) { stop.walk = true; continue; }
      const pr = r.json?.route?.properties;
      p.walk = pr ? { m: pr.totalDistance, s: pr.totalTime, at: today } : { m: null, s: null, at: today, note: r.json?.status ?? r.error ?? '조회 실패' };
    } else {
      const r = await kakao(`https://apis-navi.kakaomobility.com/v1/directions?origin=${j.a.lng},${j.a.lat}&destination=${j.i.lng},${j.i.lat}&summary=true`); car++;
      if (r.quota) { stop.car = true; continue; }
      const s = r.json?.routes?.[0];
      p.car = s?.result_code === 0 ? { m: s.summary.distance, s: s.summary.duration, at: today } : { m: null, s: null, at: today, note: s?.result_msg ?? r.error ?? '조회 실패' };
    }
    if ((walk + car) % 50 === 0) writeJson(file, db);
    await sleep(90);
  }
  const left = jobs.filter((j) => !db.pairs[j.k]?.[j.kind]).length;
  db.log.push({ at: today, walkCalls: walk, carCalls: car, quotaStop: stop, remaining: left });
  db.source = { walk: '카카오 로컬 API 도보 경로 조회 (/v2/routing/walk)', car: '카카오모빌리티 길찾기 (/v1/directions, 조회 시점 교통 기준 — 등원 시간대 교통이 아님)' };
  db.rules = { walkMaxStraightM: WALK_MAX_M, carMaxStraightM: CAR_MAX_M };
  writeJson(file, db);
  console.log(`도보 ${walk}회 · 자동차 ${car}회 계산, 남은 쌍 ${left}개${stop.walk || stop.car ? ' (사용량 한도로 멈춤 — 내일 이어서 실행)' : ''}`);
}

const cmd = process.argv[2];
if (import.meta.url === `file://${process.argv[1]}`) {
  ({ apartments, geocode, routes }[cmd] ?? (() => console.log('apartments | geocode | routes')))().catch((e) => { console.error(String(e.message).split(KEY ?? '\u0000').join('***')); process.exit(1); });
}
