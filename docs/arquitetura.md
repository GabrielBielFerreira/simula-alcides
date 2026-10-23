# Arquitetura do back-end

Este documento é o caminho que o back-end segue enquanto o design é feito no Lovable. Ele complementa o [planejamento](planejamento.md), o [modelo de dados](modelo-de-dados.md) e os [contratos de API](api.md).

## Princípios

1. **A regra mora no banco.** Correção, prazos, permissões por polo e limites de IA ficam em funções SQL e em Row Level Security (RLS). Assim, qualquer tela (Next.js, protótipo do Lovable, app futuro) recebe as mesmas garantias, e um bug de interface não vaza gabarito nem dado de outro polo.
2. **O front só fala com contratos.** As telas consomem funções (`rpc`) e visões com nomes estáveis, listadas em [api.md](api.md). Tabelas podem mudar por dentro sem quebrar o design.
3. **Segredo só no servidor.** A chave do Gemini e a chave de serviço do Supabase existem apenas em variáveis de ambiente da Vercel. O navegador usa só a chave pública (`anon`).
4. **Custo previsível.** Tudo roda nos planos gratuitos de Supabase e Vercel no MVP. A única despesa variável é a IA de redação, com teto mensal e limite por estudante gravados no banco.
5. **Fatias pequenas e testadas.** Cada fatia traz migração, teste SQL de permissão e teste de regra antes da tela.

## Visão geral

```
 Celular do estudante / computador da coordenação
        │  (HTTPS)
        ▼
 ┌──────────────────────────── Vercel ─────────────────────────────┐
 │ Next.js 16 (App Router)                                         │
 │  • Páginas e componentes (design vindo do Lovable)              │
 │  • proxy.ts: renova a sessão do Supabase a cada requisição      │
 │  • Server Actions: chamadas que precisam do servidor            │
 │  • Route Handlers /api/redacao/*: única ponte com o Gemini      │
 │  • Vercel Cron: reprocessa correções pendentes, fecha provas    │
 └───────┬──────────────────────────────────────────┬──────────────┘
         │ chave anon + sessão do usuário (RLS)     │ GEMINI_API_KEY
         ▼                                          ▼
 ┌──────────────── Supabase ──────────────┐   ┌──── Google Gemini API ────┐
 │ Auth (Google + e-mail)                 │   │ correção por competência   │
 │ PostgreSQL + RLS                       │   │ saída em JSON com schema   │
 │  • tabelas (modelo-de-dados.md)        │   └────────────────────────────┘
 │  • funções da prova e do painel        │
 │  • fila e livro-caixa da IA            │
 │ Storage (imagens das questões)         │
 └────────────────────────────────────────┘
```

### Camadas

| Camada | Onde | Responsabilidade |
| --- | --- | --- |
| Apresentação | `src/app`, componentes | Telas, estado da prova no aparelho, acessibilidade. Nenhuma regra de nota ou permissão. |
| Aplicação | Server Actions e Route Handlers | Orquestrar o que precisa de segredo ou de tempo longo: chamar o Gemini, importar CSV de questões, gerar relatórios. |
| Domínio | Funções SQL (`security definer`) | Iniciar, salvar, entregar e encerrar provas; liberar resultado; montar painel por polo; reservar e registrar uso de IA. |
| Dados | Tabelas + RLS | Quem lê e escreve o quê. Última linha de defesa. |

### Por que não uma API própria separada

Uma API em Node à parte dobraria o que precisa ser mantido e publicado, e repetiria as regras que o banco já garante. O Supabase já expõe as funções SQL como endpoints REST (`/rest/v1/rpc/<nome>`) com a sessão do usuário. O servidor Next.js entra só onde é indispensável: Gemini, importação e tarefas agendadas.

## Fluxos principais

### Cadastro e login

1. O estudante entra com Google (ou e-mail com link mágico) pelo Supabase Auth.
2. Na primeira entrada não há linha em `perfis`; o `proxy.ts` redireciona para `/onboarding`.
3. O onboarding chama `completar_cadastro` com nome, data de nascimento, vínculo (Rede → polo, outro cursinho, independente) e o aceite do termo. Menores de 18 anos aceitam o termo próprio e informam o contato do responsável (ver LGPD abaixo).
4. A função cria o perfil sempre como `estudante`. Papéis de equipe só são dados por um admin (`definir_papel`).

### Prova com salvamento automático

```
 abrir simulado ──► iniciar_tentativa ──► questoes_da_tentativa (sem gabarito)
                                              │
     cada marcação ─► fila local (IndexedDB) ─┤ a cada 10 s ou ao trocar de questão
                                              ▼
                                   salvar_respostas (lote, idempotente)
                                              │
     botão Entregar ou fim do prazo ──► entregar_tentativa ──► resultado_da_tentativa
```

- O aparelho guarda cada marcação primeiro no IndexedDB, com um carimbo de hora do cliente e um número de sequência. Se a internet cair, o estudante continua a prova normalmente.
- `salvar_respostas` recebe o lote pendente e aplica "a última marcação vence", comparando o número de sequência. Mandar o mesmo lote duas vezes não muda nada, então o cliente pode reenviar sem medo.
- O cronômetro mostrado vem de `prazo_em`, do servidor, nunca do relógio do celular.
- Quando o prazo acaba, o servidor aceita lotes por mais 2 minutos (tolerância de sincronização) e depois a tarefa agendada `encerrar_tentativas_vencidas` entrega a prova com o que foi salvo, com status `expirada`.
- Retomada: abrir o mesmo simulado em outro aparelho chama `iniciar_tentativa`, que devolve a tentativa aberta, e `minhas_respostas` repõe as marcações.

### Resultado

- `resultado_da_tentativa` devolve placar geral e por área, disciplina e habilidade. Gabarito e resolução só aparecem quando o resultado está liberado (`imediata`, após o fechamento do simulado, ou liberação manual da coordenação).
- O percentual de acertos nunca é chamado de nota ENEM, porque não é TRI.

### Painel da coordenação por polo

- `painel_polo` devolve, para um polo e um período: estudantes ativos, participação por simulado, média de acertos por área, os assuntos com mais erros e a lista de estudantes que não fazem simulado há mais de 14 dias.
- A função confere a permissão: admin vê todos os polos; coordenador vê só os polos aos quais foi vinculado em `equipe_polos`; professor vê agregados, sem dados pessoais.
- Os agregados vêm de consultas sobre as tentativas entregues. Se ficar lento com o volume real, viram visões materializadas atualizadas pela tarefa agendada, sem mudar o contrato.

### Correção de redação com Gemini (Etapa 2)

```
 estudante envia ──► enviar_redacao (trava o texto, confere limites, cria job)
                           │
                           ▼
            POST /api/redacao/corrigir (Route Handler, servidor)
                           │  1. reservar_correcao_ia (teto mensal, limite semanal)
                           │  2. chama o Gemini com rubrica + proposta + texto
                           │  3. valida o JSON (5 competências, notas 0–200 de 40 em 40)
                           │  4. registrar_correcao_ia (notas, modelo, versão do prompt, tokens, custo)
                           ▼
            estudante vê a estimativa; professor pode revisar (correção humana)
```

- **Fila no banco.** A tabela `jobs_correcao` guarda o estado (`pendente`, `processando`, `concluida`, `erro`) e o número de tentativas. O envio dispara o processamento logo em seguida (com `after()` do Next.js), e o Vercel Cron reprocessa a cada 10 minutos o que ficou pendente ou falhou, até 3 vezes.
- **Saída estruturada.** A chamada usa o modo JSON com schema do Gemini. Notas fora da escala ENEM (0, 40, 80, 120, 160, 200 por competência) são rejeitadas e o job volta para a fila.
- **Rastreabilidade.** Cada correção grava o modelo exato, a versão do prompt e a versão da rubrica. Trocar o modelo ou o prompt cria uma versão nova, e as correções antigas continuam explicáveis.
- **Aviso fixo.** A tela de resultado mostra que a nota é uma estimativa pedagógica, não a nota oficial.
- **Validação antes de abrir para todos.** Critério da Etapa 2: em 30 redações corrigidas por professores, a diferença da IA no total fica em até 100 pontos.
- **Privacidade.** O texto vai ao Gemini sem nome, e-mail ou polo do estudante. É obrigatório usar a API paga (faturamento ativo no Google Cloud): no nível gratuito o Google pode usar o conteúdo para melhorar os produtos, o que não serve para textos de menores de idade. Conferir os termos vigentes antes de ativar.

## Autenticação e autorização

### Autenticação

- Supabase Auth com dois provedores: **Google** (OAuth) e **e-mail com link mágico** (para quem não tem conta Google). Sem senha para guardar.
- A sessão fica em cookies (`@supabase/ssr`); o `src/proxy.ts` renova o token em toda navegação.
- Configuração do Google: criar um cliente OAuth no Google Cloud, colar o Client ID e o segredo em Supabase → Authentication → Providers → Google, e cadastrar as URLs de retorno (produção e prévias da Vercel).

### Papéis

| Papel | O que pode |
| --- | --- |
| `estudante` | Fazer simulados, ver só os próprios resultados e redações. |
| `professor` | Criar e revisar questões, montar simulados, revisar redações. Vê agregados dos polos em que atua, sem dados pessoais. |
| `coord_polo` | Ver estudantes e resultados dos polos vinculados, liberar resultados de simulados do polo, exportar relatórios do polo. |
| `admin` | Tudo, inclusive dar papéis, vincular equipe a polos e ajustar limites de IA. |

- O papel fica em `perfis.papel`; o vínculo de equipe a um ou mais polos fica em `equipe_polos`. Isso permite um coordenador cuidar de dois Compaz sem duplicar contas.
- Toda verificação é feita no banco (`meu_papel()`, `posso_ver_estudante()`, `meus_polos()`). As telas escondem botões por conveniência, mas não são a barreira.
- Mudança de papel, vínculo a polo, liberação de resultado e exportação de dados vão para `auditoria`, gravadas por gatilho no banco.

## LGPD e menores de idade

- **Sem CPF.** Identificação pelo e-mail do login. Data de nascimento só para saber se é menor e para estatística por faixa etária.
- **Consentimento versionado.** A tabela `consentimentos` guarda qual versão do termo foi aceita e quando. Para menores de 18 anos, o termo explica o uso dos dados aos responsáveis e pede um contato do responsável; menores de 12 anos não se cadastram sozinhos (proposta; confirmar com a coordenação e a Abayomi).
- **Mínimo necessário para a equipe.** Coordenadores veem nome e desempenho dos estudantes do seu polo; não veem e-mail nem data de nascimento. Professores veem só agregados.
- **Direitos do titular.** `exportar_meus_dados` devolve tudo o que o estudante tem; `solicitar_exclusao` marca a conta e um admin conclui em até 15 dias, anonimizando tentativas (mantém estatística, remove identidade).
- **Retenção.** Contas sem acesso há 24 meses são anonimizadas pela tarefa agendada (a confirmar com a coordenação).
- **Dados de demonstração** sempre com `is_demo = true` e fora dos painéis e relatórios.

## Tarefas agendadas

| Tarefa | Frequência | Onde |
| --- | --- | --- |
| `encerrar_tentativas_vencidas` | a cada 5 min | `pg_cron` no Supabase |
| Reprocessar `jobs_correcao` pendentes | a cada 10 min | Vercel Cron → `/api/redacao/processar` |
| Anonimizar contas inativas | semanal | `pg_cron` |

O Vercel Cron autentica com o cabeçalho `CRON_SECRET`; a rota recusa qualquer outra chamada.

## Variáveis de ambiente

| Nome | Onde | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | navegador e servidor | endereço do projeto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navegador e servidor | chave pública, limitada pelo RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | só servidor | gravar correções de IA e rodar tarefas agendadas |
| `GEMINI_API_KEY` | só servidor | correção de redação |
| `GEMINI_MODEL` | só servidor | modelo fixado (ex.: uma versão Flash), para não mudar sem aviso |
| `CRON_SECRET` | só servidor | proteger as rotas chamadas pelo Vercel Cron |

## Custos estimados

| Item | Plano | Custo no MVP |
| --- | --- | --- |
| Vercel | Hobby (gratuito). Se o projeto for de uma organização com fins de captação, avaliar o plano Pro. | R$ 0 |
| Supabase | Free: 500 MB de banco, 50 mil usuários ativos/mês, 1 GB de arquivos. O projeto pausa após 7 dias sem uso; antes do lançamento, avaliar o Pro (US$ 25/mês). | R$ 0 |
| Gemini | Pago por uso. | ver abaixo |

**Conta da IA de redação.** Uma correção usa por volta de 5 mil tokens de entrada (rubrica, proposta e texto) e 2 mil de saída (justificativas e plano de melhoria). Custo por correção = 5.000 × preço de entrada + 2.000 × preço de saída, pelo preço por milhão de tokens do modelo escolhido em [ai.google.dev/pricing](https://ai.google.dev/pricing). Com um modelo da linha Flash isso costuma ficar abaixo de 1 centavo de dólar por correção, então 300 estudantes × 3 redações por semana cabem com folga no teto inicial de US$ 100/mês (`configuracoes.ia_teto_mensal_usd`). O valor real é medido: cada correção grava tokens e custo, e o painel admin mostra o gasto do mês.

## Etapas do back-end

| Fatia | Entrega | Pronto quando |
| --- | --- | --- |
| B0. Desenho | Estes documentos | Gabriel aprova o caminho |
| B1. Ajustes do esquema | Migração `0002` com as mudanças de [modelo-de-dados.md](modelo-de-dados.md) e testes SQL | `npm run test:db` cobre autosave, expiração, liberação de resultado e permissão por `equipe_polos` |
| B2. Login e onboarding | `proxy.ts`, login Google e e-mail, `completar_cadastro`, consentimento | Conta nova entra com Google e cai no onboarding; menor de idade vê o termo próprio |
| B3. Banco de questões | Cadastro, versões, importação CSV, imagens no Storage | 180 questões importadas e classificadas, com gabarito invisível para estudante |
| B4. Prova | `salvar_respostas`, fila local, retomada, encerramento automático | Teste de ponta a ponta: derrubar a rede no meio da prova não perde respostas |
| B5. Resultado | `resultado_da_tentativa` com liberação | Estudante vê acertos por área e só vê gabarito quando liberado |
| B6. Painel por polo | `painel_polo`, gestão de equipe e polos | Coordenador vê só o seu polo; admin vê todos |
| B7. Redação com Gemini | Fila, Route Handler, rubrica versionada, revisão humana | Critério dos 30 textos e teto de custo ativos |

Cada fatia é um pull request próprio. A interface de cada fatia usa o design do Lovable quando ele estiver pronto; até lá, telas simples só para testar o fluxo.

## Como o design do Lovable entra

O Lovable gera React + Tailwind + componentes shadcn/ui, a mesma base deste repositório. O caminho recomendado é trazer os componentes e telas do Lovable para dentro do Next.js e ligá-los aos contratos de [api.md](api.md). Como os contratos são funções do Supabase, eles funcionam igual se, mais tarde, alguma tela continuar sendo feita no Lovable.
