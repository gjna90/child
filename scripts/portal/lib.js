// 유보통합포털 요강 수집 — 브라우저 없이 시험할 수 있는 순수 함수들
import { KINDER, PENDING, SCHOOL_YEAR } from '../../data/admissions/2027_kinder.js';

/** 수집 대상 유치원 이름 (기본: 요강을 아직 못 읽은 곳, all=true면 배방·탕정 21곳 전부) */
export function targetNames(all = false) {
  const pending = Object.keys(PENDING);
  const noRecruit = Object.entries(KINDER).filter(([, k]) => !k.recruit).map(([n]) => n);
  const names = all ? [...new Set([...Object.keys(KINDER), ...pending])] : [...new Set([...pending, ...noRecruit])];
  return names.sort((a, b) => a.localeCompare(b, 'ko'));
}

/** 포털 화면에 흔히 쓰이는 줄임 이름까지 함께 (예: 아산용연초등학교병설유치원 → 아산용연초병설유치원) */
export function nameVariants(name) {
  const v = new Set([name]);
  v.add(name.replace('초등학교병설유치원', '초병설유치원'));
  v.add(name.replace('초등학교병설유치원', '초등학교병설'));
  v.add(name.replace(/\s+/g, ''));
  return [...v];
}

/** 화면 글자에 들어 있는 대상 유치원 이름 */
export function matchTarget(text, names) {
  const t = String(text ?? '').replace(/\s+/g, '');
  return names.find((n) => nameVariants(n).some((v) => t.includes(v.replace(/\s+/g, '')))) ?? null;
}

/** 이 화면이 그 해 모집요강 화면처럼 보이는가 */
export function looksLikeYogang(text, year = SCHOOL_YEAR) {
  const t = String(text ?? '');
  return new RegExp(`${year}\\s*학년도`).test(t) && /(모집\s*요강|유아\s*모집|모집\s*인원|우선\s*모집)/.test(t);
}

/** 파일·폴더 이름으로 쓸 수 있게 */
export const safeName = (s) => String(s).replace(/[\\/:*?"<>|\s]+/g, '_').replace(/_+/g, '_').slice(0, 80);

/** 첨부파일 링크처럼 보이는가 */
export const isAttachment = (href, text) => /\.(pdf|hwp|hwpx|docx?|jpg|png)(\?|$)/i.test(href ?? '') || /\.(pdf|hwp|hwpx)\b/i.test(text ?? '') || /download|fileDown|atchFile|FileDown/i.test(href ?? '');
