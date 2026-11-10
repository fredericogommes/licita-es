// Converte um registro cru do PNCP no nosso modelo "Edital" (oportunidade).
import { nomeModalidade, PODERES, ESFERAS } from './modalidades.mjs';

// Monta o link público do edital no portal PNCP.
export function linkEditalPncp(cnpj, ano, sequencial) {
  if (!cnpj || !ano || sequencial == null) return null;
  return `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${sequencial}`;
}

export function normalizarContratacao(c) {
  const org = c.orgaoEntidade ?? {};
  const uni = c.unidadeOrgao ?? {};
  const cnpj = org.cnpj ?? null;
  const ano = c.anoCompra ?? null;
  const seq = c.sequencialCompra ?? null;

  return {
    id: c.numeroControlePNCP ?? `${cnpj}-${ano}-${seq}`,
    numeroControlePNCP: c.numeroControlePNCP ?? null,
    objeto: c.objetoCompra ?? '',
    informacaoComplementar: c.informacaoComplementar ?? null,

    modalidadeId: c.modalidadeId ?? null,
    modalidade: c.modalidadeNome ?? nomeModalidade(c.modalidadeId),
    modoDisputa: c.modoDisputaNome ?? null,
    tipoInstrumento: c.tipoInstrumentoConvocatorioNome ?? null,
    srp: Boolean(c.srp), // Sistema de Registro de Preços

    situacaoId: c.situacaoCompraId ?? null,
    situacao: c.situacaoCompraNome ?? null,

    valorEstimado: c.valorTotalEstimado ?? null,
    valorHomologado: c.valorTotalHomologado ?? null,

    dataPublicacao: c.dataPublicacaoPncp ?? null,
    dataAberturaProposta: c.dataAberturaProposta ?? null,
    dataEncerramentoProposta: c.dataEncerramentoProposta ?? null,
    dataAtualizacao: c.dataAtualizacaoGlobal ?? c.dataAtualizacao ?? null,

    orgao: {
      cnpj,
      razaoSocial: org.razaoSocial ?? null,
      poder: PODERES[org.poderId] ?? org.poderId ?? null,
      esfera: ESFERAS[org.esferaId] ?? org.esferaId ?? null,
    },
    unidade: {
      nome: uni.nomeUnidade ?? null,
      uf: uni.ufSigla ?? null,
      ufNome: uni.ufNome ?? null,
      municipio: uni.municipioNome ?? null,
      codigoIbge: uni.codigoIbge ?? null,
    },

    amparoLegal: c.amparoLegal?.nome ?? null,
    numeroCompra: c.numeroCompra ?? null,
    processo: c.processo ?? null,

    link: linkEditalPncp(cnpj, ano, seq),
    _ano: ano,
    _sequencial: seq,
  };
}
