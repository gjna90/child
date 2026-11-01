// 보낸 설문 결과 지우기 (Supabase Edge Function, 파일 하나로 완결)
// 응답번호 + 삭제코드가 맞으면 지움. 틀린 코드를 계속 넣는 것을 막기 위해 1시간에 20번까지만.
import { createClient } from 'npm:@supabase/supabase-js@2.99.3';

const LIMIT_PER_HOUR = 20;
const env = (k: string) => Deno.env.get(k) ?? '';
// 서버 전용 비밀 키: 새 방식(SUPABASE_SECRET_KEYS의 default) 우선, 없으면 예전 방식(SUPABASE_SERVICE_ROLE_KEY)
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

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return out(405, { error: 'method' }, origin);
  if (origins.length && !origins.includes(origin)) return out(403, { error: 'origin' }, origin);
  const raw = await req.text();
  if (raw.length > 500) return out(400, { error: 'code' }, origin);
  let b: any; try { b = JSON.parse(raw); } catch { return out(400, { error: 'code' }, origin); }
  const rid = String(b?.rid ?? '').trim().toUpperCase(), code = String(b?.code ?? '').trim().toUpperCase();
  if (!/^R-[A-Z2-9]{8}$/.test(rid) || !/^[A-Z2-9]{5}-[A-Z2-9]{5}$/.test(code)) return out(403, { error: 'code' }, origin);

  const db = createClient(env('SUPABASE_URL'), serverKey(), { auth: { persistSession: false } });
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const ipHash = await sha((env('RATE_SALT') || serverKey().slice(-24)) + ip);
  const { count } = await db.from('rate_log').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).eq('kind', 'delete').gte('at', new Date(Date.now() - 3600e3).toISOString());
  if ((count ?? 0) >= LIMIT_PER_HOUR) return out(429, { error: 'rate' }, origin);
  await db.from('rate_log').insert({ ip_hash: ipHash, kind: 'delete' });

  const { data } = await db.from('submissions').delete().eq('rid', rid).eq('code_hash', await sha(`${rid}:${code}`)).select('rid');
  if (!data?.length) return out(403, { error: 'code' }, origin); // 없는 번호와 틀린 코드를 구분하지 않음
  return out(200, { deleted: true }, origin);
});
