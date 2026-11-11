# Roadmap — alinhamento ao Escopo Mestre

Mapa entre o **Escopo Mestre** (plataforma SaaS de licitações) e o que já está construído,
com a ordem de implementação. O escopo completo é um MVP de ~20 semanas para uma equipe de
7–8 pessoas; aqui ele é entregue de forma incremental, módulo a módulo.

## Arquitetura escolhida

O escopo recomenda PostgreSQL + RLS/tenant_id, auth, object storage e busca. O **Supabase**
(que já estamos usando) entrega isso de forma nativa e acelera muito o MVP:

- **Banco:** PostgreSQL gerenciado + Row Level Security (isolamento por empresa/tenant).
- **Autenticação e RBAC:** Supabase Auth + tabela de papéis, com RLS como segunda barreira.
- **Arquivos (repositório de habilitação):** Supabase Storage com URLs assinadas.
- **Ingestão/coleta:** GitHub Actions (já no ar) + Edge Functions quando precisar.
- **Frontend:** app único (SPA) servido estático, falando direto com o Supabase.

Isso cobre os requisitos não-funcionais de isolamento, segurança e storage sem um backend
próprio no MVP. Se mais tarde precisar (workers pesados, IA), entra um serviço à parte, como o
próprio escopo prevê nos "gatilhos de escala".

## Situação por módulo (Fase 1 / MVP)

| Módulo (escopo) | RF | Situação |
|---|---|---|
| Ingestão PNCP (conector, cursor, idempotente) | RF-004/005 | **Pronto** (coleta diária, dedup por numeroControlePNCP) |
| Busca e filtros (texto, data, local, órgão, modalidade, valor, ME/EPP) | RF-007/008 | **Parcial** — busca por texto (sem acento), UF, modalidade, valor, SRP, proposta aberta; faltam órgão, data, favoritos e filtros salvos |
| Detalhes da oportunidade + itens + fonte | RF-009 | **Parcial** — lista + link oficial; falta tela de detalhe com itens |
| Identidade: conta, empresa, convites, RBAC | RF-001/002/003 | **Falta** |
| Deduplicação com sinalização de incerteza | RF-006 | **Parcial** — dedup por chave forte; falta chave probabilística |
| Triagem (favoritar, participar/descartar, motivo) | RF-010 | **Falta** |
| Kanban (colunas, cards, estados canônicos, histórico) | RF-011/012 | **Falta** |
| Alertas internos deduplicados | RF-013 | **Falta** |
| Calendário de prazos | RF-014 | **Falta** |
| Dashboard (funil, prazos, valores, atividade) | RF-015 | **Falta** |
| Documentos (proposta, declarações, PDF/DOCX) | RF-016/017 | **Falta** |
| Auditoria e exportação do tenant (LGPD) | RF-027/028 | **Falta** |

Fase 2: repositório de habilitação, catálogo/custos, relatórios, e-mail/WhatsApp, planos.
Fase 3: IA (extração de requisitos, recomendação, scoring explicável).

## Ordem de implementação (caminho crítico do escopo)

1. **Fundação multiempresa** — tabelas tenant/empresa/usuários/papéis (RBAC) + RLS; auditoria. *(em andamento)*
2. **Coleta canônica** — separar payload bruto do canônico, proveniência (fonte, id, coletado_em), flags de qualidade, dedup com incerteza.
3. **Busca completa** — adicionar filtros de órgão e data, favoritos e filtros salvos por usuário; tela de detalhe com itens.
4. **Kanban** — 1 quadro padrão, colunas mapeadas a estados canônicos, cards a partir da oportunidade, checklist, responsável, motivo de perda, histórico.
5. **Alertas + calendário** — central de alertas internos deduplicados e calendário de prazos.
6. **Dashboard** — funil por etapa, prazos 0/7/30, valores, aproveitamento, com zero-state.
7. **Documentos** — gerador de proposta e declarações versionadas em PDF/DOCX com revisão humana.
8. **Segurança/piloto** — testes de isolamento cross-tenant, hardening, acessibilidade.

## Restrições do escopo que o software respeita

- Nenhuma automação de lance, proposta ou ação no portal (só leitura e link oficial).
- A fonte oficial sempre prevalece; todo dado externo guarda origem e instante de coleta.
- Documentos trazem aviso de revisão humana; versão publicada não muda retroativamente.
- Sem WhatsApp/e-mail, billing e assinatura qualificada no MVP (entram na Fase 2).
