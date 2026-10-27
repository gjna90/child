// 교육 특징 분류 규칙 (규칙 설명: docs/09_교육특징_분류.md)
// 유치원 '교육과정 운영계획' 글에서 교육 방향을 나타내는 표현을 세어 7가지 방향으로 나눈다.
// - 자동 분류는 '글에 얼마나 자주·어디에 나왔나'만 본다. 실제 운영은 상담·참관으로 확인.
// - 사람이 읽고 정리한 값(data/profiles/curated_2026.js)이 있으면 그것을 먼저 쓴다.

/** 교육 방향 7가지 — 화면·추천에서 같은 키를 쓴다 */
export const STYLES = {
  nature: { label: '자연·생태 체험', short: '자연체험', words: ['숲', '생태', '자연', '텃밭', '흙놀이', '산책', '밧줄놀이', '동식물', '곤충', '환경교육', '생태전환', '바깥놀이', '숲체험', '숲놀이', '사계절'] },
  play: { label: '놀이·프로젝트 (아이 주도)', short: '놀이중심', words: ['유아 주도', '유아주도', '놀이중심', '놀이 중심', '자유놀이', '프로젝트', '놀이주제', '놀이 주제', '몰입', '스스로', '자율'] },
  reading: { label: '독서·말·글(문해)', short: '독서·문해', words: ['독서', '그림책', '책놀이', '책 놀이', '문해', '도서', '동화', '말놀이', '글놀이', '이야기 나누기'] },
  body: { label: '신체·운동', short: '신체·운동', words: ['체육', '신체활동', '체력', '줄넘기', '운동', '달리기', '등반', '모닝', '훌라후프', '대근육', '마라톤'] },
  arts: { label: '예술·표현', short: '예술·표현', words: ['음악', '미술', '동극', '뮤지컬', '국악', '공연', '감상', '댄스', '악기', '극놀이', '예술'] },
  character: { label: '인성·예절', short: '인성·예절', words: ['인성', '예절', '배려', '존중', '효', '기본생활습관', '바른', '인사'] },
  learning: { label: '학습·기초교육 (한글·수·영어·AI)', short: '학습·기초', words: ['한글', '수학', '수 놀이', '수놀이', '영어', '코딩', 'AI', '인공지능', '디지털', '체스', '과학', '초등', '교과', '학습지', '교재'] },
};
export const STYLE_KEYS = Object.keys(STYLES);

const norm = (t) => t.replace(/[·․‥…]{2,}/g, ' ').replace(/[ \t]+/g, ' ');
const count = (t, w) => { let n = 0, i = 0; while ((i = t.indexOf(w, i)) >= 0) { n++; i += w.length; } return n; };

/** 중점·특색·역점 교육이 나오는 구간(제목 뒤 400자) — 이 구간의 표현은 3배로 센다 */
export function focusSections(text) {
  const t = norm(text);
  const out = [];
  const re = /(중점\s*교육|특색\s*교육|특색\s*사업|역점\s*교육|교육\s*중점)/g;
  let m;
  while ((m = re.exec(t))) {
    const seg = t.slice(m.index, m.index + 400);
    if (/상생발전|차\s*례|\d{1,3}\s*\n\s*\d+\.\s/.test(seg.slice(0, 200))) continue; // 교육청 공통 비전·목차 제외
    out.push(seg);
  }
  return out;
}

/** 바깥놀이·숲 활동 빈도 문장 (예: '바깥놀이 매일 60분 이상', '매주 금요일 숲데이') */
export function outdoorLines(text) {
  const t = norm(text).replace(/\n/g, ' ');
  const re = /[^.。▸◦•\-/]{0,30}(?:바깥\s*놀이|숲\s*(?:데이|체험|놀이)|실외\s*놀이)[^.。▸◦•/]{0,30}/g;
  const freq = /(매일|1일\s*\d|하루\s*\d|주\s*\d\s*회|매주|월\s*\d\s*회|매월|\d+\s*분\s*이상|\d\s*시간\s*이상)/;
  const seen = new Set();
  return [...t.matchAll(re)].map((x) => x[0].trim()).filter((s) => freq.test(s) && !seen.has(s) && seen.add(s)).slice(0, 6);
}

/** 운영계획 글 → { scores, tags, outdoor, focusCount } */
export function analyzePlan(text) {
  const t = norm(text);
  const focus = focusSections(t).join('\n');
  const scores = {};
  for (const [k, s] of Object.entries(STYLES)) {
    const body = s.words.reduce((a, w) => a + count(t, w), 0);
    const f = s.words.reduce((a, w) => a + count(focus, w), 0);
    scores[k] = Math.round((Math.log1p(body) + 3 * Math.log1p(f)) * 10) / 10;
  }
  const focusCount = focusSections(t).length;
  // 학사일정만 올린 짧은 문서는 분류하지 않음(일정표의 '숲체험' 몇 번으로 방향을 단정하지 않기)
  const enough = t.length >= 8000 && focusCount > 0;
  return { scores, tags: enough ? tagsFromScores(scores) : [], outdoor: outdoorLines(t), focusCount, chars: t.length, note: enough ? null : '교육방침·중점교육이 없는 문서(학사일정 등) — 분류하지 않음' };
}

/** 점수 → 기관 안에서 상대적으로 두드러진 방향(최대 3개)만 '강조' */
export function tagsFromScores(scores) {
  const arr = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = arr[0]?.[1] ?? 0;
  if (!top) return [];
  return arr.map(([k, v], i) => ({ key: k, label: STYLES[k].label, level: i < 3 && v >= top * 0.8 ? '강조' : v >= top * 0.5 ? '언급' : '적음', score: v }));
}

/** 아이 설문 답 → 잘 맞을 수 있는 교육 방향 (자체 설문 해석, 진단 아님) */
export const SURVEY_STYLE = {
  5: ['body', 'nature'], 6: ['body', 'nature'], // 움직임
  7: ['play'], 8: ['play'], 22: ['play'], 24: ['play'], // 몰입·선택·탐색
  23: ['nature', 'play'], // 직접 해보기
};
export function kidStyles(answers) {
  const HIGH = new Set(['자주', '대부분']);
  const hit = {};
  for (const [n, keys] of Object.entries(SURVEY_STYLE)) if (HIGH.has(answers?.[n])) for (const k of keys) (hit[k] ??= []).push(+n);
  return hit; // { play: [7, 22], ... }
}

/** 원하는 방향들과 기관 분류의 맞춤 정도 0~1 (강조 1, 언급 0.5, 적음 0). 분류가 없으면 null */
export function styleMatch(tags, wanted) {
  if (!tags?.length || !wanted.length) return null;
  const lv = Object.fromEntries(tags.map((t) => [t.key, t.level]));
  const v = wanted.reduce((a, k) => a + (lv[k] === '강조' ? 1 : lv[k] === '언급' ? 0.5 : 0), 0) / wanted.length;
  return Math.round(v * 100) / 100;
}
