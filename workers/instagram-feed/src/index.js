/*
 * Instagram feed for the Lineage Collections website.
 *
 * GET /            -> { posts: [{ image, url, caption, timestamp }] } (newest first)
 * Cron (weekly)    -> refreshes the long-lived Instagram token before its 60-day expiry
 *
 * The token lives in KV (key "ig_token") so the cron job can rotate it.
 * On first run it falls back to the IG_TOKEN secret.
 */

const GRAPH = 'https://graph.instagram.com';
const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
const POST_LIMIT = 12;
const CACHE_SECONDS = 900;

async function getToken(env) {
  return (await env.INSTAGRAM_KV.get('ig_token')) || env.IG_TOKEN;
}

function corsHeaders(request, env) {
  const allowed = (env.ALLOWED_ORIGINS || '*').split(',').map((o) => o.trim());
  const origin = request.headers.get('Origin');
  const allowOrigin = allowed.includes('*') ? '*' : allowed.includes(origin) ? origin : allowed[0];
  return { 'Access-Control-Allow-Origin': allowOrigin, Vary: 'Origin' };
}

async function fetchPosts(env) {
  const token = await getToken(env);
  if (!token) throw new Error('No Instagram token configured');

  const res = await fetch(`${GRAPH}/me/media?fields=${FIELDS}&limit=${POST_LIMIT}&access_token=${token}`);
  if (!res.ok) throw new Error(`Instagram API ${res.status}: ${await res.text()}`);

  const json = await res.json();
  return (json.data || [])
    .map((p) => ({
      image: p.media_type === 'VIDEO' ? p.thumbnail_url : p.media_url,
      url: p.permalink,
      caption: p.caption || '',
      timestamp: p.timestamp
    }))
    .filter((p) => p.image);
}

export default {
  async fetch(request, env, ctx) {
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET' } });
    }
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    // Serve from the edge cache so Instagram is called at most once per CACHE_SECONDS per location
    const cache = caches.default;
    const cacheKey = new Request(new URL('/', request.url).toString());
    const cached = await cache.match(cacheKey);
    if (cached) {
      return new Response(cached.body, { headers: { ...Object.fromEntries(cached.headers), ...cors } });
    }

    try {
      const posts = await fetchPosts(env);
      const body = JSON.stringify({ posts });
      const headers = { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_SECONDS}` };
      ctx.waitUntil(cache.put(cacheKey, new Response(body, { headers })));
      return new Response(body, { headers: { ...headers, ...cors } });
    } catch (err) {
      console.error(JSON.stringify({ message: 'instagram_fetch_failed', error: String(err) }));
      return new Response(JSON.stringify({ posts: [], error: 'Feed unavailable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...cors }
      });
    }
  },

  async scheduled(controller, env) {
    const token = await getToken(env);
    if (!token) return;

    const res = await fetch(`${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`);
    if (!res.ok) {
      console.error(JSON.stringify({ message: 'instagram_token_refresh_failed', status: res.status, body: await res.text() }));
      return;
    }

    const { access_token: newToken, expires_in: expiresIn } = await res.json();
    await env.INSTAGRAM_KV.put('ig_token', newToken);
    console.log(JSON.stringify({ message: 'instagram_token_refreshed', expiresInDays: Math.round(expiresIn / 86400) }));
  }
};
