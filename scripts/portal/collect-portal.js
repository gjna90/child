// 유보통합포털(유치원입학) 모집요강 수집 — 한국에 있는 내 PC에서 실행하는 스크립트
// 이 클라우드 작업 환경은 해외라 포털이 막혀 있으므로, 같은 일을 사용자의 PC에서 한다.
//
//   node scripts/portal/collect-portal.js            # 자동: 요강 미확인 유치원을 이름으로 찾아 저장
//   node scripts/portal/collect-portal.js --all      # 배방·탕정 21곳 전부
//   node scripts/portal/collect-portal.js --learn    # 학습: 내가 화면을 넘기면 요강 화면을 알아서 저장(+ 화면의 [이 화면 저장] 버튼)
//   node scripts/portal/collect-portal.js --push     # 끝나면 저장소에 커밋·푸시(클라우드 루틴이 읽어 앱에 반영)
//
// 지키는 것
// - 실제 브라우저 창(보이는 창)으로, 사람처럼 천천히(화면마다 3~6초) 우리 지역 대상만 연다. 하루 1번 이하.
// - 로그인·개인정보 화면은 열지 않는다. 공개된 '모집요강 조회'만 읽는다.
// - 보안 확인 화면이 나오면 우회하지 않는다. 사용자가 직접 통과하거나, 그대로 멈춘다.
// - 결과: data/portal_inbox/<날짜>/<유치원>/ (page.txt, 첨부파일) + index.json
//   화면 구조를 배우기 위한 기록: data/raw/portal/probe/ (저장소 제외) — 자동 찾기가 실패하면 이 기록으로 고침
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { targetNames, matchTarget, looksLikeYogang, safeName, isAttachment } from './lib.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'); // Windows 경로·한글 폴더도 안전
const PORTAL = process.env.PORTAL_URL ?? 'https://enter.childinfo.go.kr/'; // PORTAL_URL: 시험용 가짜 화면
const args = new Set(process.argv.slice(2));
const LEARN = args.has('--learn');
const PUSH = args.has('--push');
const names = targetNames(args.has('--all'));
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
const INBOX = process.env.PORTAL_INBOX ?? path.join(ROOT, 'data', 'portal_inbox', today);
const PROBE = process.env.PORTAL_PROBE ?? path.join(ROOT, 'data', 'raw', 'portal', 'probe');
const PROFILE = process.env.PORTAL_PROFILE ?? path.join(ROOT, 'data', 'raw', 'portal', 'browser-profile'); // 쿠키 유지(보안 확인을 한 번 통과하면 다음에도 유지)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const human = () => sleep(3000 + Math.random() * 3000);
const log = (...a) => console.log(new Date().toLocaleTimeString('ko-KR'), ...a);

async function loadPlaywright() {
  try { return (await import('playwright')).chromium; } catch { /* 전역 설치만 있는 경우 */ }
  try { return createRequire(import.meta.url)('playwright').chromium; } catch {
    console.error('playwright가 없습니다. 이 폴더에서 한 번만 실행하세요:\n  npm i --no-save playwright\n  npx playwright install chromium');
    process.exit(1);
  }
}

/** 화면(모든 프레임) 글자 */
async function pageText(page) {
  const parts = [];
  for (const f of page.frames()) { try { parts.push(await f.evaluate(() => document.body?.innerText ?? '')); } catch { /* 다른 출처 프레임 */ } }
  return parts.join('\n');
}

/** 구조 학습용 기록: HTML + 화면 사진 */
async function probe(page, label) {
  fs.mkdirSync(PROBE, { recursive: true });
  const base = path.join(PROBE, `${today}_${safeName(label)}_${Date.now() % 100000}`);
  try { fs.writeFileSync(base + '.html', await page.content()); } catch { /* */ }
  try { await page.screenshot({ path: base + '.png', fullPage: true }); } catch { /* */ }
  fs.appendFileSync(path.join(PROBE, 'urls.txt'), `${new Date().toISOString()}\t${label}\t${page.url()}\n`);
}

function isBlocked(text) { return /자동입력|보안문자|비정상적인 접근|접근이 차단|captcha|로봇이 아닙니다/i.test(text); }

const saved = new Map(); // 유치원 → 저장 결과
/** 요강 화면 저장 (글자 + 첨부) */
async function saveYogang(page, name, how) {
  const text = await pageText(page);
  const dir = path.join(INBOX, safeName(name));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'page.txt'), `출처: ${page.url()}\n저장: ${new Date().toISOString()} (${how})\n\n${text}`);
  const files = [];
  const links = [];
  for (const f of page.frames()) {
    try { links.push(...await f.$$eval('a, button', (els) => els.map((e, i) => ({ i, href: e.getAttribute('href') || '', text: (e.innerText || e.getAttribute('title') || '').trim().slice(0, 120), onclick: e.getAttribute('onclick') || '' })))); } catch { /* */ }
  }
  const atts = links.filter((l) => isAttachment(l.href + ' ' + l.onclick, l.text)).slice(0, 8);
  for (const a of atts) {
    try {
      const loc = page.locator('a, button').filter({ hasText: a.text.slice(0, 40) }).first();
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), loc.click()]);
      const fn = safeName(dl.suggestedFilename() || `첨부_${files.length + 1}`);
      await dl.saveAs(path.join(dir, fn));
      files.push(fn);
      log(`  첨부 저장: ${fn}`);
      await human();
    } catch (e) { log(`  첨부 내려받기 실패(${a.text || a.href}): ${String(e.message).slice(0, 80)}`); }
  }
  saved.set(name, { name, url: page.url(), how, chars: text.length, files, savedAt: new Date().toISOString() });
  log(`저장: ${name} (글자 ${text.length}자, 첨부 ${files.length}개)`);
}

/** 자동: 포털에서 '모집요강' 메뉴 → 기관명 검색 → 결과 열기 (화면 구조를 모르는 상태라 글자로 찾는다) */
async function auto(ctx, page) {
  await page.goto(PORTAL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await human();
  if (isBlocked(await pageText(page))) { log('보안 확인 화면이 나왔습니다. 창에서 직접 통과한 뒤 Enter를 누르세요(30초 안에 안 하면 학습 모드로 바꿔 진행).'); await sleep(30000); }
  await probe(page, 'home');
  const menu = page.getByText(/모집\s*요강/).first();
  if (!(await menu.count())) { log('첫 화면에서 "모집요강" 메뉴를 찾지 못함 → 학습 모드로 진행하세요(--learn).'); return false; }
  await menu.click().catch(() => {});
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await human();
  await probe(page, 'yogang-list');
  for (const name of names) {
    if (saved.has(name)) continue;
    try {
      const box = page.locator('input[type="text"], input[type="search"], input:not([type])').filter({ hasNot: page.locator('[readonly]') }).first();
      if (!(await box.count())) { log('검색 칸을 찾지 못함'); await probe(page, 'no-search-box'); return false; }
      await box.fill('');
      await box.type(name.replace('초등학교병설유치원', '초'), { delay: 80 }); // 짧게 검색해 표기 차이를 흡수
      await box.press('Enter');
      const btn = page.getByRole('button', { name: /검색|조회/ }).first();
      if (await btn.count()) await btn.click().catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
      await human();
      await probe(page, `search_${name}`);
      const hit = page.getByText(name.replace('초등학교병설유치원', '초'), { exact: false }).first();
      if (!(await hit.count())) { log(`검색 결과 없음: ${name}`); continue; }
      const popup = ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null);
      await hit.click();
      const p2 = (await popup) ?? page;
      await p2.waitForLoadState('domcontentloaded').catch(() => {});
      await human();
      const text = await pageText(p2);
      await probe(p2, `detail_${name}`);
      if (looksLikeYogang(text) && matchTarget(text, [name])) await saveYogang(p2, name, '자동');
      else log(`요강 화면이 아님(또는 아직 미게시): ${name}`);
      if (p2 !== page) await p2.close();
      else { await page.goBack().catch(() => {}); await human(); }
    } catch (e) { log(`실패: ${name} — ${String(e.message).slice(0, 100)}`); await probe(page, `error_${name}`).catch(() => {}); }
  }
  return true;
}

/** 학습: 사용자가 화면을 넘기는 동안 요강 화면을 자동 감지·저장 + [이 화면 저장] 버튼 */
async function learn(ctx, page) {
  log('학습 모드: 열린 창에서 유보통합포털 → 유치원입학 → 모집요강 조회로 가서, 대상 유치원 요강을 하나씩 여세요.');
  log(`대상 ${names.length}곳: ${names.join(', ')}`);
  log('요강 화면이면 자동 저장합니다. 자동 저장이 안 되면 화면 오른쪽 아래 [이 화면 저장] 버튼을 누르세요. 다 끝나면 창을 닫으세요.');
  await ctx.exposeBinding('__saveThis', async ({ page: p }) => {
    const text = await pageText(p);
    const name = matchTarget(text, targetNames(true)) ?? `미분류_${Date.now() % 100000}`;
    await probe(p, `button_${name}`);
    await saveYogang(p, name, '버튼');
    return name;
  });
  await ctx.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      if (window.top !== window) return;
      const b = document.createElement('button');
      b.textContent = '이 화면 저장';
      b.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:12px 16px;font-size:16px;background:#2e7d4f;color:#fff;border:0;border-radius:8px;box-shadow:0 2px 8px #0005;cursor:pointer';
      b.onclick = async () => { b.textContent = '저장 중…'; try { const n = await window.__saveThis(); b.textContent = `저장됨: ${n}`; } catch (e) { b.textContent = '저장 실패'; } setTimeout(() => { b.textContent = '이 화면 저장'; }, 4000); };
      document.body.appendChild(b);
    });
  });
  const watch = (p) => p.on('load', async () => {
    await sleep(1500);
    try {
      const text = await pageText(p);
      await probe(p, 'visit');
      const name = matchTarget(text, names);
      if (name && !saved.has(name) && looksLikeYogang(text)) await saveYogang(p, name, '자동 감지');
    } catch { /* 창이 닫힘 */ }
  });
  ctx.pages().forEach(watch);
  ctx.on('page', watch);
  await page.goto(PORTAL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  const limit = Number(process.env.PORTAL_LEARN_SECONDS ?? 0); // 시험용: N초 뒤 자동 종료
  if (limit) setTimeout(() => ctx.close().catch(() => {}), limit * 1000);
  await new Promise((r) => ctx.on('close', r));
}

function writeIndex() {
  if (!saved.size) return false;
  fs.mkdirSync(INBOX, { recursive: true });
  const f = path.join(INBOX, 'index.json');
  const prev = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { items: [] };
  const items = [...prev.items.filter((x) => !saved.has(x.name)), ...saved.values()];
  fs.writeFileSync(f, JSON.stringify({ source: '유보통합포털(유치원입학) 모집요강 조회 — 사용자 PC에서 수집', collectedOn: today, targets: names, items }, null, 2));
  return true;
}

function gitPush() {
  const run = (...a) => execFileSync('git', a, { cwd: ROOT, stdio: 'inherit' });
  try {
    run('pull', '--rebase', 'origin', 'stage1-api-extras');
    run('add', path.join('data', 'portal_inbox'));
    run('commit', '-m', `유보통합포털 요강 수집 (PC, ${today}): ${[...saved.keys()].join(', ')}`);
    run('push', 'origin', 'HEAD:stage1-api-extras');
    log('저장소에 올렸습니다. 클라우드 정기 수집이 읽어서 앱에 반영합니다.');
  } catch (e) { log('git 올리기 실패 — 수동으로 커밋·푸시하세요:', String(e.message).slice(0, 120)); }
}

async function main() {
  const chromium = await loadPlaywright();
  fs.mkdirSync(PROFILE, { recursive: true });
  const ctx = await chromium.launchPersistentContext(PROFILE, { headless: process.env.HEADLESS === '1', acceptDownloads: true, locale: 'ko-KR', viewport: { width: 1280, height: 900 } });
  const page = ctx.pages()[0] ?? await ctx.newPage();
  try {
    if (LEARN) await learn(ctx, page);
    else {
      const ok = await auto(ctx, page);
      const miss = names.filter((n) => !saved.has(n));
      if (!ok || miss.length) log(`못 찾은 곳 ${miss.length}곳: ${miss.join(', ')}\n→ 한 번은 --learn 으로 실행해 주세요. 저장된 화면 기록(data/raw/portal/probe)을 보면 자동 찾기를 고칠 수 있습니다.`);
      await ctx.close();
    }
  } catch (e) { log('오류:', e.message); await ctx.close().catch(() => {}); }
  const any = writeIndex();
  log(any ? `결과: data/portal_inbox/${today}/ (${saved.size}곳)` : '저장한 요강이 없습니다.');
  if (any && PUSH) gitPush();
}

main();
