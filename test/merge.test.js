import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRoster } from '../src/importers/roster.js';
import { attachKinderApiExtras, unitNum, hhmmRange, floors, ymd } from '../src/importers/kinder-api-extras.js';
import { STATUS } from '../src/lib/fact.js';
import { bulkStyleRows, apiStyleRows, apiExtraRows } from './fixtures/fake-rows.js';

const roster = buildRoster(
  [
    { kind: '유치원', name: '가상 일괄자료', url: 'test-bulk', rows: bulkStyleRows, readMode: 'test' },
    { kind: '유치원', name: '가상 API', url: 'test-api', rows: apiStyleRows, readMode: 'test' },
  ],
  { checkedAt: '2026-10-26', schoolYear: 2027, areas: ['배방읍', '탕정면'], childManAge: 3 },
);
const all = [...roster.included, ...roster.needsCheck, ...roster.excluded, ...roster.outOfArea];

test('일괄자료와 API의 같은 유치원(이름+주소)은 하나로 합치고 유치원코드를 붙임', () => {
  const list = all.filter((r) => r.name === '가상꽃님유치원');
  assert.equal(list.length, 1);
  const r = list[0];
  assert.equal(r.id, 'kinder:TEST-K10');
  assert.equal(r.officialId, 'TEST-K10');
  assert.equal(r.mergedFrom.length, 2);
  assert.deepEqual(r.sourceNames.sort(), ['가상 API', '가상 일괄자료']);
  assert.equal(roster.counts.mergedAcrossSources, 1);
  assert.equal(roster.counts.duplicatesRemoved, 0);
});
test('합칠 때 한쪽에만 있는 값은 채우고(운영시간·홈페이지), 같은 값은 불일치로 보지 않음', () => {
  const r = all.find((x) => x.name === '가상꽃님유치원');
  assert.equal(r.operatingHours.value, '08시00분~18시00분');
  assert.equal(r.homepage.value, 'http://example.test');
  assert.equal(r.phone.status, STATUS.CONFIRMED);
});
test('코드 없는 기관은 그대로 이름+주소 식별자 유지', () => {
  const r = all.find((x) => x.name === '가상잎새유치원');
  assert.equal(r.officialId, null);
  assert.match(r.id, /^kinder:가상잎새유치원@/);
});
test('같은 이름·주소라도 코드가 다르면 합치지 않음', () => {
  assert.equal(all.filter((r) => r.name === '가상쌍둥이유치원').length, 2);
  assert.ok(roster.sameName.some((s) => s.name === '가상쌍둥이유치원'));
});
test('최신 공시에 없는 기관은 운영 중으로 단정하지 않고 확인 필요', () => {
  const r = all.find((x) => x.name === '가상옛날유치원');
  assert.ok(roster.needsCheck.includes(r));
  assert.ok(r.flags.some((f) => /최신 공시\(20262\)에 없음/.test(f)));
});

test('값 모양 읽기: 단위 붙은 숫자·시간·층수·날짜', () => {
  assert.equal(unitNum('1,200㎡'), 1200);
  assert.equal(unitNum('5개'), 5);
  assert.equal(unitNum('0㎡'), 0);
  assert.equal(unitNum(''), null);
  assert.equal(unitNum('이상한값'), null);
  assert.equal(hhmmRange('07시40분~19시30분'), '07:40~19:30');
  assert.equal(hhmmRange(' '), null);
  assert.deepEqual(floors('지상3층/ 지하1층'), { 지상: 3, 지하: 1 });
  assert.equal(ymd('20260904'), '2026-09-04');
  assert.equal(ymd(null), null);
});

test('키 전용 항목: 유치원코드로 붙이고, 빈칸·모르는 값은 null(0으로 채우지 않음)', () => {
  const r = all.find((x) => x.name === '가상꽃님유치원');
  const extras = Object.fromEntries(Object.entries(apiExtraRows).map(([ep, rows]) => [ep, { rows, url: `test-${ep}` }]));
  const got = attachKinderApiExtras(r, extras, { checkedAt: '2026-10-26' });
  assert.equal(got.length, 5);
  assert.equal(r.afterSchool.hours.value, '07:40~19:30');
  assert.equal(r.afterSchool.hours.asOf, '2026년 1차 공시');
  assert.equal(r.afterSchool.staff.value['보육교사수(신)'], null);
  assert.equal(r.facilityArea.value.보건위생공간면적, null);
  assert.equal(r.facilityArea.value.기타공간면적, null);
  assert.equal(r.playgroundArea.value, 0); // 공시값 0은 0으로 둠
  assert.equal(r.building.value.건물전용면적, 1200);
  assert.equal(r.safety.value.가스점검일, null);
  assert.equal(r.safety.asOf, '2026년 2차 공시');
});
test('키 전용 항목: 코드 없는 기관·항목 수집 실패면 붙이지 않음(확인일 그대로)', () => {
  const noCode = all.find((x) => x.name === '가상잎새유치원');
  assert.deepEqual(attachKinderApiExtras(noCode, { afterSchoolPresent: { rows: apiExtraRows.afterSchoolPresent } }, { checkedAt: '2026-10-26' }), []);
  const r = all.find((x) => x.name === '가상옛날유치원');
  assert.deepEqual(attachKinderApiExtras(r, { classArea: { error: '조회 실패' } }, { checkedAt: '2026-10-26' }), []);
  assert.equal(r.facilityArea, undefined);
});
