import crypto from 'crypto';

const COOKIE_NAME = 'rekt_admin_session';

function sessionToken(secret) {
  return crypto.createHash('sha256').update('rekt-admin-session:' + secret).digest('hex');
}

function secureEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export function isAdminRequest(req) {
  const expected = process.env.ADMIN_ACCESS_KEY;
  if (!expected) return false;

  const direct = req.headers['x-admin-key'];
  if (direct && secureEqual(direct, expected)) return true;

  const raw = req.headers.cookie || '';
  const cookies = Object.fromEntries(raw.split(';').map(part => {
    const i = part.indexOf('=');
    if (i < 0) return ['', ''];
    return [part.slice(0, i).trim(), decodeURIComponent(part.slice(i + 1).trim())];
  }).filter(([k]) => k));

  return secureEqual(cookies[COOKIE_NAME], sessionToken(expected));
}

export default function handler(req, res) {
  const expected = process.env.ADMIN_ACCESS_KEY;
  if (!expected) return res.status(503).json({ error: 'Admin access is not configured.' });

  if (req.method === 'POST') {
    const provided = String(req.body?.key || '');
    if (!secureEqual(provided, expected)) {
      return res.status(401).json({ error: 'Access denied.' });
    }

    const token = sessionToken(expected);
    res.setHeader('Set-Cookie',
      COOKIE_NAME + '=' + encodeURIComponent(token) +
      '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800'
    );
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie',
      COOKIE_NAME + '=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
    );
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed.' });
}
