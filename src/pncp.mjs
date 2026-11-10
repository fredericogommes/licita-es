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

async function getJson(path, params) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  // 204 (sem conteúdo) é como o PNCP sinaliza "nenhum registro" neste filtro.
  if (res.status === 204) return { data: [], totalRegistros: 0, totalPaginas: 0, numeroPagina: 1, empty: true };
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PNCP ${res.status} em ${path}: ${text.slice(0, 300)}`);
  }
  if (!text.trim()) return { data: [], totalRegistros: 0, totalPaginas: 0, numeroPagina: 1, empty: true };
  return JSON.parse(text);
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
  }
  return todos;
}
