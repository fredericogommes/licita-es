// Armazenamento simples em arquivo JSON + busca/filtros em memória.
// Primeira versão sem banco de dados, para rodar sem nenhuma dependência.
// Próximo passo natural: trocar por SQLite/Postgres quando o volume crescer.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export const DATA_PATH = new URL('../data/editais.json', import.meta.url).pathname;

export async function salvarEditais(editais, path = DATA_PATH) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(editais, null, 0), 'utf8');
}

export async function carregarEditais(path = DATA_PATH) {
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

function texto(s) {
  return (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Aplica os filtros de oportunidade sobre a lista de editais já normalizados.
// Espelha os filtros da referência: palavra-chave, UF, município, valor, modalidade, SRP, situação.
export function buscar(editais, filtros = {}) {
  const {
    q, uf, municipioIbge, modalidadeId,
    valorMin, valorMax, srp, situacaoId,
    publicadoDe, publicadoAte, propostaAbertaEm,
    ordenarPor = 'dataPublicacao', ordem = 'desc',
    pagina = 1, tamanhoPagina = 20,
  } = filtros;

  const termos = q ? texto(q).split(/\s+/).filter(Boolean) : [];
  const ufs = uf ? (Array.isArray(uf) ? uf : [uf]).map((x) => x.toUpperCase()) : null;
  const mods = modalidadeId != null
    ? (Array.isArray(modalidadeId) ? modalidadeId : [modalidadeId]).map(Number)
    : null;

  let res = editais.filter((e) => {
    if (termos.length) {
      const alvo = texto(`${e.objeto} ${e.informacaoComplementar ?? ''} ${e.orgao?.razaoSocial ?? ''}`);
      if (!termos.every((t) => alvo.includes(t))) return false;
    }
    if (ufs && !ufs.includes((e.unidade?.uf ?? '').toUpperCase())) return false;
    if (municipioIbge && String(e.unidade?.codigoIbge) !== String(municipioIbge)) return false;
    if (mods && !mods.includes(e.modalidadeId)) return false;
    if (situacaoId != null && e.situacaoId !== Number(situacaoId)) return false;
    if (srp != null && Boolean(e.srp) !== Boolean(srp)) return false;
    if (valorMin != null && !(Number(e.valorEstimado) >= Number(valorMin))) return false;
    if (valorMax != null && !(Number(e.valorEstimado) <= Number(valorMax))) return false;
    if (publicadoDe && (e.dataPublicacao ?? '') < publicadoDe) return false;
    if (publicadoAte && (e.dataPublicacao ?? '') > publicadoAte + 'T23:59:59') return false;
    if (propostaAbertaEm) {
      const ini = e.dataAberturaProposta ?? '';
      const fim = e.dataEncerramentoProposta ?? '';
      if (fim && fim < propostaAbertaEm) return false;
      if (ini && ini > propostaAbertaEm + 'T23:59:59') return false;
    }
    return true;
  });

  const dir = ordem === 'asc' ? 1 : -1;
  res.sort((a, b) => {
    const av = a[ordenarPor] ?? '';
    const bv = b[ordenarPor] ?? '';
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });

  const total = res.length;
  const start = (pagina - 1) * tamanhoPagina;
  const itens = res.slice(start, start + tamanhoPagina);
  return { total, pagina, tamanhoPagina, totalPaginas: Math.ceil(total / tamanhoPagina), itens };
}

// Agregados para alimentar os contadores das facetas (como na referência).
export function facetas(editais) {
  const porUf = {};
  const porModalidade = {};
  for (const e of editais) {
    const uf = e.unidade?.uf ?? '??';
    porUf[uf] = (porUf[uf] ?? 0) + 1;
    const m = e.modalidade ?? '??';
    porModalidade[m] = (porModalidade[m] ?? 0) + 1;
  }
  return { porUf, porModalidade, total: editais.length };
}
