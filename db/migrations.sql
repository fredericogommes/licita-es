-- ============================================================
-- Migrações aplicadas no Supabase (projeto licitacoes), em ordem.
-- O schema base dos editais está em db/schema.sql.
-- ============================================================

-- 0001 — Busca por texto sem acento + leitura pública (dados abertos)
create extension if not exists unaccent;
create extension if not exists pg_trgm;
create or replace function f_unaccent(text)
  returns text language sql immutable parallel safe strict set search_path = public as
$$ select public.unaccent('public.unaccent', $1) $$;
alter table editais
  add column if not exists busca text
  generated always as (lower(f_unaccent(coalesce(objeto,'') || ' ' || coalesce(informacao_complementar,'')))) stored;
create index if not exists idx_editais_busca_trgm on editais using gin (busca gin_trgm_ops);
-- editais/orgaos/unidades/edital_itens: leitura pública (select) para anon/authenticated.
-- (políticas "leitura publica ..." criadas no banco)

-- 0002 — Fundação multiempresa (tenant) + RBAC + Kanban + tarefas + alertas + favoritos + auditoria
-- Tabelas: tenants, empresas, memberships, boards, board_columns, cards, card_checklist,
--   card_comments, card_tags, card_history, tasks, notifications, favorites, saved_searches, audit_events.
-- RLS: tudo isolado por tenant via função public.tenant_ids_do_usuario() (memberships do auth.uid()).
-- Papéis (§10 do escopo): proprietario, administrador, gestor, analista, operador, financeiro, leitura.
-- Estados canônicos do card (§15): oportunidade, qualificacao, disputa, classificacao, homologacao, perdida, cancelada.
-- (DDL completo aplicado via Supabase migration "fundacao_multiempresa_final".)

-- 0003 — Onboarding: ao criar usuário (auth.users), cria tenant + proprietário + quadro padrão
create or replace function public.ao_criar_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare novo_tenant uuid; novo_board uuid;
begin
  insert into tenants (nome) values (coalesce(split_part(new.email,'@',1),'Minha empresa')) returning id into novo_tenant;
  insert into memberships (tenant_id, user_id, papel) values (novo_tenant, new.id, 'proprietario');
  insert into boards (tenant_id, nome, is_default) values (novo_tenant, 'Quadro principal', true) returning id into novo_board;
  insert into board_columns (board_id, nome, ordem, canonical_state) values
    (novo_board,'Oportunidade',0,'oportunidade'),(novo_board,'Qualificação',1,'qualificacao'),
    (novo_board,'Disputa',2,'disputa'),(novo_board,'Classificação',3,'classificacao'),
    (novo_board,'Homologação',4,'homologacao'),(novo_board,'Perdida',5,'perdida'),
    (novo_board,'Cancelada',6,'cancelada');
  return new;
end $$;
create trigger trg_ao_criar_usuario after insert on auth.users
  for each row execute function public.ao_criar_usuario();

-- Hardening pendente (avisos do linter, não bloqueiam): mover extensões unaccent/pg_trgm para schema
-- próprio; revogar execute de ao_criar_usuario para anon/authenticated; política explícita em coletas.
