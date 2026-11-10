-- Modelo de dados da reconstrução (Postgres / Supabase-ready).
-- Guarda os editais coletados do PNCP e dá suporte à busca e aos próximos módulos
-- (kanban, alertas, documentos). Projetado para ser idempotente: pode rodar de novo.

-- ÓRGÃOS / ENTIDADES CONTRATANTES ------------------------------------------
create table if not exists orgaos (
  cnpj          text primary key,
  razao_social  text,
  poder         text,       -- Executivo / Legislativo / Judiciário
  esfera        text        -- Federal / Estadual / Municipal / Distrital
);

-- UNIDADES ADMINISTRATIVAS (uma localização de um órgão) --------------------
create table if not exists unidades (
  codigo_ibge   text,
  orgao_cnpj    text references orgaos(cnpj),
  nome          text,
  uf            text,
  uf_nome       text,
  municipio     text,
  primary key (orgao_cnpj, codigo_ibge, nome)
);

-- EDITAIS / CONTRATAÇÕES (a oportunidade) -----------------------------------
create table if not exists editais (
  id                          text primary key,  -- numeroControlePNCP
  objeto                      text,
  informacao_complementar     text,

  modalidade_id               int,
  modalidade                  text,
  modo_disputa                text,
  tipo_instrumento            text,
  srp                         boolean default false,  -- registro de preço

  situacao_id                 int,
  situacao                    text,

  valor_estimado              numeric,
  valor_homologado            numeric,

  data_publicacao             timestamptz,
  data_abertura_proposta      timestamptz,
  data_encerramento_proposta  timestamptz,
  data_atualizacao            timestamptz,

  orgao_cnpj                  text references orgaos(cnpj),
  unidade_codigo_ibge         text,
  uf                          text,
  municipio                   text,

  amparo_legal                text,
  numero_compra               text,
  processo                    text,
  link                        text,              -- URL pública do edital no PNCP

  ano                         int,
  sequencial                  int,

  coletado_em                 timestamptz default now()
);

create index if not exists idx_editais_uf              on editais (uf);
create index if not exists idx_editais_modalidade      on editais (modalidade_id);
create index if not exists idx_editais_publicacao      on editais (data_publicacao desc);
create index if not exists idx_editais_encerramento    on editais (data_encerramento_proposta);
create index if not exists idx_editais_valor           on editais (valor_estimado);
-- Busca textual no objeto (português), para a palavra-chave.
create index if not exists idx_editais_objeto_fts
  on editais using gin (to_tsvector('portuguese', coalesce(objeto,'') || ' ' || coalesce(informacao_complementar,'')));

-- ITENS DO EDITAL (carregados sob demanda de outro endpoint do PNCP) --------
create table if not exists edital_itens (
  edital_id     text references editais(id) on delete cascade,
  numero_item   int,
  descricao     text,
  quantidade    numeric,
  unidade       text,
  valor_unitario_estimado numeric,
  valor_total_estimado    numeric,
  primary key (edital_id, numero_item)
);

-- CONTROLE DE COLETA (para a coleta diária incremental) ---------------------
create table if not exists coletas (
  id            bigint generated always as identity primary key,
  executada_em  timestamptz default now(),
  data_de       date,
  data_ate      date,
  modalidades   int[],
  uf            text,
  inseridos     int,
  atualizados   int,
  observacao    text
);
