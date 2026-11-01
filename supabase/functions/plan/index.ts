// 희망 순서(지원할 3곳) 받기 (Supabase Edge Function, 파일 하나로 완결 — 대시보드 편집기에 그대로 붙여넣어도 됨)
// 기기마다 무작위 번호(P-…)와 비밀 토큰. 처음 받은 토큰과 같은 기기만 고치거나 지울 수 있다. 빈 목록이면 지운다.
// 서버 전용 비밀 키(SUPABASE_SECRET_KEYS / SUPABASE_SERVICE_ROLE_KEY)는 Supabase가 서버에만 넣어 주는 값.
// 선택 설정(Secrets): ALLOWED_ORIGINS="https://내사이트.netlify.app", RATE_SALT=아무 긴 글자
import { createClient } from 'npm:@supabase/supabase-js@2.99.3';

const LIMIT_PER_HOUR = 60;
const env = (k: string) => Deno.env.get(k) ?? '';
function serverKey() {
  try { const k = JSON.parse(env('SUPABASE_SECRET_KEYS') || '{}').default; if (k) return k; } catch { /* 예전 방식 */ }
  return env('SUPABASE_SERVICE_ROLE_KEY');
}
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
function validPlan(plan: unknown) {
  if (!Array.isArray(plan) || plan.length > 3) return null;
  const outp: { id: string; name: string }[] = [];
  for (const p of plan as any[]) {
    if (!p || typeof p.id !== 'string' || typeof p.name !== 'string') return null;
    if (!/^(kinder|child|academy):[^\s<>"'`]{1,60}$/u.test(p.id) || !p.name.trim() || p.name.length > 60 || /[<>]/.test(p.name)) return null;
    outp.push({ id: p.id, name: p.name.trim() });
  }
  if (new Set(outp.map((p) => p.id)).size !== outp.length) return null;
  return outp;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return out(405, { error: 'method' }, origin);
  if (origins.length && !origins.includes(origin)) return out(403, { error: 'origin' }, origin);
  const raw = await req.text();
  if (raw.length > 3000) return out(413, { error: 'invalid' }, origin);
  let b: any; try { b = JSON.parse(raw); } catch { return out(400, { error: 'invalid' }, origin); }
  const id = String(b?.id ?? ''), token = String(b?.token ?? '');
  if (!/^P-[A-Z2-9]{10}$/.test(id) || !/^[A-Za-z0-9]{24}$/.test(token)) return out(400, { error: 'invalid' }, origin);
  const plan = validPlan(b?.plan ?? []);
  if (!plan) return out(400, { error: 'invalid' }, origin);

  const db = createClient(env('SUPABASE_URL'), serverKey(), { auth: { persistSession: false } });
  const now = new Date().toISOString();
  await db.from('plans').delete().lt('expires_at', now); // 보관 기간 지난 것 정리

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const ipHash = await sha((env('RATE_SALT') || serverKey().slice(-24)) + ip);
  const { count } = await db.from('rate_log').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).eq('kind', 'plan').gte('at', new Date(Date.now() - 3600e3).toISOString());
  if ((count ?? 0) >= LIMIT_PER_HOUR) return out(429, { error: 'rate' }, origin);
  await db.from('rate_log').insert({ ip_hash: ipHash, kind: 'plan' });

  const th = await sha(`${id}:${token}`);
  const { data: ex, error: e1 } = await db.from('plans').select('token_hash').eq('id', id).maybeSingle();
  if (e1) { console.error('select', e1); return out(500, { error: 'server', detail: e1.code }, origin); }
  if (ex && ex.token_hash !== th) return out(403, { error: 'token' }, origin);

  if (!plan.length) { // 빈 목록 = 지우기
    if (ex) await db.from('plans').delete().eq('id', id);
    return out(200, { ok: true, deleted: !!ex }, origin);
  }
  const { error } = ex
    ? await db.from('plans').update({ plan, updated_at: now }).eq('id', id)
    : await db.from('plans').insert({ id, token_hash: th, plan });
  if (error) { console.error('save', error); return out(error.code === '23505' ? 409 : 500, { error: 'server', detail: error.code }, origin); }
  return out(200, { ok: true }, origin);
});
