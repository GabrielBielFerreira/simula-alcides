# Modelo de dados

O esquema atual está em [`supabase/migrations/0001_schema_inicial.sql`](../supabase/migrations/0001_schema_inicial.sql). Este documento descreve as entidades e lista o que a migração `0002` precisa acrescentar para cumprir a [arquitetura](arquitetura.md). Nada aqui foi aplicado ainda.

## Mapa das entidades

```
 polos ─┬─< perfis >── papel (estudante | professor | coord_polo | admin)
        │      │
        └─< equipe_polos >─┘        (0002: equipe ligada a 1+ polos)
               │
               ├─< consentimentos    (0002)
               ├─< tentativas ─< respostas
               │        │
               │   simulados ─< simulado_questoes >─ questao_versoes >─ questoes
               │        └─< simulado_polos                                │
               │                                areas ─< disciplinas ─< temas
               │                                habilidades ───────────────┘
               └─< redacoes ─< correcoes_redacao
                      │  └─< jobs_correcao (0002)
                propostas_redacao      rubricas (0002)     uso_ia (0002)
 auditoria   configuracoes
```

## Entidades

### Pessoas e polos

| Tabela | Para quê | Pontos importantes |
| --- | --- | --- |
| `polos` | Os 6 Compaz (e outros no futuro) | `ativo`, `ordem` para exibição |
| `perfis` | Uma linha por usuário do Auth | `vinculo` (rede, outro_cursinho, independente), `polo_id` do estudante, `papel` |
| `equipe_polos` (0002) | Polos em que um professor ou coordenador atua | chave (`perfil_id`, `polo_id`); substitui o uso de `perfis.polo_id` para equipe |
| `consentimentos` (0002) | Aceite do termo de uso e privacidade | `versao_termo`, `aceito_em`, `menor_de_idade`, `contato_responsavel` |

### Conteúdo

| Tabela | Para quê | Pontos importantes |
| --- | --- | --- |
| `areas`, `disciplinas`, `temas`, `habilidades` | Classificação ENEM | habilidade no formato `MT-H25` |
| `questoes` | Identidade da questão e metadados | `origem` (oficial, autoral, autorizada, ia), `status`, `fonte`; questão de IA só publica com aprovação |
| `questao_versoes` | Conteúdo congelado: enunciado, alternativas, gabarito, resolução | imutável por gatilho; corrigir gabarito = nova versão |

Toda prova aponta para uma **versão**. Corrigir um gabarito depois de aplicado não altera resultados antigos; se a coordenação quiser recalcular, isso será uma ação explícita e auditada.

### Provas

| Tabela | Para quê | Pontos importantes |
| --- | --- | --- |
| `simulados` | A prova | `modalidade`, `tipo` (oficial com janela, livre), `duracao_min`, regra de `liberacao` |
| `simulado_questoes` | Ordem das questões | 0002: `anulada boolean` para questões anuladas (contam como acerto para todos) |
| `simulado_polos` | Restringe um simulado oficial a polos | sem linhas = aberto a todos |
| `tentativas` | Uma realização da prova | `prazo_em` calculado no servidor; uma aberta por estudante e simulado |
| `respostas` | Marcação por questão | 0002: `seq_cliente bigint` e `marcada_em_cliente timestamptz` para o autosave |

### Redação

| Tabela | Para quê | Pontos importantes |
| --- | --- | --- |
| `propostas_redacao` | Tema e textos motivadores | |
| `redacoes` | Texto do estudante | trava ao enviar; 0002: `hash_texto` para não corrigir duas vezes o mesmo texto |
| `rubricas` (0002) | Rubrica das 5 competências, versionada | `versao`, `conteudo jsonb`, `ativa` |
| `correcoes_redacao` | Correção por IA ou humana | já tem `modelo`, `versao_rubrica`, tokens e custo; 0002: `versao_prompt` |
| `jobs_correcao` (0002) | Fila da IA | `status`, `tentativas`, `ultimo_erro`, `proxima_execucao` |
| `uso_ia` (0002) | Livro-caixa do gasto | uma linha por chamada: `estudante_id`, `custo_usd`, `mes`; o teto mensal soma esta tabela |

### Gestão

| Tabela | Para quê |
| --- | --- |
| `auditoria` | Quem fez o quê em ações sensíveis; 0002: coluna `detalhes jsonb` e gravação por gatilho |
| `configuracoes` | Nome, subtítulo, limites de IA, versão vigente do termo |

## O que a migração 0002 deve fazer

Cada item tem teste correspondente em `supabase/tests/`.

**Permissões da equipe**
1. Criar `equipe_polos` e a função `meus_polos()`; reescrever `posso_ver_estudante` para usar a lista de polos.
2. Professor deixa de ler `redacoes` de qualquer estudante: lê as redações que foram atribuídas a ele para revisão (coluna `revisor_designado` em `redacoes`) e os agregados.
3. Trocar a gravação direta em `respostas` por `salvar_respostas` (abaixo) e retirar as políticas de insert/update do estudante, para a validação ficar num lugar só.

**Prova**
4. `salvar_respostas(tentativa, lote)`: valida que cada questão pertence ao simulado, aplica "maior `seq_cliente` vence" e devolve o último `seq` aceito.
5. `minhas_respostas(tentativa)`: repõe as marcações na retomada.
6. `encerrar_tentativas_vencidas()`: entrega com status `expirada` o que passou de `prazo_em + 2 min`; agendada no `pg_cron`.
7. `iniciar_tentativa` passa a encerrar antes uma tentativa aberta vencida, para não devolver prova com prazo esgotado.
8. Guardar o placar por área em `tentativas.placar_por_area jsonb` na entrega, para o painel não recalcular tudo.
9. `simulado_questoes.anulada`.

**Resultado e painel**
10. `resultado_da_tentativa(tentativa)` com a regra de liberação.
11. `liberar_resultado(simulado)` para a coordenação (auditada).
12. `painel_polo(polo, desde, ate)` e `painel_estudante(estudante)`.

**Cadastro e LGPD**
13. `completar_cadastro(...)`, `consentimentos`, `exportar_meus_dados()`, `solicitar_exclusao()`.
14. `definir_papel(perfil, papel, polos[])` só para admin, auditada.

**Redação**
15. `rubricas`, `jobs_correcao`, `uso_ia`, `redacoes.hash_texto`, `correcoes_redacao.versao_prompt`.
16. `enviar_redacao(redacao)` (confere limite semanal e cria o job) e `reservar_correcao_ia(job)` (confere o teto mensal com trava, para dois servidores não estourarem o teto juntos).

## Convenções

- Nomes em português, `snake_case`, sem acento.
- Chave primária `uuid` para tudo que é criado por usuário; `serial` para taxonomia.
- `created_at` em toda tabela; datas sempre `timestamptz`.
- Funções que escrevem são `security definer`, com `set search_path = public`, e verificam `auth.uid()` na primeira linha.
- Nenhuma tabela nova sem `enable row level security` e sem teste de quem não pode ler.
- Tipos TypeScript gerados com `supabase gen types typescript` para `src/lib/supabase/tipos.ts`.
