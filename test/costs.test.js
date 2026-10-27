// 유치원알리미 비용 공시 파싱 (프라임유치원 2026년 1차 공시 화면 일부를 그대로 저장한 견본)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCostPage, monthlyFor, won } from '../scripts/collect-costs.js';

const html = fs.readFileSync(new URL('./fixtures/kinder_cost_sample.html', import.meta.url), 'utf8');

test('금액 읽기: 쉼표·대쉬', () => {
  assert.equal(won('10,000'), 10000);
  assert.equal(won(' 0 '), 0);
  assert.equal(won('-'), null); // 운영 안 함 → 0으로 바꾸지 않음
});

test('비용 공시 화면 → 교육과정·방과후·특성화', () => {
  const p = parseCostPage(html);
  assert.equal(p.asOf, '2026년 1학기');
  assert.equal(p.round, '2026년 1차');
  assert.equal(p.course.합계.m3, 0);
  assert.equal(p.course.수업료.m3, null); // 공시 표기 '-'
  assert.ok(p.afterSchool.합계);
  assert.equal(p.special[3].total, 40000);
  assert.equal(p.special[3].programs.length, 3);
  assert.deepEqual(p.special[3].programs[2], { area: '언어', name: '영어', vendor: '굿키즈에듀', perWeek: 1, minutes: 25, fee: 30000 });
});

test('한 달 합계: 모르는 값이 있으면 known=false', () => {
  const p = parseCostPage(html);
  const m = monthlyFor(p, 3);
  assert.equal(m.total, 40000);
  assert.equal(m.known, true);
  const broken = { ...p, afterSchool: null };
  assert.equal(monthlyFor(broken, 3).known, false);
});
