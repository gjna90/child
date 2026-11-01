// 설문 결과 받기 (Supabase Edge Function, 파일 하나로 완결 — 대시보드 편집기에 그대로 붙여넣어도 됨)
// 하는 일: 내용 검사 → 같은 곳에서 너무 많이 보내면 막기 → 같은 내용 중복 막기 → 저장 → 응답번호·삭제코드 돌려주기
// 비밀 키(SUPABASE_SERVICE_ROLE_KEY)는 Supabase가 서버에만 넣어 주는 값. 브라우저로 나가지 않음.
// 선택 설정(Secrets): ALLOWED_ORIGINS="https://내사이트.netlify.app" (쉼표로 여러 개), RATE_SALT=아무 긴 글자
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const SCALE = ['거의 없음', '가끔', '자주', '대부분', '관찰 기회 없음'];
const SUPPORT_KEYS = ['gradual_adapt', 'transition_notice', 'movement', 'choice_play', 'quiet_space', 'sensory', 'small_group', 'express_help', 'conflict', 'retry', 'presentation', 'hands_on'];
const STYLE_KEYS = ['nature', 'play', 'reading', 'body', 'arts', 'character', 'learning'];
const CONSENTS = ['v1-2026-11'];
const LIMIT_PER_HOUR = 10;
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 0·O·1·I 제외 (32자)

const env = (k: string) => Deno.env.get(k) ?? '';
const origins = env('ALLOWED_ORIGINS').split(',').map((s) => s.trim()).filter(Boolean);
function cors(origin: string) {
  const allow = !origins.length ? '*' : origins.includes(origin) ? origin : origins[0];
  return { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
}
const out = (status: number, body: unknown, origin: string) => new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json' } });
async function sha(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
const rand = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map((x) => ABC[x % 32]).join('');

type Row = { consent_ver: string; birth_year: number; observer: string; answers: Record<string, string>; picks: string[]; plan: { id: string; name: string }[]; reco_styles: string[] };
function validate(b: any): Row | null {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
  const year = new Date().getFullYear();
  if (!CONSENTS.includes(b.consent)) return null;
  if (!Number.isInteger(b.birth) || b.birth < year - 8 || b.birth > year) return null;
  if (!['부모', '교사'].includes(b.by)) return null;
  if (!b.answers || typeof b.answers !== 'object' || Array.isArray(b.answers)) return null;
  const answers: Record<string, string> = {};
  for (const [k, v] of Object.entries(b.answers)) {
    if (!/^([1-9]|1\d|2[0-4])$/.test(k) || !SCALE.includes(v as string)) return null;
    answers[k] = v as string;
  }
  if (!Object.keys(answers).length) return null;
  const uniq = (a: unknown, keys: string[], max: number) => Array.isArray(a) && a.length <= max && a.every((x) => keys.includes(x)) && new Set(a).size === a.length;
  if (!uniq(b.picks ?? [], SUPPORT_KEYS, SUPPORT_KEYS.length)) return null;
  if (!uniq(b.recoStyles ?? [], STYLE_KEYS, STYLE_KEYS.length)) return null;
  const plan = b.plan ?? [];
  if (!Array.isArray(plan) || plan.length > 3) return null;
  for (const p of plan) {
    if (!p || typeof p.id !== 'string' || typeof p.name !== 'string') return null;
    if (!/^(kinder|child|academy):[^\s<>"'`]{1,60}$/u.test(p.id) || !p.name.trim() || p.name.length > 60 || /[<>]/.test(p.name)) return null;
  }
  if (new Set(plan.map((p: any) => p.id)).size !== plan.length) return null;
  return { consent_ver: b.consent, birth_year: b.birth, observer: b.by, answers, picks: b.picks ?? [], plan: plan.map((p: any) => ({ id: p.id, name: p.name.trim() })), reco_styles: b.recoStyles ?? [] };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return out(405, { error: 'method' }, origin);
  if (origins.length && !origins.includes(origin)) return out(403, { error: 'origin' }, origin);
  const raw = await req.text();
  if (raw.length > 10000) return out(413, { error: 'invalid' }, origin);
  let b: any; try { b = JSON.parse(raw); } catch { return out(400, { error: 'invalid' }, origin); }
  if (b && !CONSENTS.includes(b.consent)) return out(400, { error: 'consent' }, origin);
  const row = validate(b);
  if (!row) return out(400, { error: 'invalid' }, origin);

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  await db.from('submissions').delete().lt('expires_at', new Date().toISOString()); // 보관 기간 지난 것 정리

  // 반복 제출 제한: 같은 접속 주소(해시)에서 1시간에 10번
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const ipHash = await sha((env('RATE_SALT') || env('SUPABASE_SERVICE_ROLE_KEY').slice(-24)) + ip);
  const { count } = await db.from('rate_log').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).eq('kind', 'submit').gte('at', new Date(Date.now() - 3600e3).toISOString());
  if ((count ?? 0) >= LIMIT_PER_HOUR) return out(429, { error: 'rate' }, origin);
  await db.from('rate_log').insert({ ip_hash: ipHash, kind: 'submit' });

  const payload_hash = await sha(JSON.stringify(row));
  const now = new Date().toISOString();

  // 다시 보내기: 응답번호+삭제코드가 맞으면 내용 바꿈
  if (b.rid !== undefined || b.code !== undefined) {
    if (typeof b.rid !== 'string' || typeof b.code !== 'string' || !/^R-[A-Z2-9]{8}$/.test(b.rid)) return out(403, { error: 'code' }, origin);
    const { data: ex } = await db.from('submissions').select('code_hash').eq('rid', b.rid).maybeSingle();
    if (!ex || ex.code_hash !== await sha(`${b.rid}:${b.code.toUpperCase()}`)) return out(403, { error: 'code' }, origin);
    const { error } = await db.from('submissions').update({ ...row, payload_hash, updated_at: now }).eq('rid', b.rid);
    if (error) return out(500, { error: 'server' }, origin);
    return out(200, { rid: b.rid, updated: true }, origin);
  }

  // 같은 내용을 하루 안에 또 보내면 막음
  const { data: dup } = await db.from('submissions').select('rid').eq('payload_hash', payload_hash).gte('created_at', new Date(Date.now() - 86400e3).toISOString()).limit(1);
  if (dup?.length) return out(409, { error: 'dup' }, origin);

  for (let i = 0; i < 3; i++) {
    const rid = 'R-' + rand(8);
    const code = rand(5) + '-' + rand(5);
    const { error } = await db.from('submissions').insert({ ...row, rid, code_hash: await sha(`${rid}:${code}`), payload_hash });
    if (!error) return out(200, { rid, code }, origin);
    if (error.code !== '23505') return out(500, { error: 'server' }, origin); // 23505 = 응답번호 우연히 겹침 → 다시
  }
  return out(500, { error: 'server' }, origin);
});
