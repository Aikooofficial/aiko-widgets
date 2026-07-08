let cachedAppToken = null;
let cachedTokenExpiresAt = 0;
let cachedBroadcasterId = null;
let cachedPayload = null;
let cachedPayloadAt = 0;

const CACHE_MS = 15000;

function nextGoal(current, step) {
  return Math.floor(current / step) * step + step;
}

async function getAppToken() {
  const now = Date.now();
  if (cachedAppToken && now < cachedTokenExpiresAt) return cachedAppToken;

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET in Vercel Environment Variables.');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials'
  });

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twitch token request failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedAppToken = data.access_token;
  cachedTokenExpiresAt = Date.now() + Math.max((data.expires_in - 300) * 1000, 60000);
  return cachedAppToken;
}

async function twitchFetch(path) {
  const token = await getAppToken();
  const clientId = process.env.TWITCH_CLIENT_ID;
  const res = await fetch(`https://api.twitch.tv/helix/${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Client-Id': clientId
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twitch API failed: ${res.status} ${text}`);
  }

  return res.json();
}

async function getBroadcasterId(login) {
  if (cachedBroadcasterId) return cachedBroadcasterId;
  const users = await twitchFetch(`users?login=${encodeURIComponent(login)}`);
  const user = users.data?.[0];
  if (!user) throw new Error(`Twitch user not found for login: ${login}`);
  cachedBroadcasterId = user.id;
  return cachedBroadcasterId;
}

export default async function handler(req, res) {
  try {
    const now = Date.now();
    if (cachedPayload && now - cachedPayloadAt < CACHE_MS) {
      return res.status(200).json(cachedPayload);
    }

    const login = process.env.TWITCH_LOGIN || 'aikooofficial';
    const step = Number(process.env.NGN_GOAL_STEP || 100);
    const broadcasterId = await getBroadcasterId(login);

    const followers = await twitchFetch(`channels/followers?broadcaster_id=${encodeURIComponent(broadcasterId)}&first=1`);
    const current = Number(followers.total || 0);
    const goal = nextGoal(current, step);

    cachedPayload = {
      label: 'NGN MEMBERS',
      login,
      current,
      goal,
      step,
      percent: Math.min(100, Math.round((current / goal) * 100)),
      updatedAt: new Date().toISOString()
    };
    cachedPayloadAt = now;

    res.status(200).json(cachedPayload);
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message || 'Unknown error'
    });
  }
}
