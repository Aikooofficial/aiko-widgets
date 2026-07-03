let cache = { time: 0, data: null };
async function getAppToken(clientId, clientSecret){
  const params = new URLSearchParams({client_id:clientId,client_secret:clientSecret,grant_type:'client_credentials'});
  const r = await fetch('https://id.twitch.tv/oauth2/token',{method:'POST',body:params});
  return r.json();
}
async function refreshUserToken(clientId, clientSecret, refreshToken){
  const params = new URLSearchParams({client_id:clientId,client_secret:clientSecret,grant_type:'refresh_token',refresh_token:refreshToken});
  const r = await fetch('https://id.twitch.tv/oauth2/token',{method:'POST',body:params});
  return r.json();
}
async function twitch(path, token, clientId){
  const r = await fetch(`https://api.twitch.tv/helix${path}`, {headers:{'Authorization':`Bearer ${token}`,'Client-Id':clientId}});
  return r.json();
}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control','no-store');
  if (cache.data && Date.now()-cache.time < 15000) return res.json(cache.data);
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const broadcasterLogin = process.env.TWITCH_BROADCASTER_LOGIN || 'aikooofficial';
  const refreshToken = process.env.TWITCH_REFRESH_TOKEN;
  if (!clientId || !clientSecret) return res.json({ok:false, followers:1100, subs:155, message:'missing env vars'});
  try{
    const app = await getAppToken(clientId, clientSecret);
    const users = await twitch(`/users?login=${encodeURIComponent(broadcasterLogin)}`, app.access_token, clientId);
    const broadcasterId = users.data?.[0]?.id;
    if (!broadcasterId) throw new Error('broadcaster not found');
    const followData = await twitch(`/channels/followers?broadcaster_id=${broadcasterId}&first=1`, app.access_token, clientId);
    let subs = 155;
    if (refreshToken){
      const userTok = await refreshUserToken(clientId, clientSecret, refreshToken);
      if (userTok.access_token){
        const subData = await twitch(`/subscriptions?broadcaster_id=${broadcasterId}&first=1`, userTok.access_token, clientId);
        if (typeof subData.total === 'number') subs = subData.total;
      }
    }
    const data = {ok:true, followers: followData.total ?? 1100, subs};
    cache = {time:Date.now(), data};
    res.json(data);
  } catch(e){ res.json({ok:false, followers:1100, subs:155, message:e.message}); }
};
