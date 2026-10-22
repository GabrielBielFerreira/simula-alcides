# Simula Alcides

**Seu futuro começa com a próxima questão.**

Plataforma gratuita de simulados do ENEM da Rede de Cursinhos Populares Alcides Nascimento, com acompanhamento individual da aprendizagem, correção de redação assistida por IA (Etapa 2) e painel pedagógico por polo. Aberta também a estudantes de outros cursinhos e independentes.

- Planejamento completo: [documento de planejamento](https://claude.ai/artifact/LyJSHqk8QgB6PG1rcxsSCq) (resumo em [`docs/planejamento.md`](docs/planejamento.md))
- Identidade visual: [`docs/identidade-visual.md`](docs/identidade-visual.md)

## Situação

Etapa 0 (planejamento e estrutura inicial). O que já existe:

- Página inicial com a identidade da Rede (`src/app/page.tsx`)
- Esquema completo do banco com permissões por perfil e polo (`supabase/migrations/0001_schema_inicial.sql`)
- Correção da prova no banco (`entregar_tentativa`), sem expor o gabarito ao navegador
- Testes das regras de negócio: correção (Vitest) e permissões do banco (SQL)

Próximo passo: Etapa 1 (MVP), em fatias: login e onboarding → banco de questões → tela de prova → resultado → painel admin.

## Tecnologias

| Camada | Escolha |
| --- | --- |
| Interface | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Banco, login, arquivos | Supabase (PostgreSQL com Row Level Security, Auth, Storage) |
| Hospedagem | Vercel, publicando a cada push no GitHub |
| IA de redação (Etapa 2) | API do Claude, chamada apenas pelo servidor |
| Testes | Vitest (regras em TypeScript) e scripts SQL (regras do banco) |

## Rodar no computador

Pré-requisitos: Node.js 20 ou mais novo.

```bash
npm install
cp .env.example .env.local   # preencha com os dados do Supabase
npm run dev                  # http://localhost:3000
```

A página inicial funciona sem o Supabase configurado.

## Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (plano gratuito).
2. No **SQL Editor**, rode, nesta ordem:
   1. `supabase/migrations/0001_schema_inicial.sql`
   2. `supabase/seed.sql` (polos, áreas, disciplinas, configurações)
   3. `supabase/seed_demo.sql` **somente em ambiente de teste** (simulado de demonstração marcado com `is_demo`)
3. Em **Project Settings → API**, copie a URL e a chave `anon` para o `.env.local`.

Para promover alguém a administrador, rode no SQL Editor:
`update perfis set papel = 'admin' where id = '<id do usuário>';`

## Testes

```bash
npm test                     # regras de correção (Vitest)
npm run lint
DATABASE_URL=postgres://postgres@localhost:5432/postgres npm run test:db
```

O `test:db` usa um PostgreSQL local qualquer (não o Supabase): cria o banco `simula_teste`, aplica uma imitação mínima do `auth` do Supabase, a migração, os seeds e roda `supabase/tests/regras_de_negocio.sql`. Ele verifica, entre outras coisas, que:

- acertos, erros e questões em branco são contados separadamente;
- o estudante não lê o gabarito e não altera respostas depois da entrega;
- um estudante não vê a tentativa de outro;
- a coordenação de um polo não vê estudantes de outro polo;
- ninguém se cadastra como administrador.

## Estrutura de pastas

```
src/
  app/                 páginas (App Router)
  config/site.ts       nome do produto, subtítulo, polos exibidos na página inicial
  lib/correcao.ts      regra de correção das questões objetivas (+ testes)
  lib/supabase/        clientes do Supabase para navegador e servidor
public/brand/          logos da Rede (vertical, horizontal, fundo escuro, símbolo)
supabase/
  migrations/          esquema do banco, versionado
  seed.sql             dados de referência
  seed_demo.sql        dados de demonstração (nunca em produção)
  tests/               testes das regras do banco
docs/                  planejamento e identidade visual
scripts/test-db.sh     roda os testes do banco
```

Previstas para a Etapa 1: `src/app/(publico)` (entrar, cadastro, privacidade), `src/app/app` (área do estudante), `src/app/admin` (equipe) e `src/proxy.ts` (renovação da sessão; no Next.js 16 o antigo `middleware` se chama `proxy`).

## Regras que o código deve respeitar

- Percentual de acertos **não** é nota TRI; a nota de redação da IA é **estimativa pedagógica**.
- Chaves secretas nunca com prefixo `NEXT_PUBLIC_` nem no navegador.
- Comparar evolução só entre simulados da mesma modalidade.
- Nada de ranking público obrigatório.
- Dados de demonstração sempre com `is_demo = true`.

## Publicar na Vercel

1. Importe o repositório em [vercel.com/new](https://vercel.com/new).
2. Cadastre as variáveis do `.env.example` em **Settings → Environment Variables**.
3. Cada push na branch `main` publica o site; cada pull request ganha um link de teste.
