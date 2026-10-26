import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAdmissionTitle, parseList, parseSitemap } from '../scripts/collect-notices.js';

test('모집 관련 제목만 고름 (교사 채용·초등 입학·다른 모집 제외)', () => {
  assert.ok(isAdmissionTitle('2027학년도 가상유치원 유아모집 요강'));
  assert.ok(isAdmissionTitle('2027학년도 공개의 날 운영 안내'));
  assert.ok(isAdmissionTitle('2027학년도 유아모집요강 탑재 관련 안내'));
  assert.ok(!isAdmissionTitle('2027학년도 기간제 교사 채용 공고'));
  assert.ok(!isAdmissionTitle('2027학년도 의무취학(1학년 입학) 안내'));
  assert.ok(!isAdmissionTitle('2026년 청소년합창단 신입단원 모집'));
  assert.ok(!isAdmissionTitle('2026-2027절기 인플루엔자 예방접종 안내'));
});

test('충남 학교 누리집 게시판 목록 읽기', () => {
  const html = `<tbody><tr><td>1</td><td class='tit'><a href="#contents" title="2027학년도 가상유치원 유아모집 요강" onclick="javascript:goView('111','111','999', '0', 'null', 'W', '1', 'N', '')">x</a></td><td>2026-10-21</td><td><img src='/images/comm/board/icon/ic_add_file.gif' alt='첨부파일'/></td></tr></tbody>`;
  const [r] = parseList(html);
  assert.equal(r.boardSeq, '999');
  assert.equal(r.title, '2027학년도 가상유치원 유아모집 요강');
  assert.equal(r.date, '2026-10-21');
  assert.equal(r.hasFile, true);
});

test('사이트맵에서 메뉴 묶음(유치원)과 게시판 찾기', () => {
  const html = `<h4><a href="#goUrl" onClick="javascript:goUrl('/sub/info.do?m=09', 'N')">유치원</a></h4>
<li class='sitemapUlLi'><a href="javascript:goUrl('/boardCnts/list.do?boardID=222&m=0902', 'N')" title='공지사항'>공지사항</a>`;
  const [b] = parseSitemap(html);
  assert.equal(b.boardID, '222');
  assert.equal(b.section, '유치원');
});
