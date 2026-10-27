import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isComplex, haversine } from '../scripts/kakao-routes.js';

test('아파트 단지만 고르기 (동·상가·관리사무소 제외)', () => {
  const apt = (name, cat = '부동산 > 주거시설 > 아파트') => ({ place_name: name, category_name: cat });
  assert.equal(isComplex(apt('가상센트로아파트')), true);
  assert.equal(isComplex(apt('가상센트로아파트 101동')), false);
  assert.equal(isComplex(apt('가상센트로아파트 상가')), false);
  assert.equal(isComplex(apt('가상센트로아파트 관리사무소')), false);
  assert.equal(isComplex(apt('가상어린이집', '교육,학문 > 유아교육 > 어린이집')), false);
});

test('직선거리 계산 (약 1km)', () => {
  const d = haversine({ lat: 36.7754, lng: 127.0786 }, { lat: 36.7844, lng: 127.0786 });
  assert.ok(d > 990 && d < 1010);
});
