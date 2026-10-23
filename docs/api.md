# Contratos de API

Estas são as chamadas que as telas (design do Lovable) vão usar. Os nomes e formatos são o compromisso entre front e back: mudanças internas no banco não devem alterá-los. Itens marcados com ✓ já existem na migração `0001`; os demais entram nas fatias B1 a B7 da [arquitetura](arquitetura.md).

## Como chamar

Quase tudo é uma função do Supabase chamada com o cliente de `src/lib/supabase`:

```ts
const { data, error } = await supabase.rpc("iniciar_tentativa", { p_simulado: id });
```

- A sessão do usuário vai junto; o banco decide o que ele pode ver.
- Erros de regra chegam como `error.message` em português, prontos para mostrar ao usuário (ex.: "Este simulado já foi encerrado.").
- Datas em ISO 8601 com fuso. Identificadores são `uuid`.
- Leituras simples de catálogo (polos, áreas, propostas) usam `supabase.from("<tabela>").select()`.
- Só a redação passa pelo servidor Next.js (`/api/redacao/*`), porque precisa da chave do Gemini.

## Sessão e cadastro

| Chamada | Quem | Entrada | Saída |
| --- | --- | --- | --- |
| `supabase.auth.signInWithOAuth({ provider: "google" })` | todos | URL de retorno `/auth/retorno` | redireciona |
| `supabase.auth.signInWithOtp({ email })` | todos | e-mail | envia link mágico |
| `rpc("meu_perfil")` | logado | — | `Perfil \| null` (null = precisa de onboarding) |
| `rpc("completar_cadastro", {...})` | logado sem perfil | `CadastroEntrada` | `Perfil` |
| `from("polos").select()` ✓ | todos | — | `Polo[]` |

```ts
type Vinculo = "rede" | "outro_cursinho" | "independente";
type Papel = "estudante" | "professor" | "coord_polo" | "admin";

type Polo = { id: string; nome: string; bairro: string; ativo: boolean; ordem: number };

type Perfil = {
  id: string;
  nome: string;
  vinculo: Vinculo;
  polo: Polo | null;
  cursinho_externo: string | null;
  papel: Papel;
  polos_equipe: Polo[];        // polos em que atua, para professor e coordenação
  menor_de_idade: boolean;
  termo_aceito_versao: string | null;
};

type CadastroEntrada = {
  p_nome: string;
  p_data_nascimento: string;   // "2008-05-14"
  p_vinculo: Vinculo;
  p_polo_id?: string;          // obrigatório se vinculo = "rede"
  p_cursinho_externo?: string; // obrigatório se vinculo = "outro_cursinho"
  p_versao_termo: string;
  p_contato_responsavel?: string; // obrigatório se menor de 18
};
```

## Simulados (estudante)

| Chamada | Entrada | Saída |
| --- | --- | --- |
| `rpc("simulados_disponiveis")` | — | `SimuladoCard[]` |
| `rpc("iniciar_tentativa", { p_simulado })` ✓ | id do simulado | `uuid` da tentativa (nova ou retomada) |
| `rpc("estado_tentativa", { p_tentativa })` | id | `EstadoTentativa` |
| `rpc("questoes_da_tentativa", { p_tentativa })` ✓ | id | `QuestaoProva[]` (sem gabarito) |
| `rpc("minhas_respostas", { p_tentativa })` | id | `RespostaSalva[]` |
| `rpc("salvar_respostas", { p_tentativa, p_lote })` | lote | `{ ultimo_seq: number; prazo_em: string }` |
| `rpc("entregar_tentativa", { p_tentativa })` ✓ | id | `EstadoTentativa` |
| `rpc("resultado_da_tentativa", { p_tentativa })` | id | `Resultado` |
| `rpc("meu_historico")` | — | `TentativaResumo[]` |

```ts
type Modalidade = "completo_dia1" | "completo_dia2" | "rapido" | "area" | "recuperacao" | "redacao";
type Alternativa = "A" | "B" | "C" | "D" | "E";
type Area = "LC" | "CH" | "CN" | "MT";

type SimuladoCard = {
  id: string;
  titulo: string;
  modalidade: Modalidade;
  tipo: "oficial" | "livre";
  duracao_min: number;
  total_questoes: number;
  abre_em: string | null;
  fecha_em: string | null;
  minha_tentativa: { id: string; status: "em_andamento" | "entregue" | "expirada" } | null;
};

type EstadoTentativa = {
  id: string;
  simulado_id: string;
  status: "em_andamento" | "entregue" | "expirada";
  iniciada_em: string;
  prazo_em: string;            // o cronômetro conta até aqui, pelo relógio do servidor
  agora_servidor: string;      // para corrigir o relógio do celular
  entregue_em: string | null;
};

type QuestaoProva = {
  ordem: number;
  questao_versao_id: string;
  area: Area;
  enunciado: string;           // Markdown simples
  imagem_path: string | null;  // caminho no Storage (bucket "questoes")
  alternativas: Record<Alternativa, string>;
};

type RespostaSalva = {
  questao_versao_id: string;
  alternativa: Alternativa | null;
  marcada_revisao: boolean;
  seq_cliente: number;
};

// Lote do salvamento automático. O cliente numera cada mudança (seq crescente
// por tentativa) e pode reenviar o mesmo lote quantas vezes quiser.
type LoteRespostas = Array<{
  questao_versao_id: string;
  alternativa: Alternativa | null;
  marcada_revisao: boolean;
  tempo_ms: number;            // tempo acumulado na questão
  seq_cliente: number;
  marcada_em_cliente: string;
}>;

type Placar = { total: number; acertos: number; erros: number; em_branco: number; percentual: number };

type Resultado = {
  tentativa: EstadoTentativa;
  liberado: boolean;           // false = só o placar geral; gabarito e por questão depois
  libera_em: string | null;
  geral: Placar;               // percentual de acertos, não é nota TRI
  por_area: Partial<Record<Area, Placar>>;
  por_disciplina: Array<{ disciplina: string; area: Area } & Placar>;
  por_habilidade: Array<{ codigo: string; descricao: string } & Placar>;
  questoes?: Array<{           // presente só quando liberado
    ordem: number;
    questao_versao_id: string;
    marcada: Alternativa | null;
    gabarito: Alternativa;
    anulada: boolean;
    resolucao: string | null;
    tema: string | null;
  }>;
  estudar_a_seguir: Array<{ tema: string; disciplina: string; erros: number }>; // até 3
};

type TentativaResumo = {
  id: string;
  simulado: { id: string; titulo: string; modalidade: Modalidade };
  entregue_em: string;
  geral: Placar;
};
```

## Redação (Etapa 2)

| Chamada | Entrada | Saída |
| --- | --- | --- |
| `from("propostas_redacao").select()` ✓ | — | propostas ativas |
| `rpc("salvar_rascunho_redacao", { p_proposta, p_texto, p_redacao? })` | texto | `{ id: string; palavras: number }` |
| `rpc("enviar_redacao", { p_redacao })` | id | `{ job_id: string; correcoes_restantes_semana: number }` |
| `POST /api/redacao/corrigir` | `{ job_id }` | `202 Accepted` (o processamento continua no servidor) |
| `rpc("minha_redacao", { p_redacao })` | id | `RedacaoDetalhe` |

O front consulta `minha_redacao` a cada 5 segundos enquanto `status` for `enviada` (a correção leva de 10 a 40 segundos). Erros esperados: "Você já usou as 3 correções desta semana." e "O limite mensal de correções foi atingido; sua redação entra na fila de revisão dos professores."

```ts
type Competencia = "C1" | "C2" | "C3" | "C4" | "C5";

type RedacaoDetalhe = {
  id: string;
  proposta: { id: string; titulo: string };
  texto: string;
  palavras: number;
  status: "rascunho" | "enviada" | "corrigida" | "em_revisao";
  correcoes: Array<{
    tipo: "ia" | "humana";
    criada_em: string;
    nota_total: number;        // estimativa pedagógica, não nota oficial
    competencias: Record<Competencia, {
      nota: 0 | 40 | 80 | 120 | 160 | 200;
      justificativa: string;
      trechos: string[];       // trechos do texto que motivaram a nota
      orientacoes: string;
    }>;
    plano_melhoria: string;
  }>;
};
```

## Equipe: questões e simulados

| Chamada | Quem | Saída |
| --- | --- | --- |
| `rpc("buscar_questoes", { filtros })` | professor, admin | lista paginada com versão atual |
| `rpc("salvar_questao", { questao, versao })` | professor, admin | cria a questão ou uma nova versão |
| `POST /api/questoes/importar` (CSV) | professor, admin | `{ importadas, rejeitadas: [{ linha, motivo }] }` |
| `rpc("salvar_simulado", { simulado, questoes_versao_ids, polos })` | professor, admin | `uuid` |
| `rpc("publicar_simulado", { p_simulado })` | professor, admin | — |
| `rpc("liberar_resultado", { p_simulado })` | coord_polo, admin | — |

Formato do CSV de importação: `area;disciplina;tema;habilidade;dificuldade;ano;origem;fonte;enunciado;A;B;C;D;E;gabarito;resolucao`. Imagens vão antes para o Storage e entram pelo caminho na coluna extra `imagem_path`.

## Painel da coordenação

| Chamada | Quem | Saída |
| --- | --- | --- |
| `rpc("meus_polos")` | equipe | `Polo[]` que a pessoa pode ver |
| `rpc("painel_polo", { p_polo, p_desde, p_ate })` | coord_polo do polo, admin (professor: sem `estudantes_sem_atividade`) | `PainelPolo` |
| `rpc("painel_rede", { p_desde, p_ate })` | admin | `PainelPolo[]` lado a lado |
| `rpc("estudantes_do_polo", { p_polo, p_busca, p_pagina })` | coord_polo, admin | `EstudanteLinha[]` |
| `rpc("painel_estudante", { p_estudante })` | o próprio, coord do polo, admin | evolução por área e histórico |
| `rpc("definir_papel", { p_perfil, p_papel, p_polos })` | admin | — |
| `rpc("uso_ia_do_mes")` | admin | `{ gasto_usd, teto_usd, correcoes }` |

```ts
type PainelPolo = {
  polo: Polo;
  periodo: { desde: string; ate: string };
  estudantes_cadastrados: number;
  estudantes_ativos: number;   // fizeram ao menos 1 simulado no período
  participacao: Array<{ simulado_id: string; titulo: string; entregues: number; convidados: number }>;
  media_por_area: Partial<Record<Area, number>>;     // percentual médio de acertos
  temas_com_mais_erros: Array<{ tema: string; disciplina: string; percentual_erro: number }>; // top 10
  estudantes_sem_atividade: Array<{ id: string; nome: string; ultima_atividade: string | null }>; // > 14 dias
};

type EstudanteLinha = {
  id: string;
  nome: string;
  simulados_entregues: number;
  ultimo_percentual: number | null;
  ultima_atividade: string | null;
};
```

Exportação de relatório (PDF e planilha) fica na Etapa 3 e usa os mesmos dados de `painel_polo`.

## LGPD

| Chamada | Quem | Saída |
| --- | --- | --- |
| `rpc("exportar_meus_dados")` | logado | JSON com perfil, tentativas, respostas, redações e consentimentos |
| `rpc("solicitar_exclusao")` | logado | `{ protocolo, prazo }` |

## Regras para quem faz as telas

- Nunca mostrar o percentual como "nota ENEM"; usar "acertos".
- Nota de redação da IA sempre com o aviso de estimativa.
- Não montar ranking entre estudantes.
- Cronômetro a partir de `prazo_em` e `agora_servidor`, nunca só do relógio do aparelho.
- Toda marcação entra primeiro na fila local; a tela mostra "salvo" só depois do `ultimo_seq` voltar do servidor.
