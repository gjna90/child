import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linear, costValue, composite, mustStatus, rankComposite, rankPriority, familyStatus } from '../src/lib/recommend.js';

test('직선 변환: 괜찮은 값=1, 최대=0, 모르면 null', () => {
  assert.equal(linear(1, 1, 3), 1);
  assert.equal(linear(3, 1, 3), 0);
  assert.equal(linear(2, 1, 3), 0.5);
  assert.equal(linear(5, 1, 3), 0);
  assert.equal(linear(null, 1, 3), null);
  assert.equal(linear(20, 16, 24), 0.5);
});

test('비용: 예산 50% 이하=1, 예산=0.3, 초과=0, 모르면 null', () => {
  assert.equal(costValue(100000, 400000), 1);
  assert.equal(Math.round(costValue(400000, 400000) * 100) / 100, 0.3);
  assert.equal(costValue(500000, 400000), 0);
  assert.equal(costValue(null, 400000), null);
});

test('종합 지표는 확인된 기준만으로 계산하고 확인 정도를 따로 냄', () => {
  const r = composite([{ key: 'a', weight: 3, value: 1 }, { key: 'b', weight: 2, value: 0 }, { key: 'c', weight: 1, value: null }]);
  assert.equal(r.index, 60); // (3×1+2×0)/(3+2)
  assert.equal(r.coverage, 5 / 6);
});

test('필수 조건: 불충족은 다른 장점으로 메우지 않음', () => {
  assert.equal(mustStatus([{ value: true }, { value: false }]), 'fail');
  assert.equal(mustStatus([{ value: true }, { value: null }]), 'check');
  assert.equal(mustStatus([{ value: true }]), 'pass');
});

test('한 항목만 확인된 기관은 상위에 오르지 않음(정보 부족 묶음)', () => {
  const items = [
    { id: 'A', name: '가', distance: 500, crit: [{ key: 'd', weight: 3, value: 1 }, { key: 'c', weight: 2, value: null }, { key: 'n', weight: 2, value: null }] },
    { id: 'B', name: '나', distance: 900, crit: [{ key: 'd', weight: 3, value: 0.6 }, { key: 'c', weight: 2, value: 0.8 }, { key: 'n', weight: 2, value: null }] },
  ];
  const r = rankComposite(items);
  assert.deepEqual(r.main.map((x) => x.id), ['B']);
  assert.deepEqual(r.lack.map((x) => x.id), ['A']);
});

test('종합 동점: 확인 정도 → 거리 → 이름', () => {
  const mk = (id, name, distance, vals) => ({ id, name, distance, crit: vals.map((v, i) => ({ key: 'k' + i, weight: 1, value: v })) });
  const r = rankComposite([mk('A', '다', 900, [1, 1]), mk('B', '가', 500, [1, 1]), mk('C', '나', 100, [1, 1, null])]);
  assert.deepEqual(r.main.map((x) => x.id), ['B', 'A', 'C']);
});

test('우선순위 정렬: 1순위 묶음 → 2순위, 미확인은 그 단계에서 뒤로', () => {
  const mk = (id, d, c) => ({ id, name: id, distance: 0, crit: [{ key: 'dist', value: d }, { key: 'care', value: c }] });
  const r = rankPriority([mk('A', 0.8, 0), mk('B', 0.8, 1), mk('C', null, 1), mk('D', 1, 0)], ['dist', 'care'], { dist: (v) => Math.round(v * 5) });
  assert.deepEqual(r.map((x) => x.id), ['D', 'B', 'A', 'C']);
});

test('가족 전체: 한 아이라도 불충족이면 불충족', () => {
  assert.equal(familyStatus(['pass', 'fail']), 'fail');
  assert.equal(familyStatus(['pass', 'check']), 'check');
  assert.equal(familyStatus(['pass', 'pass']), 'pass');
});
