module.exports = async (req, res) => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;
  if (!clientId) return res.status(500).send('Missing TWITCH_CLIENT_ID in Vercel Environment Variables.');
  const scopes = ['channel:read:subscriptions','moderator:read:followers'].join(' ');
  const url = new URL('https://id.twitch.tv/oauth2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', `${baseUrl}/api/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes);
  res.redirect(url.toString());
};
