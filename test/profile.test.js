// 교육 특징 분류 규칙 (src/lib/profile.js)
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePlan, tagsFromScores, kidStyles, styleMatch, outdoorLines, STYLE_KEYS } from '../src/lib/profile.js';
import { CURATED } from '../data/profiles/curated_2026.js';

const filler = '유치원 교육과정 운영 계획입니다. '.repeat(500);

test('학사일정만 있는 짧은 문서는 분류하지 않음', () => {
  const r = analyzePlan('3월 입학식 4월 숲체험 5월 숲체험 생일잔치');
  assert.deepEqual(r.tags, []);
  assert.ok(r.note);
});

test('중점교육 구간의 표현을 더 무겁게 셈', () => {
  const t = '독서 '.repeat(5) + filler + '\n중점교육: 숲에서 배우는 생태교육 — 숲놀이, 텃밭, 자연 산책\n';
  const r = analyzePlan(t);
  assert.equal(r.tags[0].key, 'nature');
  assert.equal(r.tags[0].level, '강조');
});

test('점수 → 상대 등급 (최대 3개 강조)', () => {
  const tags = tagsFromScores({ nature: 10, reading: 9, body: 8.5, arts: 8.2, play: 4, character: 1, learning: 0 });
  assert.deepEqual(tags.filter((t) => t.level === '강조').map((t) => t.key), ['nature', 'reading', 'body']);
  assert.equal(tags.find((t) => t.key === 'arts').level, '언급');
  assert.equal(tags.find((t) => t.key === 'learning').level, '적음');
});

test('바깥놀이 빈도 문장 뽑기', () => {
  const l = outdoorLines('◦ 쉼이 있는 바깥놀이 활성화: 매일 60분 이상 ◦ 숲 그림 그리기');
  assert.equal(l.length, 1);
  assert.match(l[0], /매일 60분/);
});

test('아이 설문 → 교육 방향 (자주·대부분만)', () => {
  assert.deepEqual(kidStyles({ 5: '자주', 7: '가끔', 22: '대부분' }), { body: [5], nature: [5], play: [22] });
  assert.deepEqual(kidStyles({}), {});
});

test('맞춤 정도: 강조 1 · 언급 0.5 · 없음 0, 분류 없으면 null', () => {
  const tags = [{ key: 'nature', level: '강조' }, { key: 'reading', level: '언급' }];
  assert.equal(styleMatch(tags, ['nature']), 1);
  assert.equal(styleMatch(tags, ['nature', 'reading']), 0.75);
  assert.equal(styleMatch(tags, ['learning']), 0);
  assert.equal(styleMatch([], ['nature']), null);
  assert.equal(styleMatch(tags, []), null);
});

test('정리값: 방향 키·등급이 규칙과 맞음', () => {
  for (const [name, c] of Object.entries(CURATED)) {
    if (c.missing) continue;
    assert.ok(c.motto && c.focus?.length, name);
    for (const [k, lv] of Object.entries(c.styles)) {
      assert.ok(STYLE_KEYS.includes(k), `${name}: ${k}`);
      assert.ok(['강조', '언급'].includes(lv), `${name}: ${lv}`);
    }
  }
});
