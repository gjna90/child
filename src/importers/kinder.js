// 유치원알리미 '기본현황(basicInfo2)' 자료 → 기관 레코드
// 항목명은 유치원알리미 Open API 응답 기준 (kindercode, kindername, establish, clcnt3 …).
// 같은 항목이 일괄 다운로드(엑셀/CSV)에서는 한글 열 이름으로 오므로 둘 다 받는다.

import { fact, STATUS, SOURCE_KIND } from '../lib/fact.js';
import { clean, num, areaOf, classifyStatus } from './common.js';

const COLS = {
  code: ['kindercode', '유치원코드'],
  name: ['kindername', '유치원명'],
  establish: ['establish', '설립유형'],
  officeedu: ['officeedu', '교육청명'],
  subofficeedu: ['subofficeedu', '교육지원청명'],
  addr: ['addr', '주소'],
  tel: ['telno', '전화번호'],
  home: ['hpaddr', '홈페이지'],
  opertime: ['opertime', '운영시간'],
  odate: ['odate', '개원일'],
  lat: ['lttdcdnt', '위도'],
  lng: ['lngtcdnt', '경도'],
  pbnttmng: ['pbnttmng', '공시차수'],
  clcnt3: ['clcnt3', '만3세학급수'], clcnt4: ['clcnt4', '만4세학급수'], clcnt5: ['clcnt5', '만5세학급수'],
  mixclcnt: ['mixclcnt', '혼합학급수'], shclcnt: ['shclcnt', '특수학급수'],
  ppcnt3: ['ppcnt3', '만3세원아수'], ppcnt4: ['ppcnt4', '만4세원아수'], ppcnt5: ['ppcnt5', '만5세원아수'],
  mixppcnt: ['mixppcnt', '혼합원아수'],
  fp3: ['ag3fpcnt', '만3세정원수', '3세정원수'], fp4: ['ag4fpcnt', '만4세정원수', '4세정원수'], fp5: ['ag5fpcnt', '만5세정원수', '5세정원수'],
  mixfp: ['mixfpcnt', '혼합정원수'], totalfp: ['prmstfcnt', '인가총정원수'],
  shfp: ['spcnfpcnt', '특수학급정원수'], shpp: ['shppcnt', '특수원아수'],
  rep: ['rppnname', '대표자명'], principal: ['ldgrname', '원장명'], edate: ['edate', '설립일'], fax: ['faxno', '팩스번호'],
};

function pick(row, key) {
  for (const k of COLS[key]) if (k in row) return row[k];
  return undefined;
}

export function knownColumns() {
  return new Set(Object.values(COLS).flat());
}

/**
 * @param {object} row  API 한 건
 * @param {{checkedAt:string, sourceUrl:string, readMode:string, areas?:string[]}} opt
 */
export function normalizeKinder(row, opt) {
  const source = { kind: SOURCE_KIND.OFFICIAL_DISCLOSURE, name: '유치원알리미 기본현황', url: opt.sourceUrl, readMode: opt.readMode };
  const asOf = clean(pick(row, 'pbnttmng'));
  const m = (v, extra = {}) => fact(v, { source, asOf, checkedAt: opt.checkedAt, status: STATUS.CONFIRMED, ...extra });

  const addr = clean(pick(row, 'addr'));
  const area = areaOf(addr, opt.areas);
  // 일괄 공시자료에는 운영상태 열이 없다. 최신 공시에 실렸다는 사실만 기록하고 '운영 중'으로 단정하지 않는다.
  const rawStatus = row.status ?? row['운영상태'];
  const st = rawStatus === undefined ? { status: null, note: '운영상태 열 없음 — 최신 공시 명단에 포함됨' } : classifyStatus(rawStatus);
  const establish = clean(pick(row, 'establish'));

  const ageClasses = [3, 4, 5].map((a) => ({
    manAge: a,
    label: `만${a}세반(공시 구분)`,
    classCount: num(pick(row, `clcnt${a}`)),
    enrolled: num(pick(row, `ppcnt${a}`)),
    capacity: num(pick(row, `fp${a}`)),
  }));
  const mixCount = num(pick(row, 'mixclcnt'));
  if (mixCount !== null && mixCount > 0) {
    // 공시만으로는 혼합반에 어떤 연령이 섞였는지 알 수 없다 → 확인 필요
    ageClasses.push({ manAge: null, mixedAges: [3, 4, 5], label: '혼합연령반(만3~5세 중 일부, 포함 연령 확인 필요)', classCount: mixCount, enrolled: num(pick(row, 'mixppcnt')), capacity: num(pick(row, 'mixfp')), needsCheck: true });
  }

  const flags = [];
  if (area.inScope === null) flags.push(area.note);
  if (st.needsCheck) flags.push(st.needsCheck);
  const notes = st.note ? [st.note] : [];

  const code = clean(pick(row, 'code'));
  const name = clean(pick(row, 'name'));
  return {
    // 일괄 다운로드에는 유치원코드가 없다 → 이름+주소로 식별 (API 자료가 들어오면 코드로 대체)
    id: code ? `kinder:${code}` : `kinder:${name}@${addr}`,
    officialId: code,
    idBasis: code ? '유치원코드' : '이름+주소 (일괄 다운로드에 코드 없음)',
    kind: '유치원',
    name,
    officialType: m(establish), // 예: 공립(단설), 공립(병설), 사립(사인), 사립(법인)
    isPublic: establish ? /공립|국립/.test(establish) : null,
    operatingStatus: m(st.status ?? null),
    address: m(addr),
    area: area.area,
    areaBasis: '주소',
    inScope: area.inScope,
    location: { lat: num(pick(row, 'lat')), lng: num(pick(row, 'lng')) },
    phone: m(clean(pick(row, 'tel'))),
    homepage: m(clean(pick(row, 'home'))),
    operatingHours: m(clean(pick(row, 'opertime'))),
    openedAt: m(clean(pick(row, 'odate'))),
    office: { edu: clean(pick(row, 'officeedu')), subEdu: clean(pick(row, 'subofficeedu')) },
    ageClasses,
    totalCapacity: m(num(pick(row, 'totalfp')), { unit: '명' }),
    exclude: !!st.exclude,
    excludeReason: st.exclude ? st.excludeReason : null,
    restriction: null,
    flags,
    notes,
    disclosureRound: asOf,
  };
}
