// Supabase de mentira para testes: tabelas ema e lanternas em memória (REST no estilo PostgREST, só o que as rotas usam)
const http = require('http');
const db = { ema: [{ id: 1, nome: 'Lua', recado: 'Que vale lindo', cor: 'azul', aprovado: false, criado_em: '2026-11-10T12:00:00Z' }, { id: 2, nome: 'Mar', recado: 'Passei por aqui', cor: 'madeira', aprovado: true, criado_em: '2026-11-11T12:00:00Z' }], lanternas: [] };
let seq = 10;
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'), t = u.pathname.split('/').pop(), rows = db[t]; let body = '';
  req.on('data', (c) => body += c); req.on('end', () => {
    if (!rows || req.headers.apikey !== 'chave-teste') { res.writeHead(401); return res.end('{}'); }
    const f = (r) => [...u.searchParams].every(([k, v]) => { if (['select', 'order', 'limit'].includes(k)) return true; const [op, val] = v.split(/\.(.*)/); if (op === 'eq') return String(r[k]) === val; if (op === 'gte') return String(r[k]) >= val; return true; });
    if (req.method === 'GET') { let out = rows.filter(f); const o = u.searchParams.get('order'); if (o) { const [k, d] = o.split('.'); out.sort((a, b) => (a[k] < b[k] ? -1 : 1) * (d === 'desc' ? -1 : 1)); } const l = +u.searchParams.get('limit'); if (l) out = out.slice(0, l); res.writeHead(200, { 'content-type': 'application/json', 'content-range': `0-${out.length}/${rows.filter(f).length}` }); return res.end(JSON.stringify(out)); }
    if (req.method === 'POST') { const r = Object.assign({ id: seq++, criado_em: new Date().toISOString() }, JSON.parse(body)); rows.push(r); res.writeHead(201, { 'content-type': 'application/json' }); return res.end(JSON.stringify([r])); }
    if (req.method === 'PATCH') { rows.filter(f).forEach((r) => Object.assign(r, JSON.parse(body))); res.writeHead(204); return res.end(); }
    if (req.method === 'DELETE') { db[t] = rows.filter((r) => !f(r)); res.writeHead(204); return res.end(); }
    res.writeHead(405); res.end();
  });
}).listen(54321);
