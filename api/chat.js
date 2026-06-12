// Chat API — slaat de laatste 80 berichten op in Upstash Redis
// Voeg Upstash toe via Vercel dashboard: Storage → Create Database → Upstash Redis (gratis)
// De env vars KV_REST_API_URL en KV_REST_API_TOKEN worden automatisch ingesteld.

const KEY = 'wk2026:chat';

async function upstash(cmd) {
  const res = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cmd),
  });
  return res.json();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { result } = await upstash(['LRANGE', KEY, '-80', '-1']);
    const msgs = (result || []).map(function(s) {
      try { return JSON.parse(s); } catch(e) { return null; }
    }).filter(Boolean);
    return res.status(200).json(msgs);
  }

  if (req.method === 'POST') {
    const { name, text } = req.body || {};
    if (!name || !text || typeof name !== 'string' || typeof text !== 'string') {
      return res.status(400).json({ error: 'invalid' });
    }
    if (name.length > 20 || text.length > 200) {
      return res.status(400).json({ error: 'too long' });
    }
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const msg = JSON.stringify({ id, name: name.trim(), text: text.trim(), ts: Date.now() });
    await upstash(['RPUSH', KEY, msg]);
    await upstash(['LTRIM', KEY, '-80', '-1']);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
};
