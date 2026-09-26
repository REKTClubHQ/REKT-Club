const VALID_STATUSES = new Set(['pending','gtd','fcfs','not_selected']);

import { isAdminRequest } from './admin-auth.js';

function adminOk(req) {
  return isAdminRequest(req);
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  return { url, key };
}

export default async function handler(req, res) {
  if (!adminOk(req)) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    return res.status(503).json({ error: 'Whitelist database is not configured.' });
  }

  const base = url.replace(/\/$/, '') + '/rest/v1/whitelist_entries';
  const headers = {
    apikey: key,
    'Content-Type': 'application/json'
  };

  try {
    if (req.method === 'GET') {
      const upstream = await fetch(
        base + '?select=id,x_username,wallet_address,comment_url,created_at,status&order=created_at.desc',
        { headers }
      );
      const body = await upstream.text();
      if (!upstream.ok) {
        console.error('Admin list failed:', upstream.status, body);
        return res.status(502).json({ error: 'Could not load whitelist entries.' });
      }
      return res.status(200).send(body);
    }

    if (req.method === 'PATCH') {
      const status = String(req.body?.status || '').trim();
      const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : [req.body?.id];
      const ids = [...new Set(rawIds.map(Number).filter(id => Number.isInteger(id) && id > 0))];

      if (!ids.length || !VALID_STATUSES.has(status)) {
        return res.status(400).json({ error: 'Invalid id(s) or status.' });
      }

      const filter = ids.length === 1
        ? '?id=eq.' + encodeURIComponent(ids[0])
        : '?id=in.(' + ids.map(id => encodeURIComponent(id)).join(',') + ')';

      const upstream = await fetch(base + filter, {
        method: 'PATCH',
        headers: {
          ...headers,
          Prefer: 'return=representation'
        },
        body: JSON.stringify({ status })
      });

      const body = await upstream.text();
      if (!upstream.ok) {
        console.error('Admin update failed:', upstream.status, body);
        return res.status(502).json({ error: 'Could not update whitelist status.' });
      }

      return res.status(200).send(body || '[]');
    }

    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('Admin whitelist API error:', error);
    return res.status(502).json({ error: 'Whitelist admin service unavailable.' });
  }
}
