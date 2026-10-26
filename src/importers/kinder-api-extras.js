// 유치원알리미 Open API(인증키 필요) 추가 공시 항목을 기관 레코드에 붙인다.
// 연결: 유치원코드(kindercode) = 레코드의 officialId
// 항목 뜻은 유치원알리미 Open API 안내 페이지(/openApi/history/<항목>.do)의 출력 항목 설명을 따른다.
// - 값이 비어 있거나 모양을 알 수 없으면 null(미확인). 0으로 채우지 않는다.
// - 공시에 0으로 적힌 값은 공시값 0으로 둔다(빈칸과 구분).
// - 방과후 담당 인원은 직위별 공시값이다. 서로 더하거나 반별 배치로 쓰지 않는다.

import { fact, STATUS, SOURCE_KIND } from '../lib/fact.js';
import { clean } from './common.js';

export const API_EXTRA_ENDPOINTS = {
  afterSchoolPresent: '방과후 과정 편성·운영 현황',
  classArea: '교실 면적 현황',
  building: '건물 현황',
  lessonDay: '수업일수 현황',
  safetyEdu: '안전점검·안전교육 현황',
};

/** '201㎡' → 201, '2개' → 2, '1977년' → 1977. 숫자 하나가 아닌 모양이면 null */
export function unitNum(v) {
  const s = clean(v);
  if (s === null) return null;
  const m = s.replace(/,/g, '').match(/^(-?\d+(?:\.\d+)?)\s*(㎡|m2|개|년|명|일|대)?$/);
  return m ? Number(m[1]) : null;
}

/** '08시30분~18시30분' → '08:30~18:30'. 모양이 다르면 원문 그대로(빈칸이면 null) */
export function hhmmRange(v) {
  const s = clean(v);
  if (s === null) return null;
  const m = s.match(/^(\d{1,2})시\s*(\d{1,2})분\s*~\s*(\d{1,2})시\s*(\d{1,2})분$/);
  if (!m) return s;
  const p = (x) => x.padStart(2, '0');
  return `${p(m[1])}:${p(m[2])}~${p(m[3])}:${p(m[4])}`;
}

/** '지상3층/ 지하1층' → { 지상: 3, 지하: 1 } */
export function floors(v) {
  const s = clean(v);
  if (s === null) return { 지상: null, 지하: null };
  const up = s.match(/지상\s*(\d+)\s*층/);
  const down = s.match(/지하\s*(\d+)\s*층/);
  return { 지상: up ? Number(up[1]) : null, 지하: down ? Number(down[1]) : null };
}

/** '20260904' → '2026-09-04' */
export function ymd(v) {
  const s = clean(v);
  if (s === null) return null;
  const m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : s;
}

/** 'Y' → '예', 'N' → '아니오', 그 밖은 원문 */
export function yn(v) {
  const s = clean(v);
  if (s === null) return null;
  return s === 'Y' ? '예' : s === 'N' ? '아니오' : s;
}

const roundLabel = (t) => (t && /^\d{5}$/.test(t) ? `${t.slice(0, 4)}년 ${t[4]}차 공시` : t ?? null);

const cache = new WeakMap();
function indexByCode(apiExtras) {
  if (!cache.has(apiExtras)) {
    const out = {};
    for (const [ep, x] of Object.entries(apiExtras)) {
      if (!x?.rows) { out[ep] = null; continue; }
      const m = new Map();
      for (const r of x.rows) { const c = clean(r.kindercode); if (c) m.set(c, r); }
      out[ep] = { idx: m, url: x.url };
    }
    cache.set(apiExtras, out);
  }
  return cache.get(apiExtras);
}

/**
 * @param {object} rec  유치원 레코드 (officialId 필요)
 * @param {Record<string, {rows?:object[], url?:string, error?:string}>} apiExtras  항목별 API 응답
 * @param {{checkedAt:string}} meta
 * @returns {string[]} 붙인 항목 이름
 */
export function attachKinderApiExtras(rec, apiExtras, meta) {
  if (!rec.officialId) return [];
  const ix = indexByCode(apiExtras);
  const attached = [];
  const get = (ep) => ix[ep]?.idx.get(rec.officialId);
  const mk = (ep, row) => (value, unit, note) => {
    const f = fact(value, {
      unit,
      source: { kind: SOURCE_KIND.OFFICIAL_DISCLOSURE, name: `유치원알리미 Open API ${API_EXTRA_ENDPOINTS[ep]}`, url: ix[ep]?.url, readMode: 'API 응답 원문' },
      asOf: roundLabel(clean(row.pbnttmng)),
      checkedAt: meta.checkedAt,
      status: STATUS.CONFIRMED,
    });
    if (note) f.note = note;
    return f;
  };
  // 객체 값: 칸이 모두 비어 있으면 전체를 미확인으로
  const obj = (o) => (Object.values(o).every((x) => x === null) ? null : o);

  // 방과후 과정 편성·운영 현황
  let r = get('afterSchoolPresent');
  if (r) {
    const f = mk('afterSchoolPresent', r);
    rec.afterSchool = {
      hours: f(hhmmRange(r.oper_time), null, '방과후 과정 운영시간(공시값). 정규과정 시간은 따로 공시되지 않음'),
      classes: f(obj({ 독립편성학급수: unitNum(r.inor_clcnt), 오후재편성학급수: unitNum(r.pm_rrgn_clcnt), 독립편성참여원아수: unitNum(r.inor_ptcn_kpcnt), 오후재편성참여원아수: unitNum(r.pm_rrgn_ptcn_kpcnt) })),
      staff: f(obj({ 정규교사수: unitNum(r.fxrl_thcnt), 기간제교사수: unitNum(r.shcnt_thcnt), '전담사수(구)': unitNum(r.incnt), '보육교사수(신)': unitNum(r.cce_tcr_cnt), '기타전담사수(신)': unitNum(r.etc_thts_cnt) }), '명', '방과후 과정 담당 인원(기관 전체, 직위별). 더하거나 반별 배치로 보지 않음'),
    };
    attached.push('afterSchoolPresent');
  }

  // 교실 면적 현황
  r = get('classArea');
  if (r) {
    const f = mk('classArea', r);
    rec.facilityArea = f(obj({ 교실수: unitNum(r.crcnt), 교실면적: unitNum(r.clsrarea), 체육장면적: unitNum(r.phgrindrarea), 보건위생공간면적: unitNum(r.hlsparea), 조리실급식공간면적: unitNum(r.ktchmssparea), 기타공간면적: unitNum(r.otsparea) }), '㎡(교실수는 개)');
    rec.playgroundArea = f(unitNum(r.phgrindrarea), '㎡', "공시 항목명 '체육장'. 실내·실외 구분 없음. 0㎡는 공시값(병설은 초등학교 운동장을 함께 쓰는지 확인 필요)");
    attached.push('classArea');
  }

  // 건물 현황
  r = get('building');
  if (r) {
    const f = mk('building', r);
    const fl = floors(r.floorcnt);
    rec.building = f(obj({ 건축년도: unitNum(r.archyy), 지상층수: fl.지상, 지하층수: fl.지하, 건물전용면적: unitNum(r.bldgprusarea), 대지총면적: unitNum(r.grottar) }), '㎡(건축년도·층수 제외)', /병설/.test(rec.officialType?.value ?? '') ? '병설: 건물·대지가 초등학교 전체 기준일 수 있음' : undefined);
    attached.push('building');
  }

  // 수업일수 현황
  r = get('lessonDay');
  if (r) {
    const f = mk('lessonDay', r);
    rec.lessonDays = f(obj({ 만3세: unitNum(r.ag3_lsn_dcnt), 만4세: unitNum(r.ag4_lsn_dcnt), 만5세: unitNum(r.ag5_lsn_dcnt), 혼합연령: unitNum(r.mix_age_lsn_dcnt), 특수학급: unitNum(r.spcl_lsn_dcnt), 방과후과정: unitNum(r.afsc_pros_lsn_dcnt), 법정일수이하: yn(r.ldnum_blw_yn) }), '일', '해당 반이 없는 연령은 0일로 공시됨');
    attached.push('lessonDay');
  }

  // 안전점검·안전교육 현황
  r = get('safetyEdu');
  if (r) {
    const f = mk('safetyEdu', r);
    rec.safety = f(obj({
      놀이시설안전검사대상: yn(r.plyg_ck_yn), 놀이시설점검일: ymd(r.plyg_ck_dt), 놀이시설점검결과: clean(r.plyg_ck_rs_cd),
      CCTV설치: yn(r.cctv_ist_yn), CCTV총: unitNum(r.cctv_ist_total), CCTV건물안: unitNum(r.cctv_ist_in), CCTV건물밖: unitNum(r.cctv_ist_out),
      소방대피훈련: yn(r.fire_avd_yn), 소방대피훈련일: ymd(r.fire_avd_dt), 소방안전점검: yn(r.fire_safe_yn), 소방안전점검일: ymd(r.fire_safe_dt),
      가스점검: yn(r.gas_ck_yn), 가스점검일: ymd(r.gas_ck_dt), 전기설비점검: yn(r.elect_ck_yn), 전기설비점검일: ymd(r.elect_ck_dt),
    }));
    attached.push('safetyEdu');
  }

  if (attached.includes('afterSchoolPresent')) {
    rec.missing = (rec.missing ?? []).map((x) => (x === '운영시간(정규·방과후)' ? '정규과정 시작·끝 시간(공시는 방과후 운영시간만)' : x));
  }
  return attached;
}
