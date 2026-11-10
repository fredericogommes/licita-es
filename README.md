# Licitações · Oportunidades (protótipo)

Primeiro módulo da reconstrução: **coleta de editais do PNCP com busca e filtros**,
que é o coração do produto de referência (o "O Mercado Nacional").

A fonte é a **API pública de dados abertos do PNCP** (Portal Nacional de
Contratações Públicas). Não há login nem token: são dados abertos do governo.

## Rodar (precisa só do Node 20+, sem instalar dependências)

```bash
# 1. Coletar editais de um período (ex.: Pregão Eletrônico + Dispensa, em MG)
node src/ingest.mjs --de 2026-11-07 --ate 2026-11-07 --modalidades 6,8 --uf MG

# 2. Subir a interface de busca
node src/serve         # ou: node src/server.mjs  → http://localhost:3000
```

Abra `http://localhost:3000` e busque por palavra-chave, UF, modalidade, valor etc.

> **Só na sessão de nuvem da Claude:** o acesso à internet passa por um proxy.
> Rode com `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node ...`.
> No seu PC isso **não** é necessário: o Node fala com o PNCP direto.

## Opções do ingest

| Opção | Exemplo | Descrição |
|---|---|---|
| `--de` / `--ate` | `--de 2026-11-01 --ate 2026-11-10` | Intervalo de **data de publicação**. |
| `--modalidades` | `--modalidades 6,8` | Códigos PNCP (ver tabela abaixo). Padrão: as mais comuns. |
| `--uf` | `--uf MG` | Sigla do estado. |
| `--municipio` | `--municipio 3106200` | Código IBGE do município. |
| `--merge` | | Acumula sobre a base já coletada, em vez de substituir. |

Modalidades: 1 Leilão-Eletrônico · 2 Diálogo Competitivo · 3 Concurso ·
4 Concorrência-Eletrônica · 5 Concorrência-Presencial · **6 Pregão-Eletrônico** ·
7 Pregão-Presencial · **8 Dispensa** · 9 Inexigibilidade · 10 Manifestação de Interesse ·
11 Pré-qualificação · 12 Credenciamento · 13 Leilão-Presencial.

## Estrutura

```
src/pncp.mjs         cliente da API do PNCP (paginação, datas)
src/modalidades.mjs  tabelas de domínio (modalidade, modo de disputa, poder, esfera)
src/normalize.mjs    converte o registro cru do PNCP no modelo "Edital" + link do edital
src/store.mjs        base em JSON + busca/filtros em memória + facetas
src/ingest.mjs       CLI de coleta
src/server.mjs       API HTTP (sem dependências) + serve a UI
public/index.html    interface de busca
data/editais.json    base coletada (gerada pelo ingest)
```

## API HTTP

- `POST /api/oportunidades` — corpo JSON com filtros: `q, uf, municipioIbge,
  modalidadeId, valorMin, valorMax, srp, situacaoId, publicadoDe, publicadoAte,
  propostaAbertaEm, ordenarPor, ordem, pagina, tamanhoPagina`. Espelha o
  `POST /buscas/oportunidades` da referência.
- `GET /api/facetas` — contadores por UF e por modalidade.
- `GET /api/modalidades` — tabela de modalidades.
- `POST /api/reload` — recarrega `data/editais.json` sem reiniciar.

## Próximos passos (ordem sugerida)

1. **Banco de dados** (SQLite → Postgres) no lugar do JSON, com coleta agendada diária.
2. **Kanban de acompanhamento** (Oportunidade → ... → Adjudicada/Perdida).
3. **Catálogo de produtos + alertas diários** cruzando editais novos com os filtros salvos.
4. **Análise do edital por IA** (baixar o PDF do edital e resumir itens/exigências).
5. **Gerador de documentos** (proposta, declarações) e **planilha de custos**.
6. Histórico de preços, financeiro e, por último, robô de lances.

A engenharia reversa completa da referência está em
`engenharia-reversa-omercadonacional.md` (no seu PC).

## Banco de dados (Supabase / Postgres)

O schema está em `db/schema.sql` e já foi aplicado no projeto Supabase `licitacoes`.
Tabelas: `orgaos`, `unidades`, `editais`, `edital_itens`, `coletas` (RLS ligado;
acesso apenas pelo lado servidor com a service_role key).

Para a coleta gravar no banco, defina duas variáveis de ambiente:

```bash
export SUPABASE_URL="https://<ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service_role key do projeto>"
node src/ingest.mjs --de 2026-11-07 --ate 2026-11-07
```

Sem essas variáveis, a coleta grava em `data/editais.json` (modo local).

## Coleta diária automática (GitHub Actions)

`.github/workflows/coleta-diaria.yml` roda todo dia às 05:10 (horário de Brasília)
e também pode ser disparado à mão (workflow_dispatch) com datas/modalidades/UF.
Ele precisa de dois **segredos** no repositório (Settings → Secrets and variables → Actions):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
