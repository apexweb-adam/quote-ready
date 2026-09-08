import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export function makeServer({ apiKey = process.env.ASSEMBLYAI_API_KEY, fetcher = fetch } = {}) {
  let tokenAt = 0;
  const files = new Map([['/', ['index.html','text/html']], ['/app.mjs',['app.mjs','text/javascript']], ['/intake.mjs',['intake.mjs','text/javascript']], ['/tool-results.mjs',['tool-results.mjs','text/javascript']], ['/audio-worklet.js',['audio-worklet.js','text/javascript']], ['/style.css',['style.css','text/css']]]);
  return http.createServer(async (req, res) => {
    const respond = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
    const expectedHost = `127.0.0.1:${req.socket.localPort}`;
    if (req.headers.host !== expectedHost) return respond(403, { error: 'Local host only' });
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self' wss://agents.assemblyai.com; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    if (req.url === '/api/config' && req.method === 'GET') return respond(200, { liveConfigured: Boolean(apiKey) });
    if (req.url === '/api/token' && req.method === 'POST') {
      if (req.headers.origin !== `http://${expectedHost}` || req.headers['x-quoteready'] !== 'voice') return respond(403, { error: 'Same-origin request required' });
      if (!apiKey) return respond(503, { error: 'AssemblyAI API access is not configured. Use the sample workflow.' });
      if (Date.now() - tokenAt < 10000) return respond(429, { error: 'Wait ten seconds before reconnecting' });
      tokenAt = Date.now();
      try {
        const r = await fetcher('https://agents.assemblyai.com/v1/token?expires_in_seconds=60&max_session_duration_seconds=300', { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(15000) });
        if (!r.ok) return respond(502, { error: `AssemblyAI token request failed (${r.status})` });
        const body = await r.json();
        if (typeof body.token !== 'string' || !body.token) throw Error('Invalid token');
        return respond(200, { token: body.token });
      } catch { return respond(502, { error: 'AssemblyAI token request did not complete' }); }
    }
    if (req.method !== 'GET' || !files.has(req.url)) return respond(404, { error: 'Not found' });
    const [name, type] = files.get(req.url);
    try { const body = await readFile(new URL(`./public/${name}`, import.meta.url)); res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(body); }
    catch { respond(500, { error: 'Application file unavailable' }); }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4318);
  makeServer().listen(port, '127.0.0.1', () => console.log(`QuoteReady: http://127.0.0.1:${port}`));
}
