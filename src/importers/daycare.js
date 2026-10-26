// 어린이집 기본정보 → 기관 레코드
// 주의: 아래 영문 항목명(crname, crtypename, class_cnt_00 …)은 어린이집정보공개포털 Open API에서
// 흔히 쓰이는 이름을 바탕으로 한 것이며, 이 환경에서 원본 명세를 열어 확인하지 못했다.
// 실제 자료를 받으면 `unmappedColumns`로 맞지 않는 열을 확인하고 COLS를 고친다.
// 공공데이터포털 '전국어린이집표준데이터' 등의 한글 열 이름도 함께 받는다.

import { fact, STATUS, SOURCE_KIND } from '../lib/fact.js';
import { clean, num, areaOf, classifyDaycareType, classifyStatus } from './common.js';

const COLS = {
  code: ['stcode', '어린이집코드'],
  name: ['crname', '어린이집명'],
  type: ['crtypename', '어린이집유형', '어린이집유형구분'],
  status: ['crstatusname', '운영현황', '운영현황구분'],
  addr: ['craddr', '상세주소', '소재지도로명주소', '주소'],
  tel: ['crtelno', '전화번호', '어린이집전화번호'],
  home: ['crhome', '홈페이지주소'],
  lat: ['la', '위도'],
  lng: ['lo', '경도'],
  capacity: ['crcapat', '정원', '정원수'],
  current: ['crchcnt', '현원', '현원수'],
  bus: ['crcargbname', 'CRCARGBNAME', '통학차량운영여부'],
  c0: ['class_cnt_00', '만0세반수'], c1: ['class_cnt_01', '만1세반수'], c2: ['class_cnt_02', '만2세반수'],
  c3: ['class_cnt_03', '만3세반수'], c4: ['class_cnt_04', '만4세반수'], c5: ['class_cnt_05', '만5세반수'],
  cm2: ['class_cnt_m2', '영아혼합반수'], cm5: ['class_cnt_m5', '유아혼합반수'], csp: ['class_cnt_sp', '특수장애반수'],
  k0: ['child_cnt_00', '만0세아동수'], k1: ['child_cnt_01', '만1세아동수'], k2: ['child_cnt_02', '만2세아동수'],
  k3: ['child_cnt_03', '만3세아동수'], k4: ['child_cnt_04', '만4세아동수'], k5: ['child_cnt_05', '만5세아동수'],
  km2: ['child_cnt_m2', '영아혼합아동수'], km5: ['child_cnt_m5', '유아혼합아동수'],
  asOf: ['기준일자', 'datastdrdt'],
};

function pick(row, key) {
  for (const k of COLS[key]) if (k in row) return row[k];
  return undefined;
}

export function knownColumns() {
  return new Set(Object.values(COLS).flat());
}

export function normalizeDaycare(row, opt) {
  const source = { kind: SOURCE_KIND.OFFICIAL_DISCLOSURE, name: opt.sourceName ?? '어린이집 기본정보', url: opt.sourceUrl, readMode: opt.readMode };
  const asOf = clean(pick(row, 'asOf')) ?? opt.asOf ?? null;
  const m = (v, extra = {}) => fact(v, { source, asOf, checkedAt: opt.checkedAt, status: STATUS.CONFIRMED, ...extra });

  const addr = clean(pick(row, 'addr'));
  const area = areaOf(addr, opt.areas);
  const type = classifyDaycareType(pick(row, 'type'));
  const st = classifyStatus(pick(row, 'status'));

  const ageClasses = [0, 1, 2, 3, 4, 5].map((a) => ({
    manAge: a,
    label: `만${a}세반(공시 구분)`,
    classCount: num(pick(row, `c${a}`)),
    enrolled: num(pick(row, `k${a}`)),
    capacity: null, // 연령별 정원은 기본정보에 없음 → 미확인
  }));
  const m5 = num(pick(row, 'cm5'));
  if (m5 !== null && m5 > 0) ageClasses.push({ manAge: null, mixedAges: [3, 4, 5], label: '유아혼합반(만3~5세 중 일부, 실제 구성 확인 필요)', classCount: m5, enrolled: num(pick(row, 'km5')), capacity: null, needsCheck: true });
  const m2 = num(pick(row, 'cm2'));
  if (m2 !== null && m2 > 0) ageClasses.push({ manAge: null, mixedAges: [0, 1, 2], label: '영아혼합반', classCount: m2, enrolled: num(pick(row, 'km2')), capacity: null });

  const flags = [];
  if (area.inScope === null) flags.push(area.note);
  if (type.needsCheck) flags.push(type.needsCheck);
  if (st.needsCheck) flags.push(st.needsCheck);
  if (type.restriction) flags.push(type.restriction);

  const exclude = type.exclude || !!st.exclude;
  const code = clean(pick(row, 'code'));
  return {
    id: code ? `daycare:${code}` : `daycare:${clean(pick(row, 'name'))}@${addr}`,
    officialId: code,
    idBasis: code ? '어린이집코드' : '이름+주소',
    kind: '어린이집',
    name: clean(pick(row, 'name')),
    sourceNames: [opt.sourceName].filter(Boolean),
    officialType: m(type.officialType),
    isPublic: type.officialType ? /국공립/.test(type.officialType) : null,
    operatingStatus: m(st.status ?? null),
    address: m(addr),
    area: area.area,
    areaBasis: '주소',
    inScope: area.inScope,
    location: { lat: num(pick(row, 'lat')), lng: num(pick(row, 'lng')) },
    phone: m(clean(pick(row, 'tel'))),
    homepage: m(clean(pick(row, 'home'))),
    ageClasses,
    totalCapacity: m(num(pick(row, 'capacity')), { unit: '명' }),
    totalEnrolled: m(num(pick(row, 'current')), { unit: '명' }),
    schoolBus: m(clean(pick(row, 'bus'))),
    exclude,
    excludeReason: type.exclude ? type.excludeReason : st.exclude ? st.excludeReason : null,
    restriction: type.restriction,
    flags,
    notes: [],
  };
}
