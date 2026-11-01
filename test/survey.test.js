import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, SUPPORTS, analyze } from '../src/lib/survey.js';

test('설문 24문항, 지원 키는 모두 SUPPORTS에 있음', () => {
  assert.equal(ITEMS.length, 24);
  assert.deepEqual(ITEMS.map((x) => x.n), Array.from({ length: 24 }, (_, i) => i + 1));
  for (const it of ITEMS) assert.ok(SUPPORTS[it.sup], it.n);
});

test('analyze: 높게 답한 문항은 해석·지원으로, 관찰 못함은 따로', () => {
  const an = analyze({ answers: { 2: '자주', 5: '대부분', 17: '거의 없음', 3: '관찰 기회 없음' } });
  assert.equal(an.help.length, 2); // 2번(help), 17번 낮음(lo)
  assert.equal(an.strength.length, 1);
  assert.deepEqual(Object.keys(an.sup).sort(), ['express_help', 'gradual_adapt']);
  assert.equal(an.unseen[0].n, 3);
});

