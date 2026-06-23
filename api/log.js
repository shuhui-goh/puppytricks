// Receives anonymous gesture/usage events from the browser and writes
// them to Supabase. The service role key lives only here, server-side —
// the client never sees it and never talks to Supabase directly.

const ALLOWED_EVENTS = [
  'session_start',
  'camera_granted',
  'camera_denied',
  'warmup_complete',
  'hint_shown',
  'gesture_detected',
  'too_many_hands',
  'about_opened',
  'small_screen_shown',
  'session_end',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { session_id, event_type, gesture, ms_since_start } = body || {};

  if (!session_id || !event_type || typeof ms_since_start !== 'number') {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!ALLOWED_EVENTS.includes(event_type)) {
    return res.status(400).json({ error: 'Unknown event_type' });
  }

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/gesture_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        session_id,
        event_type,
        gesture: gesture || null,
        ms_since_start,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Supabase insert failed:', response.status, text);
      return res.status(502).json({ error: 'Failed to log event' });
    }

    return res.status(204).end();
  } catch (err) {
    console.error('Error logging event:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
