// Gravação no Supabase via API REST (PostgREST), sem dependências.
// Usa a service_role key (lado servidor): respeita as tabelas com RLS ligado.
// Variáveis de ambiente necessárias:
//   SUPABASE_URL                 ex.: https://nautccpjtclwftmmsijg.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    chave secreta (service_role) do projeto

function cfg() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  return { url: url.replace(/\/$/, ''), key };
}

export function supabaseConfigurado() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Faz upsert (merge por chave primária) de um lote de linhas numa tabela.
async function upsert(tabela, linhas, onConflict) {
  if (!linhas.length) return 0;
  const { url, key } = cfg();
  const endpoint = `${url}/rest/v1/${tabela}` + (onConflict ? `?on_conflict=${onConflict}` : '');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(linhas),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status} em ${tabela}: ${(await res.text()).slice(0, 300)}`);
  return linhas.length;
}

function loteDe(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// Grava editais normalizados (e seus órgãos) no Supabase.
export async function gravarEditais(editais, { lote = 500 } = {}) {
  // Órgãos (dedup por CNPJ)
  const orgaos = new Map();
  for (const e of editais) {
    if (e.orgao?.cnpj) orgaos.set(e.orgao.cnpj, {
      cnpj: e.orgao.cnpj, razao_social: e.orgao.razaoSocial,
      poder: e.orgao.poder, esfera: e.orgao.esfera,
    });
  }
  for (const l of loteDe([...orgaos.values()], lote)) await upsert('orgaos', l, 'cnpj');

  // Editais
  const linhas = editais.map((e) => ({
    id: e.id, objeto: e.objeto, informacao_complementar: e.informacaoComplementar,
    modalidade_id: e.modalidadeId, modalidade: e.modalidade, modo_disputa: e.modoDisputa,
    tipo_instrumento: e.tipoInstrumento, srp: e.srp,
    situacao_id: e.situacaoId, situacao: e.situacao,
    valor_estimado: e.valorEstimado, valor_homologado: e.valorHomologado,
    data_publicacao: e.dataPublicacao, data_abertura_proposta: e.dataAberturaProposta,
    data_encerramento_proposta: e.dataEncerramentoProposta, data_atualizacao: e.dataAtualizacao,
    orgao_cnpj: e.orgao?.cnpj ?? null, unidade_codigo_ibge: e.unidade?.codigoIbge ?? null,
    uf: e.unidade?.uf ?? null, municipio: e.unidade?.municipio ?? null,
    amparo_legal: e.amparoLegal, numero_compra: e.numeroCompra, processo: e.processo,
    link: e.link, ano: e._ano, sequencial: e._sequencial,
  }));
  let n = 0;
  for (const l of loteDe(linhas, lote)) n += await upsert('editais', l, 'id');
  return { orgaos: orgaos.size, editais: n };
}
