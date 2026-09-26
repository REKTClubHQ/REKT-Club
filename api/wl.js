export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecret) {
    return res.status(503).json({ error: 'Whitelist database is not configured.' });
  }

  const rawX = typeof req.body?.x_username === 'string' ? req.body.x_username : '';
  const rawWallet = typeof req.body?.wallet_address === 'string' ? req.body.wallet_address : '';

  const xUsername = rawX.trim().replace(/^@/, '').toLowerCase();
  const walletAddress = rawWallet.trim().toLowerCase();

  if (!/^[A-Za-z0-9_]{1,15}$/.test(xUsername)) {
    return res.status(400).json({ error: 'Invalid X username.' });
  }

  if (!/^0x[a-f0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Invalid wallet address.' });
  }

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/whitelist_entries`, {
      method: 'POST',
      headers: {
        apikey: supabaseSecret,
        Authorization: `Bearer ${supabaseSecret}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        x_username: xUsername,
        wallet_address: walletAddress,
        follow_claimed: true,
        like_claimed: true,
        repost_claimed: true
      })
    });

    if (response.ok) {
      return res.status(201).json({ ok: true });
    }

    let detail = '';
    try {
      const body = await response.json();
      detail = [body?.code, body?.message, body?.details].filter(Boolean).join(' ');
      if (body?.code === '23505') {
        return res.status(409).json({ error: 'This wallet or X username is already registered.' });
      }
    } catch (_) {}

    console.error('Supabase whitelist insert failed:', response.status, detail);
    return res.status(502).json({ error: 'Could not save whitelist request.' });
  } catch (error) {
    console.error('Whitelist API error:', error);
    return res.status(502).json({ error: 'Could not reach whitelist database.' });
  }
}
