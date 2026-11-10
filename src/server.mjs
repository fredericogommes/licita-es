// Servidor HTTP sem dependências: expõe a busca de oportunidades e serve a UI.
// Uso: node src/server.mjs   (porta padrão 3000, ou PORT=8080 node src/server.mjs)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { carregarEditais, buscar, facetas } from './store.mjs';
import { MODALIDADES } from './modalidades.mjs';

const PORT = Number(process.env.PORT ?? 3000);
const PUBLIC = new URL('../public/', import.meta.url).pathname;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

// Carrega a base uma vez na subida (recarrega com POST /api/reload).
let editais = await carregarEditais();
console.log(`Base carregada: ${editais.length} editais.`);

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

async function lerCorpo(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (req.method === 'POST' && url.pathname === '/api/oportunidades') {
      const filtros = await lerCorpo(req);
      return json(res, 200, buscar(editais, filtros));
    }
    if (req.method === 'GET' && url.pathname === '/api/facetas') {
      return json(res, 200, facetas(editais));
    }
    if (req.method === 'GET' && url.pathname === '/api/modalidades') {
      return json(res, 200, MODALIDADES);
    }
    if (req.method === 'POST' && url.pathname === '/api/reload') {
      editais = await carregarEditais();
      return json(res, 200, { ok: true, total: editais.length });
    }
    // Arquivos estáticos da pasta public/
    if (req.method === 'GET') {
      const rel = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
      if (!rel.includes('..')) {
        try {
          const buf = await readFile(PUBLIC + rel);
          res.writeHead(200, { 'Content-Type': MIME[extname(rel)] ?? 'application/octet-stream' });
          return res.end(buf);
        } catch {}
      }
    }
    json(res, 404, { error: 'não encontrado' });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));
