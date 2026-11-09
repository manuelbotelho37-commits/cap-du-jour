// Robot Radar But : récupère les matchs en direct (LiveScore + ESPN) depuis les serveurs de GitHub
// et les écrit dans live.json sur la branche radar-data. Le téléphone ne lit plus que GitHub.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
const FAV = ['eng.1', 'ger.1', 'esp.1', 'ita.1', 'ned.1', 'nor.1', 'den.1', 'gre.1'];
const UA = { 'user-agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', accept: 'application/json' };
async function get(url) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 15000);
  try { const r = await fetch(url, { headers: UA, signal: ac.signal }); if (!r.ok) throw new Error(url + ' -> ' + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
const pick = ev => ({ id: ev.id, date: ev.date, name: ev.name, links: (ev.links || []).slice(0, 2).map(l => ({ rel: l.rel, href: l.href })), status: ev.status,
  competitions: [{ competitors: ev.competitions[0].competitors.map(c => ({ homeAway: c.homeAway, score: c.score, team: { id: c.team.id, displayName: c.team.displayName, shortDisplayName: c.team.shortDisplayName }, statistics: c.statistics })),
    details: (ev.competitions[0].details || []).map(d => ({ scoringPlay: d.scoringPlay, type: d.type, clock: d.clock, team: d.team && { id: d.team.id }, athletesInvolved: (d.athletesInvolved || []).slice(0, 1).map(a => ({ displayName: a.displayName })) })) }] });
async function once() {
  const out = { at: new Date().toISOString(), ls: null, lsErr: null, espn: {}, espnErr: {} };
  try {
    const j = await get('https://prod-public-api.livescore.com/v1/api/app/live/soccer/1?MD=1');
    out.ls = { Stages: (j.Stages || []).map(s => ({ Snm: s.Snm, Cnm: s.Cnm, Ccd: s.Ccd, Scd: s.Scd, CompN: s.CompN,
      Events: (s.Events || []).map(e => ({ Eid: e.Eid, Eps: e.Eps, Esd: e.Esd, Tr1: e.Tr1, Tr2: e.Tr2, T1: (e.T1 || []).slice(0, 1).map(t => ({ Nm: t.Nm, ID: t.ID })), T2: (e.T2 || []).slice(0, 1).map(t => ({ Nm: t.Nm, ID: t.ID })) })) })) };
  } catch (e) { out.lsErr = String(e.message || e); }
  await Promise.all(FAV.map(async lg => {
    try { const j = await get('https://site.api.espn.com/apis/site/v2/sports/soccer/' + lg + '/scoreboard');
      out.espn[lg] = { leagues: [{ name: j.leagues && j.leagues[0] && j.leagues[0].name }], events: (j.events || []).map(pick) }; }
    catch (e) { out.espnErr[lg] = String(e.message || e); }
  }));
  writeFileSync('live.json', JSON.stringify(out));
  // classements : une fois par heure
  let st = existsSync('standings.json') ? JSON.parse(readFileSync('standings.json', 'utf8')) : { at: 0, t: {} };
  if (Date.now() - st.at > 3600e3) {
    await Promise.all(FAV.map(async lg => { try { st.t[lg] = await get('https://site.api.espn.com/apis/v2/sports/soccer/' + lg + '/standings'); } catch (e) {} }));
    st.at = Date.now(); writeFileSync('standings.json', JSON.stringify(st));
  }
  const n = out.ls ? out.ls.Stages.reduce((a, s) => a + s.Events.length, 0) : 0;
  console.log(out.at, 'LiveScore events:', n, out.lsErr || '', '| ESPN ok:', Object.keys(out.espn).length, JSON.stringify(out.espnErr));
}
await once();
