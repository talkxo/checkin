import { getSetting, setSetting } from './settings';
const tokenUrl = 'https://launchpad.37signals.com/authorization/token';
const endpoint = () => `https://3.basecampapi.com/${process.env.BC_ACCOUNT_ID}/buckets/${process.env.BC_PROJECT_ID}/chats/${process.env.BC_CHAT_ID}/lines.json`;
async function refresh(old:any){
  const body = new URLSearchParams({ type:'refresh', client_id: process.env.BC_CLIENT_ID!, client_secret: process.env.BC_CLIENT_SECRET!, refresh_token: old.refresh_token });
  const r = await fetch(tokenUrl, { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded', 'User-Agent':'TalkXO Checkin (ops@talkxo.com)' }, body });
  if(!r.ok) throw new Error('Basecamp refresh failed');
  const tok = await r.json();
  const value = { access_token: tok.access_token, refresh_token: tok.refresh_token ?? old.refresh_token, expires_at: Date.now() + (tok.expires_in ?? 3600)*1000 };
  await setSetting('basecamp_oauth', value); return value;
}
export async function getAccessToken(){ let rec = await getSetting('basecamp_oauth'); if(!rec) throw new Error('Basecamp not connected. Hit /api/basecamp/auth.'); if(Date.now() > (rec.expires_at - 60_000)) rec = await refresh(rec); return rec.access_token; }
export async function postCampfire(content: string){
  const access = await getAccessToken();
  const res = await fetch(endpoint(), { method:'POST', headers:{ 'Authorization': `Bearer ${access}`, 'Content-Type':'application/json', 'User-Agent':'TalkXO Checkin (ops@talkxo.com)' }, body: JSON.stringify({ content }) });
  if(res.status === 401){ await refresh(await getSetting('basecamp_oauth')); return postCampfire(content); }
  if(!res.ok) throw new Error(`Basecamp ${res.status}: ${await res.text()}`);
}


