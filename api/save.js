// Zapis postępu Pati w chmurze (Upstash Redis podłączony w Vercelu → Storage).
// GET zwraca zapis, POST łączy przysłany zapis z tym na serwerze i zwraca wynik.
// Każde wywołanie wymaga hasła (nagłówek x-haslo) zgodnego ze zmienną PATI_PASSWORD.
import { createHash, timingSafeEqual } from 'node:crypto';
import { cleanProgress, mergeProgress } from '../src/merge.js';
import { normPassword } from '../src/password.js';

// Vercel przy podłączaniu bazy może dodać własny przedrostek (KV_, STORAGE_, …),
// więc szukamy po końcówce nazwy.
const envBy = (re) => Object.entries(process.env).find(([k, v]) => re.test(k) && v)?.[1];
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || envBy(/(REST_API|REDIS_REST)_URL$/);
const TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || envBy(/^(?!.*READ_ONLY).*(REST_API|REDIS_REST)_TOKEN$/);
const PASSWORD = process.env.PATI_PASSWORD;
const KEY = 'hbd-pati:progress';

const digest = (s) => createHash('sha256').update(normPassword(s)).digest();
function passwordOk(given) {
  let value = '';
  try {
    value = decodeURIComponent(given || '');
  } catch {}
  return timingSafeEqual(digest(value), digest(PASSWORD));
}

async function redis(command) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).result;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!REDIS_URL || !TOKEN || !PASSWORD) return res.status(503).json({ error: 'storage not configured' });
  if (!passwordOk(req.headers['x-haslo'])) {
    await new Promise((r) => setTimeout(r, 400)); // spowalnia zgadywanie
    return res.status(401).json({ error: 'wrong password' });
  }
  try {
    const raw = await redis(['GET', KEY]);
    const current = raw ? JSON.parse(raw) : null;
    if (req.method === 'GET') return res.status(200).json({ progress: current });
    if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    if (!body.progress || typeof body.progress !== 'object' || JSON.stringify(body.progress).length > 50000)
      return res.status(400).json({ error: 'bad payload' });
    const merged = current ? mergeProgress(current, body.progress) : cleanProgress(body.progress);
    await redis(['SET', KEY, JSON.stringify(merged)]);
    return res.status(200).json({ progress: merged });
  } catch (e) {
    return res.status(502).json({ error: String(e?.message || e) });
  }
}
