// Tabelas de domínio do PNCP (Lei 14.133/2021).
// Fonte: Manual das APIs de Consulta do PNCP.

export const MODALIDADES = {
  1: 'Leilão - Eletrônico',
  2: 'Diálogo Competitivo',
  3: 'Concurso',
  4: 'Concorrência - Eletrônica',
  5: 'Concorrência - Presencial',
  6: 'Pregão - Eletrônico',
  7: 'Pregão - Presencial',
  8: 'Dispensa de Licitação',
  9: 'Inexigibilidade',
  10: 'Manifestação de Interesse',
  11: 'Pré-qualificação',
  12: 'Credenciamento',
  13: 'Leilão - Presencial',
};

// Modalidades que, por padrão, interessam a quem busca oportunidades de venda.
export const MODALIDADES_PADRAO = [6, 4, 7, 5, 8, 9, 12];

export const MODOS_DISPUTA = {
  1: 'Aberto',
  2: 'Fechado',
  3: 'Aberto-Fechado',
  4: 'Dispensa Com Disputa',
  5: 'Não se aplica',
  6: 'Fechado-Aberto',
};

export const PODERES = { E: 'Executivo', L: 'Legislativo', J: 'Judiciário', N: 'Não se aplica' };
export const ESFERAS = { F: 'Federal', E: 'Estadual', M: 'Municipal', D: 'Distrital', N: 'Não se aplica' };

export function nomeModalidade(id) {
  return MODALIDADES[id] ?? `Modalidade ${id}`;
}
