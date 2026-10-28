// 유보통합포털 PC 수집 스크립트의 순수 함수
import test from 'node:test';
import assert from 'node:assert/strict';
import { targetNames, nameVariants, matchTarget, looksLikeYogang, safeName, isAttachment } from '../scripts/portal/lib.js';

test('대상: 기본은 요강 미확인 곳, all은 21곳', () => {
  const pend = targetNames();
  const all = targetNames(true);
  assert.ok(pend.length > 0 && pend.length < all.length);
  assert.equal(all.length, 21);
  assert.ok(!pend.includes('배방유치원')); // 이미 요강 읽음
});

test('이름 줄임 표기도 찾음', () => {
  assert.ok(nameVariants('아산용연초등학교병설유치원').includes('아산용연초병설유치원'));
  assert.equal(matchTarget('2027학년도 아산용연초병설유치원 유아모집 요강', ['아산용연초등학교병설유치원']), '아산용연초등학교병설유치원');
  assert.equal(matchTarget('배방유치원', ['세종유치원']), null);
});

test('요강 화면 판별', () => {
  assert.ok(looksLikeYogang('2027학년도 유아모집 요강 모집인원', 2027));
  assert.ok(!looksLikeYogang('2026학년도 유아모집 요강', 2027));
  assert.ok(!looksLikeYogang('2027학년도 학사일정', 2027));
});

test('파일 이름·첨부 판별', () => {
  assert.equal(safeName('a/b: c?.pdf'), 'a_b_c_.pdf');
  assert.ok(isAttachment('/cmm/fileDown.do?id=1', ''));
  assert.ok(isAttachment('#', '모집요강.hwp'));
  assert.ok(!isAttachment('/main.do', '처음으로'));
});
