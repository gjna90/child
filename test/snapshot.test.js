import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffSnapshots } from '../scripts/snapshot.js';

test('스냅숏 비교: 신규·사라짐·바뀐 값·새 공지', () => {
  const prev = { institutions: [{ id: 'a', name: '가상A', phone: '1' }, { id: 'b', name: '가상B', phone: '2' }], notices: [{ who: '가상A', title: '옛 공지', date: '2026-10-01' }] };
  const cur = { institutions: [{ id: 'a', name: '가상A', phone: '9' }, { id: 'c', name: '가상C', phone: '3' }], notices: [{ who: '가상A', title: '옛 공지', date: '2026-10-01' }, { who: '가상A', title: '2027 요강', date: '2026-10-28' }] };
  const d = diffSnapshots(prev, cur);
  assert.deepEqual(d.added, ['가상C']);
  assert.deepEqual(d.removed, ['가상B']);
  assert.deepEqual(d.changed, [{ name: '가상A', field: 'phone', from: '1', to: '9' }]);
  assert.equal(d.newNotices.length, 1);
});
