// Cliente da API pública de consulta do PNCP (Portal Nacional de Contratações Públicas).
// Documentação: https://pncp.gov.br/api/consulta/swagger-ui/index.html
// Nenhuma autenticação é necessária: são dados abertos.

const BASE = 'https://pncp.gov.br/api/consulta/v1';

// Formata um Date (ou string YYYY-MM-DD) para o formato AAAAMMDD exigido pelo PNCP.
export function toPncpDate(d) {
  if (typeof d === 'string') {
    const only = d.replace(/-/g, '');
    if (/^\d{8}$/.test(only)) return only;
    d = new Date(d);
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(path, params, { tentativas = 5 } = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  let espera = 2000;
  for (let i = 1; i <= tentativas; i++) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    // 204 (sem conteúdo) é como o PNCP sinaliza "nenhum registro" neste filtro.
    if (res.status === 204) return { data: [], totalRegistros: 0, totalPaginas: 0, numeroPagina: 1, empty: true };
    const text = await res.text();
    const ct = res.headers.get('content-type') ?? '';
    const rateLimited = res.status === 429 || res.status === 503 ||
      (!ct.includes('json') && /limite de requisi|rate limit|excedido/i.test(text));
    if (rateLimited && i < tentativas) {
      await sleep(espera); espera = Math.min(espera * 2, 30000); continue;
    }
    if (!res.ok) throw new Error(`PNCP ${res.status} em ${path}: ${text.slice(0, 200)}`);
    if (!text.trim()) return { data: [], totalRegistros: 0, totalPaginas: 0, numeroPagina: 1, empty: true };
    try { return JSON.parse(text); }
    catch { throw new Error(`PNCP resposta não-JSON em ${path}: ${text.slice(0, 200)}`); }
  }
  throw new Error(`PNCP: limite de requisições persistente em ${path}`);
}

// Uma página de contratações publicadas num intervalo de datas.
// tamanhoPagina mínimo aceito pelo PNCP é 10 (máximo 50).
export function fetchContratacoesPorPublicacao({
  dataInicial, dataFinal, codigoModalidadeContratacao,
  uf, codigoMunicipioIbge, cnpj, pagina = 1, tamanhoPagina = 50,
}) {
  return getJson('/contratacoes/publicacao', {
    dataInicial, dataFinal, codigoModalidadeContratacao,
    uf, codigoMunicipioIbge, cnpj, pagina, tamanhoPagina,
  });
}

// Contratações com janela de propostas ainda aberta (recebendo propostas até dataFinal).
export function fetchContratacoesComPropostaAberta({
  dataFinal, codigoModalidadeContratacao,
  uf, codigoMunicipioIbge, cnpj, pagina = 1, tamanhoPagina = 50,
}) {
  return getJson('/contratacoes/proposta', {
    dataFinal, codigoModalidadeContratacao,
    uf, codigoMunicipioIbge, cnpj, pagina, tamanhoPagina,
  });
}

// Percorre todas as páginas de um intervalo, para uma modalidade. Retorna a lista crua.
export async function listarTudoPorPublicacao(opts, { maxPaginas = 200, onPagina } = {}) {
  const todos = [];
  let pagina = 1;
  while (pagina <= maxPaginas) {
    const r = await fetchContratacoesPorPublicacao({ ...opts, pagina });
    const data = r?.data ?? [];
    todos.push(...data);
    if (onPagina) onPagina({ pagina, total: r.totalPaginas, registros: r.totalRegistros, recebidos: todos.length });
    if (r.empty || data.length === 0 || pagina >= (r.totalPaginas ?? pagina)) break;
    pagina += 1;
    await sleep(400); // gentil com o PNCP para não tomar rate-limit
  }
  return todos;
}
