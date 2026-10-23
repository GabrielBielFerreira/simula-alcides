/**
 * Dados de demonstração das telas de apoio da coordenação (Bloco 7):
 * gestão de simulados, banco de questões, fila de redações e ficha do estudante.
 * Complementa `coordenacao.ts` sem mudar os números de lá: tudo aqui é determinístico
 * e, quando possível, calculado a partir dos estudantes e polos gerados.
 */
import {
  POLO_DA_COORDENACAO,
  alunos,
  alunosDoPolo,
  buscarPolo,
  dadosPolos,
  dataBr,
  filaRedacoes,
  type Aluno,
  type AssuntoPercentual,
  type RedacaoFila,
} from "./coordenacao";
import {
  dificuldades as dificuldadesMaria,
  estudanteLogada,
  historico,
  propostas,
  questoes,
  redacoesMaria,
  textoRedacao,
  type Questao,
} from "./prototipo";
import { AGORA_DEMO } from "./tempo";
import type { AreaId } from "./types";

/* ---------- Datas (sempre no fuso do Recife, iguais no servidor e no navegador) ---------- */

const FUSO = "America/Recife";
const formatar = (iso: string, opcoes: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, ...opcoes }).format(new Date(iso));
const semPonto = (texto: string) => texto.replace(".", "");

/** "13h" ou "18h30". */
export function horaCurta(iso: string) {
  const [h, m] = formatar(iso, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).split(":");
  return `${Number(h)}h${m === "00" ? "" : m}`;
}

/** Bloco de data em formato de ingresso: { semana: "SÁB", dia: "31", mes: "OUT" }. */
export function partesData(iso: string) {
  return {
    semana: semPonto(formatar(iso, { weekday: "short" })).toUpperCase(),
    dia: formatar(iso, { day: "2-digit" }),
    mes: semPonto(formatar(iso, { month: "short" })).toUpperCase(),
  };
}

/** "sábado, 31 de outubro". */
export const dataPorExtenso = (iso: string) =>
  formatar(iso, { weekday: "long", day: "numeric", month: "long" });

/** "31/10/2026". */
export const dataCurta = (iso: string) =>
  formatar(iso, { day: "2-digit", month: "2-digit", year: "numeric" });

/** Dias inteiros entre AGORA_DEMO e a data (negativo se já passou). */
export const diasAte = (iso: string) =>
  Math.floor((new Date(iso).getTime() - AGORA_DEMO.getTime()) / 86400000);

/** "hoje", "ontem" ou "há 5 dias", a partir de uma data DD/MM/AAAA. */
export function haQuantoTempo(dataBr: string) {
  const [d, m, a] = dataBr.split("/").map(Number);
  const hoje = dataCurta(AGORA_DEMO.toISOString()).split("/").map(Number);
  const dias = Math.round(
    (Date.UTC(hoje[2], hoje[1] - 1, hoje[0]) - Date.UTC(a, m - 1, d)) / 86400000,
  );
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}

/* ---------- Gestão de simulados ---------- */

export type StatusSimulado = "Agendado" | "Rascunho" | "Encerrado";
export type Montagem = "automatica" | "banco";
export type Liberacao = "fechamento" | "na-hora";

export const modalidadesSimulado = [
  {
    id: "dia-1",
    nome: "Completo · Dia 1",
    detalhe: "Linguagens, Ciências Humanas e redação · 90 questões · 5h30",
    resumo: "90 questões e redação · 5h30",
  },
  {
    id: "dia-2",
    nome: "Completo · Dia 2",
    detalhe: "Ciências da Natureza e Matemática · 90 questões · 5h",
    resumo: "90 questões · 5h",
  },
  {
    id: "rapido-20",
    nome: "Rápido · 20 questões",
    detalhe: "As 4 áreas · 40 min",
    resumo: "As 4 áreas · 40 min",
  },
  {
    id: "rapido-30",
    nome: "Rápido · 30 questões",
    detalhe: "As 4 áreas · 1h",
    resumo: "As 4 áreas · 1h",
  },
  {
    id: "por-area",
    nome: "Por área",
    detalhe: "45 questões de uma área · 2h30",
    resumo: "45 questões · 2h30",
  },
  {
    id: "recuperacao",
    nome: "Recuperação",
    detalhe: "15 questões dos assuntos com mais erros · 30 min",
    resumo: "15 questões · 30 min",
  },
] as const;
export type ModalidadeSimulado = (typeof modalidadesSimulado)[number]["id"];

export interface SimuladoGestao {
  id: string;
  titulo: string;
  modalidade: ModalidadeSimulado;
  abertura: string; // ISO com fuso -03:00
  fechamento: string;
  /** Ids dos polos da Rede que fazem o simulado. */
  polos: string[];
  /** Aberto também a outros cursinhos e independentes. */
  externos: boolean;
  status: StatusSimulado;
  montagem: Montagem;
  liberacao: Liberacao;
  /** Quem concluiu, por polo (só nos encerrados). */
  concluiram?: Record<string, number>;
}

const todosOsPolos = dadosPolos.map((p) => p.id);
const oficialDia2 = (
  numero: number,
  data: string,
  concluiram: Record<string, number>,
): SimuladoGestao => ({
  id: `rede-${numero}`,
  titulo: `${numero}º Simulado da Rede · Dia 2`,
  modalidade: "dia-2",
  abertura: `${data}T13:00:00-03:00`,
  fechamento: `${data}T18:00:00-03:00`,
  polos: todosOsPolos,
  externos: false,
  status: "Encerrado",
  montagem: "automatica",
  liberacao: "fechamento",
  concluiram,
});

/** Participação no 4º oficial: a mesma da tabela dos polos (178 de 240). */
const concluiramQuarto = Object.fromEntries(dadosPolos.map((p) => [p.id, p.oficial]));

export const simuladosGestao: SimuladoGestao[] = [
  {
    id: "rede-5-dia-1",
    titulo: "5º Simulado da Rede · Dia 1",
    modalidade: "dia-1",
    abertura: "2026-10-31T13:00:00-03:00",
    fechamento: "2026-10-31T18:30:00-03:00",
    polos: todosOsPolos,
    externos: true,
    status: "Agendado",
    montagem: "automatica",
    liberacao: "fechamento",
  },
  {
    id: "rede-5-dia-2",
    titulo: "5º Simulado da Rede · Dia 2",
    modalidade: "dia-2",
    abertura: "2026-11-07T13:00:00-03:00",
    fechamento: "2026-11-07T18:00:00-03:00",
    polos: todosOsPolos,
    externos: true,
    status: "Agendado",
    montagem: "automatica",
    liberacao: "fechamento",
  },
  {
    id: "recuperacao-porcentagem",
    titulo: "Recuperação · Porcentagem e gráficos",
    modalidade: "recuperacao",
    abertura: "2026-11-14T09:00:00-03:00",
    fechamento: "2026-11-21T22:00:00-03:00",
    polos: ["dom-helder", "paulo-freire"],
    externos: false,
    status: "Rascunho",
    montagem: "banco",
    liberacao: "na-hora",
  },
  {
    id: "treino-humanas",
    titulo: "Treino de Ciências Humanas",
    modalidade: "por-area",
    abertura: "2026-09-26T09:00:00-03:00",
    fechamento: "2026-09-27T22:00:00-03:00",
    polos: ["leda-alves", "miguel-arraes"],
    externos: false,
    status: "Encerrado",
    montagem: "automatica",
    liberacao: "na-hora",
    concluiram: { "leda-alves": 24, "miguel-arraes": 29 },
  },
  oficialDia2(4, "2026-08-22", concluiramQuarto),
  oficialDia2(3, "2026-06-20", {
    "paulo-freire": 34,
    "eduardo-campos": 28,
    "ariano-suassuna": 31,
    "dom-helder": 24,
    "miguel-arraes": 34,
    "leda-alves": 30,
  }),
  oficialDia2(2, "2026-04-18", {
    "paulo-freire": 31,
    "eduardo-campos": 26,
    "ariano-suassuna": 30,
    "dom-helder": 23,
    "miguel-arraes": 33,
    "leda-alves": 28,
  }),
  oficialDia2(1, "2026-02-21", {
    "paulo-freire": 30,
    "eduardo-campos": 25,
    "ariano-suassuna": 28,
    "dom-helder": 24,
    "miguel-arraes": 31,
    "leda-alves": 26,
  }),
];

/** Participação de um simulado encerrado, só nos polos que o papel enxerga. */
export function participacaoSimulado(s: SimuladoGestao, polosVisiveis: string[]) {
  const polos = s.polos.filter((p) => polosVisiveis.includes(p));
  const concluiram = polos.reduce((soma, p) => soma + (s.concluiram?.[p] ?? 0), 0);
  const estudantes = polos.reduce((soma, p) => soma + (buscarPolo(p)?.estudantes ?? 0), 0);
  return {
    concluiram,
    estudantes,
    percentual: estudantes ? Math.round((concluiram / estudantes) * 100) : 0,
  };
}

/* ---------- Banco de questões ---------- */

export type OrigemQuestao = "Autoral" | "ENEM anterior" | "Gerada por IA";
export type SituacaoQuestao = "Rascunho" | "Em revisão" | "Aprovada" | "Arquivada";
export type Dificuldade = "Fácil" | "Média" | "Difícil";

export const origensQuestao: OrigemQuestao[] = ["Autoral", "ENEM anterior", "Gerada por IA"];
export const situacoesQuestao: SituacaoQuestao[] = [
  "Rascunho",
  "Em revisão",
  "Aprovada",
  "Arquivada",
];
export const niveisDificuldade: Dificuldade[] = ["Fácil", "Média", "Difícil"];

export interface QuestaoBanco {
  numero: number;
  questao: Questao;
  habilidade: string;
  dificuldade: Dificuldade;
  origem: OrigemQuestao;
  situacao: SituacaoQuestao;
  /** % das respostas em cada alternativa (A a E); null quando nunca foi aplicada. */
  distribuicao: number[] | null;
  respostas: number;
  aplicacoes: number;
  /** Linha de histórico mostrada no painel. */
  nota?: string;
}

interface MetadadosQuestao {
  habilidade: string;
  dificuldade: Dificuldade;
  origem: OrigemQuestao;
  situacao: SituacaoQuestao;
  distribuicao: number[] | null;
  respostas: number;
  aplicacoes: number;
  nota?: string;
}

/** Metadados do banco, na ordem das 12 questões de demonstração. */
const metadados: MetadadosQuestao[] = [
  {
    habilidade: "H16",
    dificuldade: "Média",
    origem: "Autoral",
    situacao: "Aprovada",
    distribuicao: [9, 46, 21, 17, 7],
    respostas: 438,
    aplicacoes: 3,
  },
  {
    habilidade: "H18",
    dificuldade: "Fácil",
    origem: "ENEM anterior",
    situacao: "Arquivada",
    distribuicao: [6, 8, 71, 4, 11],
    respostas: 512,
    aplicacoes: 4,
    nota: "Arquivada em 10/08/2026: substituída por uma versão autoral.",
  },
  {
    habilidade: "H25",
    dificuldade: "Fácil",
    origem: "Autoral",
    situacao: "Aprovada",
    distribuicao: [7, 24, 9, 52, 8],
    respostas: 438,
    aplicacoes: 3,
  },
  {
    habilidade: "H27",
    dificuldade: "Média",
    origem: "Autoral",
    situacao: "Aprovada",
    distribuicao: [5, 9, 6, 17, 63],
    respostas: 401,
    aplicacoes: 3,
  },
  {
    habilidade: "H3",
    dificuldade: "Fácil",
    origem: "ENEM anterior",
    situacao: "Aprovada",
    distribuicao: [58, 14, 6, 15, 7],
    respostas: 401,
    aplicacoes: 3,
  },
  {
    habilidade: "H24",
    dificuldade: "Média",
    origem: "Gerada por IA",
    situacao: "Aprovada",
    distribuicao: [8, 61, 14, 9, 8],
    respostas: 376,
    aplicacoes: 2,
    nota: "Revisão humana em 29/08/2026, antes de entrar no simulado de demonstração.",
  },
  {
    habilidade: "H14",
    dificuldade: "Fácil",
    origem: "Autoral",
    situacao: "Aprovada",
    distribuicao: [8, 13, 49, 21, 9],
    respostas: 376,
    aplicacoes: 2,
  },
  {
    habilidade: "H24",
    dificuldade: "Média",
    origem: "Gerada por IA",
    situacao: "Aprovada",
    distribuicao: [6, 10, 14, 57, 13],
    respostas: 376,
    aplicacoes: 2,
    nota: "Revisão humana em 12/09/2026, antes da primeira aplicação.",
  },
  {
    habilidade: "H21",
    dificuldade: "Média",
    origem: "Autoral",
    situacao: "Em revisão",
    distribuicao: [5, 12, 9, 33, 41],
    respostas: 376,
    aplicacoes: 2,
    nota: "Em revisão desde 15/10/2026: o texto-base vai explicar melhor a unidade Wh.",
  },
  {
    habilidade: "H24",
    dificuldade: "Média",
    origem: "Autoral",
    situacao: "Aprovada",
    distribuicao: [34, 6, 27, 9, 24],
    respostas: 452,
    aplicacoes: 3,
  },
  {
    habilidade: "H20",
    dificuldade: "Difícil",
    origem: "Autoral",
    situacao: "Aprovada",
    distribuicao: [18, 39, 22, 15, 6],
    respostas: 452,
    aplicacoes: 3,
  },
  {
    habilidade: "H4",
    dificuldade: "Fácil",
    origem: "Gerada por IA",
    situacao: "Em revisão",
    distribuicao: [12, 28, 41, 11, 8],
    respostas: 452,
    aplicacoes: 3,
    nota: "Aprovada em 05/09/2026. Voltou para revisão em 20/10/2026 por causa do alerta.",
  },
];

export const bancoQuestoes: QuestaoBanco[] = questoes.map((questao, i) => ({
  numero: questao.id,
  questao,
  ...metadados[i],
}));

/** % de acertos = parte das respostas que marcou o gabarito. */
export const percentualQuestao = (q: QuestaoBanco) =>
  q.distribuicao ? q.distribuicao[q.questao.gabarito] : null;

/** Índice da alternativa errada que atraiu mais respostas que o gabarito, ou null. */
export function alternativaEmAlerta(q: QuestaoBanco): number | null {
  const d = q.distribuicao;
  if (!d) return null;
  let maior: number | null = null;
  for (let i = 0; i < d.length; i++) {
    if (i === q.questao.gabarito || d[i] <= d[q.questao.gabarito]) continue;
    if (maior === null || d[i] > d[maior]) maior = i;
  }
  return maior;
}

/** Gerada por IA e ainda sem a aprovação de um professor. */
export const precisaRevisaoHumana = (origem: OrigemQuestao, situacao: SituacaoQuestao) =>
  origem === "Gerada por IA" && situacao !== "Aprovada" && situacao !== "Arquivada";

/* ---------- Fila de redações ---------- */

/** Redações revisadas por professores, por polo (somam as 71 da Rede). */
export const revisadasPorPolo: Record<string, number> = {
  "ariano-suassuna": 13,
  "dom-helder": 9,
  "eduardo-campos": 10,
  "leda-alves": 11,
  "miguel-arraes": 14,
  "paulo-freire": 14,
};

/** Totais de redações do Compaz Paulo Freire (o papel de coordenação do polo vê só estes). */
export const redacoesDoPolo = (poloId: string) => {
  const enviadas = alunosDoPolo(poloId).reduce((soma, a) => soma + a.redacoes, 0);
  const revisadas = revisadasPorPolo[poloId] ?? 0;
  return { enviadas, revisadas, aguardando: enviadas - revisadas };
};

/** Duas redações recentes do Paulo Freire ainda esperando um professor. */
const extrasPauloFreire: RedacaoFila[] = alunos
  .filter(
    (a) =>
      a.poloId === POLO_DA_COORDENACAO &&
      a.redacoes > 0 &&
      a.id !== estudanteLogada.id &&
      a.dias <= 7 &&
      !filaRedacoes.some((r) => r.aluno.id === a.id),
  )
  .slice(0, 2)
  .map((aluno, i): RedacaoFila => ({
    id: `redacao-pf-${i + 1}`,
    aluno,
    tema: propostas[i === 0 ? 2 : 0].tema,
    nota: i === 0 ? 600 : 680,
    competencias: i === 0 ? [120, 120, 120, 120, 120] : [160, 120, 120, 160, 120],
    data: dataBr(aluno.ultimoAcesso),
    status: "Aguardando revisão",
  }));

/** Amostra da fila usada na tela: a de `coordenacao.ts` mais duas do Paulo Freire. */
export const filaRevisao: RedacaoFila[] = [...filaRedacoes, ...extrasPauloFreire].map((r) => ({
  ...r,
  // Cada competência vai de 40 em 40: a nota estimada é sempre a soma das cinco.
  nota: r.competencias.reduce((soma, c) => soma + c, 0),
}));

export interface TrechoDestacado {
  trecho: string;
  competencia: number; // 1 a 5
  comentario: string;
}

const textoMobilidade =
  "A Constituição garante o direito de ir e vir, mas, nas grandes cidades brasileiras, esse direito ainda depende do bairro onde a pessoa mora. Para quem vive nas periferias, o trajeto até a escola ou o trabalho pode levar horas e consumir boa parte da renda.\n\nEm primeiro lugar, a oferta de transporte coletivo é desigual. Linhas com poucos horários e ônibus lotados afastam os moradores de oportunidades de estudo, saúde e lazer. Assim, a falta de mobilidade aprofunda desigualdades que já existem.\n\nAlém disso, as cidades foram planejadas para o carro. Calçadas estreitas, rampas quebradas e pouca iluminação tornam o caminho perigoso, sobretudo para pessoas com deficiência, idosos e mulheres que voltam para casa à noite.\n\nPortanto, cabe às prefeituras, com apoio do governo federal, ampliar e integrar as linhas de ônibus nas periferias e reformar calçadas com acessibilidade, por meio de planos de mobilidade construídos com a participação dos moradores. Dessa forma, o direito de circular deixará de ser privilégio.";

const textoCuidado =
  "Cozinhar, limpar, acompanhar os filhos na escola e cuidar de parentes idosos são tarefas essenciais para a vida em sociedade. No Brasil, porém, esse trabalho de cuidado é pouco reconhecido e recai, sobretudo, sobre as mulheres.\n\nIsso acontece, em grande parte, por uma herança cultural que trata o cuidado como obrigação feminina, e não como trabalho. Por isso, muitas mulheres acumulam jornadas e deixam de estudar ou de buscar empregos melhores.\n\nAlém disso, faltam políticas públicas que dividam essa responsabilidade. Sem creches suficientes e sem centros-dia para idosos, as famílias de baixa renda não têm com quem compartilhar o cuidado, o que reforça a desigualdade entre homens e mulheres.\n\nLogo, o governo federal, em parceria com os municípios, deve ampliar a rede de creches e de centros-dia, além de promover campanhas nas escolas sobre a divisão das tarefas domésticas. Assim, o cuidado será valorizado como um trabalho que sustenta toda a sociedade.";

/** Texto e trechos destacados pela IA, por proposta (as redações de exemplo repetem o texto do tema). */
export const textosPorProposta: Record<string, { texto: string; trechos: TrechoDestacado[] }> = {
  mobilidade: {
    texto: textoMobilidade,
    trechos: [
      {
        trecho: "esse direito ainda depende do bairro onde a pessoa mora",
        competencia: 2,
        comentario: "Boa tese: o recorte do tema aparece logo na introdução.",
      },
      {
        trecho: "Assim, a falta de mobilidade aprofunda desigualdades que já existem.",
        competencia: 3,
        comentario: "Conclusão correta, mas falta um dado ou exemplo que sustente o argumento.",
      },
      {
        trecho: "por meio de planos de mobilidade construídos com a participação dos moradores",
        competencia: 5,
        comentario: "Meio de execução claro. Vale dizer também quem acompanha e como.",
      },
    ],
  },
  leitura: {
    texto: textoRedacao,
    trechos: [
      {
        trecho: "a distância das bibliotecas e o custo dos livros dificultam esse acesso",
        competencia: 2,
        comentario: "Problema bem delimitado, ligado ao recorte das periferias.",
      },
      {
        trecho:
          "Porém, essas iniciativas precisam de recursos contínuos, e não apenas de campanhas pontuais.",
        competencia: 3,
        comentario: "Bom argumento. Um exemplo concreto do bairro daria mais força.",
      },
      {
        trecho: "por meio de editais permanentes e acompanhamento público",
        competencia: 5,
        comentario: "Proposta com meio e acompanhamento. Detalhe o efeito esperado.",
      },
    ],
  },
  cuidado: {
    texto: textoCuidado,
    trechos: [
      {
        trecho: "recai, sobretudo, sobre as mulheres",
        competencia: 2,
        comentario: "Recorte bem definido do tema.",
      },
      {
        trecho: "por uma herança cultural que trata o cuidado como obrigação feminina",
        competencia: 3,
        comentario: "Argumento pertinente. Um repertório (dado, autora ou lei) daria mais força.",
      },
      {
        trecho: "deve ampliar a rede de creches e de centros-dia",
        competencia: 5,
        comentario: "Agente e ação claros. Falta detalhar o meio e o efeito esperado.",
      },
    ],
  },
};

export const textoDaRedacao = (r: RedacaoFila) => {
  const proposta = propostas.find((p) => p.tema === r.tema) ?? propostas[1];
  return textosPorProposta[proposta.id];
};

/* ---------- Ficha do estudante ---------- */

/** As 4 aplicações dos simulados completos · Dia 2. */
const aplicacoes = historico.map((h, i) => ({
  ...h,
  mesLongo: ["fevereiro", "abril", "junho", "agosto"][i],
}));

export interface LinhaHistorico {
  id: string;
  titulo: string;
  /** Tipo e áreas, como "Completo · Natureza e Matemática". */
  modalidade: string;
  data: string; // DD/MM/AAAA
  acertos: number;
  erros: number;
  brancos: number;
  total: number;
  percentual: number;
}

export interface FichaDados {
  /** Completos · Dia 2, do mais antigo para o mais recente (base do gráfico). */
  completos: LinhaHistorico[];
  /** Todos os concluídos com detalhe, do mais recente para o mais antigo. */
  historico: LinhaHistorico[];
  /** Concluídos sem detalhe nesta demonstração (livres de outros estudantes). */
  outrosLivres: number;
  emAndamento?: { titulo: string; respondidas: number; total: number; salvo: string };
  /** Meses das aplicações feitas, para o eixo do gráfico. */
  meses: string[];
  /** Índices das aplicações feitas (0 = fev ... 3 = ago). */
  indices: number[];
  desde: string;
  areas: { area: AreaId; acertos: number; total: number }[];
  plano: { assunto: string; area: AreaId; acertos: number; total: number }[];
  redacoes: { id: string; mes: string; tema: string; nota: number; revisada: boolean }[];
}

/** Número estável por estudante, para variar os dados de exemplo sem sorteio. */
const semente = (aluno: Aluno) => Math.max(0, alunos.indexOf(aluno));

/** Acertos (de 90) cujo percentual arredondado é o mais próximo de `percentual`. */
function acertosDe(percentual: number) {
  const base = Math.round((percentual * 90) / 100);
  return [base, base - 1, base + 1].reduce((melhor, n) =>
    Math.abs(Math.round((n / 90) * 100) - percentual) <
    Math.abs(Math.round((melhor / 90) * 100) - percentual)
      ? n
      : melhor,
  );
}

const MODALIDADE_COMPLETO = "Completo · Natureza e Matemática";
const MODALIDADE_RAPIDO = "Livre · as 4 áreas";

/** Rápidos de Maria com erros e em branco separados (os acertos vêm de `rapidos`). */
const rapidosMaria: LinhaHistorico[] = [
  {
    id: "rapido-set",
    titulo: "Rápido · 30 questões",
    modalidade: MODALIDADE_RAPIDO,
    data: "19/09/2026",
    acertos: 19,
    erros: 10,
    brancos: 1,
    total: 30,
    percentual: 63,
  },
  {
    id: "rapido-jul",
    titulo: "Rápido · 30 questões",
    modalidade: MODALIDADE_RAPIDO,
    data: "11/07/2026",
    acertos: 16,
    erros: 12,
    brancos: 2,
    total: 30,
    percentual: 53,
  },
  {
    id: "rapido-mai",
    titulo: "Rápido · 20 questões",
    modalidade: MODALIDADE_RAPIDO,
    data: "16/05/2026",
    acertos: 9,
    erros: 9,
    brancos: 2,
    total: 20,
    percentual: 45,
  },
];

const ordemData = (a: LinhaHistorico, b: LinhaHistorico) =>
  b.data.split("/").reverse().join("").localeCompare(a.data.split("/").reverse().join(""));

const mesesRedacao = ["junho", "julho", "agosto", "setembro", "outubro"];

/** Tudo o que a ficha mostra além do que já está em `Aluno`. */
export function dadosDaFicha(aluno: Aluno): FichaDados {
  const s = semente(aluno);
  const ehMaria = aluno.id === estudanteLogada.id;

  // Aplicações feitas: terminam no último simulado do estudante.
  const fim = Math.max(
    0,
    aplicacoes.findIndex((a) => a.titulo === aluno.ultimoSimulado),
  );
  const indices = aluno.evolucao.map((_, k) => fim - aluno.evolucao.length + 1 + k);
  const completos: LinhaHistorico[] = ehMaria
    ? aplicacoes.map((a) => ({ ...a, modalidade: MODALIDADE_COMPLETO }))
    : indices.map((idx, k) => {
        const a = aplicacoes[idx];
        const percentual = aluno.evolucao[k];
        const acertos = acertosDe(percentual);
        const brancos = 1 + ((s + k) % 6);
        return {
          id: a.id,
          titulo: a.titulo,
          modalidade: MODALIDADE_COMPLETO,
          data: a.data,
          acertos,
          erros: 90 - acertos - brancos,
          brancos,
          total: 90,
          percentual,
        };
      });

  const ultimo = completos[completos.length - 1];
  const natureza = ehMaria
    ? 33
    : Math.min(45, Math.max(ultimo.acertos - 45, Math.round(ultimo.acertos / 2) + ((s % 5) - 2)));

  const polo = buscarPolo(aluno.poloId);
  const assuntosPolo: AssuntoPercentual[] = polo?.dificuldades ?? [];
  const plano = ehMaria
    ? dificuldadesMaria.map((d) => ({ ...d, area: "matematica" as AreaId }))
    : [0, 1, 2].map((k) => {
        const a = assuntosPolo[(s + k) % Math.max(1, assuntosPolo.length)];
        return {
          assunto: a?.assunto ?? "Porcentagem",
          area: a?.area ?? ("matematica" as AreaId),
          acertos: 1 + ((s + k) % 3),
          total: 6 - ((s + k) % 2),
        };
      });

  // Redações: as de Maria; para os outros, a da fila (se houver) é a mais recente.
  const naFila = filaRevisao.find((r) => r.aluno.id === aluno.id);
  const redacoes = ehMaria
    ? redacoesMaria
        .map((r) => ({
          id: r.id,
          mes: `${r.mes} de 2026`,
          tema: r.tema,
          nota: r.nota,
          revisada: r.id === "setembro",
        }))
        .reverse()
    : Array.from({ length: aluno.redacoes }, (_, k) => {
        const maisRecente = k === aluno.redacoes - 1;
        if (maisRecente && naFila)
          return {
            id: naFila.id,
            mes: `${mesesRedacao[Number(naFila.data.slice(3, 5)) - 6] ?? "outubro"} de 2026`,
            tema: naFila.tema,
            nota: naFila.nota,
            revisada: naFila.status === "Revisada",
          };
        return {
          id: `${aluno.id}-redacao-${k + 1}`,
          mes: `${mesesRedacao[Math.max(0, mesesRedacao.length - aluno.redacoes + k - 1)]} de 2026`,
          tema: propostas[(s + k) % propostas.length].tema,
          nota: 560 + ((s + k * 3) % 6) * 40,
          revisada: false,
        };
      }).reverse();

  return {
    completos,
    historico: (ehMaria ? [...completos, ...rapidosMaria] : [...completos]).sort(ordemData),
    outrosLivres: ehMaria ? 0 : Math.max(0, aluno.simulados - completos.length),
    emAndamento: ehMaria
      ? { titulo: "Rápido · 30 questões", respondidas: 12, total: 30, salvo: "há 2 dias" }
      : undefined,
    meses: ehMaria ? aplicacoes.map((a) => a.mes) : indices.map((i) => aplicacoes[i].mes),
    indices: ehMaria ? [0, 1, 2, 3] : indices,
    desde: ehMaria ? estudanteLogada.desde : `${aplicacoes[indices[0] ?? 0].mesLongo} de 2026`,
    areas: [
      { area: "natureza", acertos: natureza, total: 45 },
      { area: "matematica", acertos: ultimo.acertos - natureza, total: 45 },
    ],
    plano,
    redacoes,
  };
}

export interface Anotacao {
  data: string;
  autor: string;
  texto: string;
}

/** Anotações já registradas pela coordenação (só a ficha de Maria tem uma). */
export const anotacoesIniciais: Record<string, Anotacao[]> = {
  [estudanteLogada.id]: [
    {
      data: "08/10/2026",
      autor: "Carlos Albuquerque",
      texto:
        "Maria pediu mais material de porcentagem. Combinamos o treino de recuperação antes do 5º simulado.",
    },
  ],
};
