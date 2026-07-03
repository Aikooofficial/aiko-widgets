module.exports = async (req, res) => {
  const code = req.query.code;
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;
  if (!code) return res.status(400).send('Missing code.');
  if (!clientId || !clientSecret) return res.status(500).send('Missing Twitch env vars.');
  const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, grant_type: 'authorization_code', redirect_uri: `${baseUrl}/api/callback` });
  const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', { method:'POST', body: params });
  const token = await tokenRes.json();
  if (!token.access_token) return res.status(500).json(token);
  res.setHeader('content-type','text/html');
  res.end(`<h1>Token Created</h1><p>Copy this refresh token into Vercel as <b>TWITCH_REFRESH_TOKEN</b>:</p><textarea style="width:95%;height:120px">${token.refresh_token}</textarea><p>Then redeploy and open <a href="/widget">/widget</a>.</p>`);
};
