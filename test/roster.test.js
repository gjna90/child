import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRoster } from '../src/importers/roster.js';
import { fact, mergeFact, STATUS } from '../src/lib/fact.js';
import { parseCsv } from '../scripts/collect.js';
import { kinderRows, daycareRows } from './fixtures/fake-rows.js';

const roster = buildRoster(
  [
    { kind: '유치원', name: '가상 유치원 자료', url: 'test', rows: kinderRows, readMode: 'test' },
    { kind: '어린이집', name: '가상 어린이집 자료', url: 'test', rows: daycareRows, readMode: 'test' },
  ],
  { checkedAt: '2026-10-26', schoolYear: 2027, areas: ['배방읍', '탕정면'], childManAge: 3 },
);
const find = (id) => [...roster.included, ...roster.needsCheck, ...roster.excluded, ...roster.outOfArea].find((r) => r.id === id);

test('가정어린이집 제외', () => {
  assert.ok(roster.excluded.some((r) => r.id === 'daycare:TEST-D1' && /가정/.test(r.excludeReason)));
});
test('폐지 기관 제외', () => {
  assert.ok(roster.excluded.some((r) => r.id === 'daycare:TEST-D5'));
});
test('유아반 없는 어린이집(만0~2세만) 제외', () => {
  assert.ok(roster.excluded.some((r) => r.id === 'daycare:TEST-D2' && /유아반/.test(r.excludeReason)));
});
test('직장어린이집은 제한 조건과 함께 확인 필요로 분류', () => {
  const r = find('daycare:TEST-D3');
  assert.ok(roster.needsCheck.includes(r));
  assert.match(r.restriction, /이용 자격/);
});
test('같은 식별자 중복 제거', () => {
  assert.equal(roster.counts.duplicatesRemoved, 1);
});
test('같은 이름의 다른 기관은 합치지 않고 경고', () => {
  assert.equal(roster.sameName.length, 1);
  assert.equal(roster.sameName[0].ids.length, 2);
  assert.ok(find('kinder:TEST-K1').notes.some((n) => /같은 이름/.test(n)));
});
test('주소에 읍·면이 없으면 지역 확인 필요, 반 정보 빈칸은 미확인', () => {
  const r = find('kinder:TEST-K2');
  assert.equal(r.inScope, null);
  assert.equal(r.eligibility.hasPreschoolClass, '미확인');
  assert.equal(r.ageClasses[0].classCount, null); // 0으로 바꾸지 않음
});
test('다른 읍면 기관은 범위 밖', () => {
  assert.ok(roster.outOfArea.some((r) => r.id === 'kinder:TEST-K3'));
});
test('유아혼합반은 포함 연령 확인 필요 표시', () => {
  const r = find('daycare:TEST-D4');
  assert.equal(r.eligibility.hasPreschoolClass, '있음');
  assert.ok(r.ageClasses.some((c) => c.needsCheck));
});
test('전체 명부와 대조 전에는 완료로 표시하지 않음', () => {
  assert.equal(roster.rosterComplete, false);
});

test('수집 실패 시 기존 값·확인일 유지, 사용자 기록 보존', () => {
  const old = fact(3, { status: STATUS.CONFIRMED, checkedAt: '2026-10-01', source: { kind: 'x', name: 'x' } });
  assert.equal(mergeFact(old, null).checkedAt, '2026-10-01');
  const user = fact('상담 때 2학급 예정이라고 들음', { status: STATUS.USER, checkedAt: '2026-10-20' });
  const auto = fact('1학급', { status: STATUS.CONFIRMED, checkedAt: '2026-10-26' });
  const merged = mergeFact(user, auto);
  assert.equal(merged.value, '상담 때 2학급 예정이라고 들음');
  assert.equal(merged.history.length, 1);
  const changed = mergeFact(old, fact(4, { status: STATUS.CONFIRMED, checkedAt: '2026-10-26' }));
  assert.equal(changed.value, 4);
  assert.equal(changed.history[0].value, 3);
});

test('미확인 값은 null', () => {
  assert.equal(fact('', { status: STATUS.CONFIRMED }).status, STATUS.UNKNOWN);
});

test('CSV 읽기(따옴표·쉼표)', () => {
  const rows = parseCsv('﻿유치원명,주소\n"가상, 유치원","아산시 ""배방읍"""\n');
  assert.equal(rows[0]['유치원명'], '가상, 유치원');
  assert.equal(rows[0]['주소'], '아산시 "배방읍"');
});
