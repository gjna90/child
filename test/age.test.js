import { test } from 'node:test';
import assert from 'node:assert/strict';
import { manAgeClass, describeChildClass, interpretClassName, eligibility } from '../src/lib/age.js';

test('2027학년도 만 연령반 계산', () => {
  assert.equal(manAgeClass(2023, 2027), 3);
  assert.equal(manAgeClass(2022, 2027), 4);
  assert.equal(manAgeClass(2021, 2027), 5);
});

test("'5세반'을 만5세반으로 단정하지 않는다", () => {
  const r = interpretClassName('5세반', 2027);
  assert.equal(r.status, '대상 여부 확인 필요');
  assert.deepEqual(r.manAges, []);
  const years = r.candidates.map((c) => c.birthYears[0]).sort();
  assert.deepEqual(years, [2021, 2023]); // 세는나이면 2023년생, 만 나이면 2021년생
});

test('같은 기관에 7세반이 있으면 5세반 = 만3세반(2023년생)으로 추정하되 확인 필요', () => {
  const r = interpretClassName('5세 햇살반', 2027, { siblingNames: ['5세 햇살반', '6세 바다반', '7세 하늘반'] });
  assert.deepEqual(r.manAges, [3]);
  assert.deepEqual(r.birthYears, [2023]);
  assert.equal(r.status, '대상 여부 확인 필요');
});

test('6·7세반은 만6·7세반이 없으므로 세는나이로 확정', () => {
  assert.deepEqual(interpretClassName('7세반', 2027).birthYears, [2021]);
  assert.equal(interpretClassName('7세반', 2027).status, '확인됨');
});

test("'만4세'·출생연도·범위 표기", () => {
  assert.deepEqual(interpretClassName('만4세 해님반', 2027).birthYears, [2022]);
  assert.deepEqual(interpretClassName('꽃잎반(2023년생)', 2027).manAges, [3]);
  const mix = interpretClassName('혼합반(만3~5세)', 2027);
  assert.equal(mix.mixed, true);
  assert.deepEqual(mix.birthYears, [2023, 2022, 2021]);
});

test('아이 설명: 2023년생은 2027학년도 만3세반 = 옛 표기 5세반', () => {
  const d = describeChildClass(2023, 2027);
  assert.equal(d.label, '만3세반');
  assert.match(d.countingLabel, /^5세반/);
});

test('유아반 보유와 해당 아이 반 존재를 구분', () => {
  const inst = { ageClasses: [{ manAge: 3, classCount: 0 }, { manAge: 4, classCount: 0 }, { manAge: 5, classCount: 2 }] };
  const e = eligibility(inst, 3);
  assert.equal(e.hasPreschoolClass, '있음');
  assert.match(e.childClass, /현재 공시상 없음/);
  assert.equal(eligibility(inst, 5).childClass, '현재 운영 중');
});

test('반 정보가 비어 있으면 미확인(없음으로 처리하지 않음)', () => {
  const e = eligibility({ ageClasses: [{ manAge: 3, classCount: null }] }, 3);
  assert.equal(e.hasPreschoolClass, '미확인');
  assert.equal(e.childClass, '미확인');
});

test('혼합연령반만 있는 유치원은 유아반 있음, 아이 반은 확인 필요', () => {
  const inst = { ageClasses: [{ manAge: 3, classCount: 0 }, { manAge: 4, classCount: 0 }, { manAge: 5, classCount: 0 }, { manAge: null, mixedAges: [3, 4, 5], classCount: 1 }] };
  const e = eligibility(inst, 3);
  assert.equal(e.hasPreschoolClass, '있음');
  assert.match(e.childClass, /혼합연령반만/);
});
