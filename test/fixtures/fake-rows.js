// 가상 테스트 데이터 — 실제 기관 아님
export const kinderRows = [
  { kindercode: 'TEST-K1', kindername: '가상해님유치원', establish: '공립(단설)', addr: '충청남도 아산시 배방읍 가상로 1', clcnt3: '1', clcnt4: '1', clcnt5: '2', mixclcnt: '0', ppcnt3: '16', pbnttmng: '20261' },
  { kindercode: 'TEST-K2', kindername: '가상달님유치원', establish: '사립(사인)', addr: '충청남도 아산시 북수로99번길 9', clcnt3: '', clcnt4: '', clcnt5: '', pbnttmng: '20261' },
  { kindercode: 'TEST-K1', kindername: '가상해님유치원', establish: '공립(단설)', addr: '충청남도 아산시 배방읍 가상로 1', clcnt3: '1', clcnt4: '1', clcnt5: '2', pbnttmng: '20261' }, // 페이지 중복
  { kindercode: 'TEST-K3', kindername: '가상별님유치원', establish: '사립(법인)', addr: '충청남도 아산시 음봉면 가상로 3', clcnt3: '1', clcnt4: '1', clcnt5: '1', pbnttmng: '20261' },
];
export const daycareRows = [
  { stcode: 'TEST-D1', crname: '가상숲어린이집', crtypename: '가정', crstatusname: '정상', craddr: '충청남도 아산시 배방읍 가상로 5', class_cnt_00: '1', class_cnt_01: '2', class_cnt_03: '0' },
  { stcode: 'TEST-D2', crname: '가상나무어린이집', crtypename: '국공립', crstatusname: '정상', craddr: '충청남도 아산시 탕정면 가상로 6', class_cnt_00: '1', class_cnt_01: '1', class_cnt_02: '1', class_cnt_03: '0', class_cnt_04: '0', class_cnt_05: '0', class_cnt_m5: '0' },
  { stcode: 'TEST-D3', crname: '가상하늘어린이집', crtypename: '직장', crstatusname: '정상', craddr: '충청남도 아산시 탕정면 가상로 7', class_cnt_03: '1', class_cnt_04: '1', class_cnt_05: '1' },
  { stcode: 'TEST-D4', crname: '가상해님유치원', crtypename: '민간', crstatusname: '정상', craddr: '충청남도 아산시 배방읍 다른로 8', class_cnt_03: '0', class_cnt_04: '0', class_cnt_05: '0', class_cnt_m5: '1' },
  { stcode: 'TEST-D5', crname: '가상구름어린이집', crtypename: '민간', crstatusname: '폐지', craddr: '충청남도 아산시 배방읍 가상로 9', class_cnt_03: '1' },
];

// 출처 간 합치기용 — 같은 가상 유치원이 일괄자료(코드 없음·한글 열)와 API(코드 있음)로 들어온 경우
export const bulkStyleRows = [
  { 유치원명: '가상꽃님유치원', 설립유형: '사립(사인)', 주소: '충청남도 아산시 배방읍 꽃길 1', 전화번호: '041-000-0001', 홈페이지: ' ', 만3세학급수: '2', 만4세학급수: '2', 만5세학급수: '1', 혼합학급수: '0', 만3세원아수: '30', 공시차수: '20262' },
  { 유치원명: '가상잎새유치원', 설립유형: '공립(병설)', 주소: '충청남도 아산시 탕정면 잎길 2', 만3세학급수: '1', 만4세학급수: '1', 만5세학급수: '1', 공시차수: '20262' },
];
export const apiStyleRows = [
  { kindercode: 'TEST-K10', kindername: '가상꽃님유치원', establish: '사립(사인)', addr: '충청남도 아산시 배방읍  꽃길 1', telno: '041-000-0001', hpaddr: 'http://example.test', opertime: '08시00분~18시00분', clcnt3: '2', clcnt4: '2', clcnt5: '1', ppcnt3: '30', pbnttmng: '20262' },
  // 같은 이름·주소지만 코드가 다른 두 기관 → 합치지 않음
  { kindercode: 'TEST-K11', kindername: '가상쌍둥이유치원', establish: '사립(사인)', addr: '충청남도 아산시 배방읍 쌍길 3', clcnt3: '1', clcnt4: '1', clcnt5: '1', pbnttmng: '20262' },
  { kindercode: 'TEST-K12', kindername: '가상쌍둥이유치원', establish: '사립(사인)', addr: '충청남도 아산시 배방읍 쌍길 3', clcnt3: '1', clcnt4: '1', clcnt5: '1', pbnttmng: '20262' },
  // 예전 공시에만 남은 기관
  { kindercode: 'TEST-K13', kindername: '가상옛날유치원', establish: '공립(병설)', addr: '충청남도 아산시 배방읍 옛길 4', clcnt3: '1', clcnt4: '1', clcnt5: '1', pbnttmng: '20242' },
];
// 키 전용 항목 API 응답 모양 (가상)
export const apiExtraRows = {
  afterSchoolPresent: [{ kindercode: 'TEST-K10', inor_clcnt: '3', pm_rrgn_clcnt: '0', oper_time: '07시40분~19시30분', inor_ptcn_kpcnt: '45', pm_rrgn_ptcn_kpcnt: '0', fxrl_thcnt: '2', shcnt_thcnt: '1', incnt: '0', cce_tcr_cnt: '', etc_thts_cnt: '0', pbnttmng: '20261' }],
  classArea: [{ kindercode: 'TEST-K10', crcnt: '5개', clsrarea: '300㎡', phgrindrarea: '0㎡', hlsparea: '', ktchmssparea: '50㎡', otsparea: '이상한값', pbnttmng: '20261' }],
  building: [{ kindercode: 'TEST-K10', archyy: '2015년', floorcnt: '지상3층/ 지하1층', bldgprusarea: '1,200㎡', grottar: '900㎡', pbnttmng: '20261' }],
  lessonDay: [{ kindercode: 'TEST-K10', ag3_lsn_dcnt: '190', ag4_lsn_dcnt: '190', ag5_lsn_dcnt: '0', mix_age_lsn_dcnt: '0', spcl_lsn_dcnt: '0', afsc_pros_lsn_dcnt: '230', ldnum_blw_yn: 'N', pbnttmng: '20261' }],
  safetyEdu: [{ kindercode: 'TEST-K10', plyg_ck_yn: 'Y', plyg_ck_dt: '20260904', plyg_ck_rs_cd: '적합', cctv_ist_yn: 'Y', cctv_ist_total: '20', cctv_ist_in: '15', cctv_ist_out: '5', fire_avd_yn: 'Y', fire_avd_dt: null, fire_safe_yn: 'Y', fire_safe_dt: '20260304', gas_ck_yn: 'Y', gas_ck_dt: null, elect_ck_yn: 'Y', elect_ck_dt: '20260304', pbnttmng: '20262' }],
};
