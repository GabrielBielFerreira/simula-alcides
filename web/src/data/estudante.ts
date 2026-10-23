/**
 * Dados de exemplo das telas complementares do estudante (desempenho e redação)
 * e dos acréscimos da página inicial. Complementa `prototipo.ts` sem alterá-lo.
 */
import type { AreaId } from "./types";
import {
  comentariosCompetencias,
  dificuldades,
  historico,
  propostas,
  rapidos,
  redacoesMaria,
  textoRedacao,
} from "./prototipo";

/* ---------- Datas no formato brasileiro ---------- */

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "21/02/2026" → { dia: "21", mes: "fev", mesExtenso: "fevereiro", ano: "2026" }. */
export function partesData(data: string) {
  const [dia, mes, ano] = data.split("/");
  const mesExtenso = MESES[Number(mes) - 1] ?? "";
  return { dia, mes: mesExtenso.slice(0, 3), mesExtenso, ano };
}

/** "21/02/2026" → "21 de fevereiro de 2026". */
export function dataPorExtenso(data: string) {
  const { dia, mesExtenso, ano } = partesData(data);
  return `${Number(dia)} de ${mesExtenso} de ${ano}`;
}

/* ---------- Desempenho ---------- */

export type ModoEvolucao = "completos" | "rapidos";

const datasRapidos = ["16/05/2026", "11/07/2026", "19/09/2026"];

/** Rápidos concluídos por Maria, na ordem em que foram feitos. */
export const historicoRapidos = rapidos.map((r, i) => ({
  ...r,
  id: `rapido-${r.mes}`,
  titulo: `Rápido · ${r.total} questões`,
  data: datasRapidos[i],
}));

/** Cada modalidade só se compara com ela mesma (regra de honestidade metodológica). */
export const modosEvolucao: Record<
  ModoEvolucao,
  {
    rotulo: string;
    nota: string;
    valores: number[];
    meses: string[];
    datas: string[];
    descricao: string;
  }
> = {
  completos: {
    rotulo: "Completos · Dia 2",
    nota: "Comparando só simulados completos · Dia 2",
    valores: historico.map((h) => h.percentual),
    meses: historico.map((h) => h.mes),
    datas: historico.map((h) => h.data),
    descricao: "simulados completos · Dia\u00a02",
  },
  rapidos: {
    rotulo: "Rápidos",
    nota: "Comparando só simulados rápidos",
    valores: historicoRapidos.map((r) => r.percentual),
    meses: historicoRapidos.map((r) => r.mes),
    datas: historicoRapidos.map((r) => r.data),
    descricao: "simulados rápidos",
  },
};

/** Assuntos com mais dificuldade no 4º Simulado da Rede · Dia 2, do menor % para o maior. */
export const assuntosDificuldade: {
  assunto: string;
  area: AreaId;
  acertos: number;
  total: number;
  percentual: number;
}[] = dificuldades
  .map((d) => ({
    ...d,
    area: "matematica" as AreaId,
    percentual: Math.round((d.acertos / d.total) * 100),
  }))
  .sort((a, b) => a.percentual - b.percentual);

/* ---------- Redação ---------- */

/** Regras da folha de redação do ENEM usadas no contador. */
export const regrasRedacao = {
  maxLinhas: 30,
  /** No ENEM, textos com até 7 linhas recebem nota zero. */
  minLinhas: 8,
  /** Estimativa de caracteres por linha manuscrita na folha oficial. */
  caracteresPorLinha: 65,
  /**
   * Duração simulada da etapa "Corrigindo", em milissegundos: as 5 competências são marcadas uma
   * a uma (600ms cada) e a devolutiva é montada em mais 600ms.
   */
  duracaoCorrecao: 3600,
};

/** Conta palavras e linhas estimadas (cada parágrafo começa numa linha nova). */
export function contarRedacao(texto: string) {
  const limpo = texto.trim();
  const palavras = limpo ? limpo.split(/\s+/).length : 0;
  const linhas = texto
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .reduce((soma, p) => soma + Math.ceil(p.length / regrasRedacao.caracteresPorLinha), 0);
  return { palavras, linhas };
}

export const etapasRedacao = ["Proposta", "Escrever", "Revisar", "Corrigindo", "Devolutiva"];

/** Nomes curtos das 5 competências (os completos estão em `competenciasRedacao`). */
export const competenciasCurtas = [
  "Norma padrão",
  "Tema e tipo de texto",
  "Argumentação",
  "Coesão",
  "Proposta de intervenção",
];

export interface TextoMotivador {
  texto: string;
  fonte: string;
}

export interface DetalheProposta {
  eixo: string;
  resumo: string;
  textos: TextoMotivador[];
}

export const instrucaoProposta =
  "A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo da sua formação, redija um texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema abaixo, apresentando proposta de intervenção que respeite os direitos humanos.";

export const regrasProposta = [
  "Texto dissertativo-argumentativo, em prosa",
  "Entre 8 e 30 linhas",
  "Proposta de intervenção que respeite os direitos humanos",
  "Use os textos motivadores como apoio, sem copiar trechos",
];

export const detalhesPropostas: Record<string, DetalheProposta> = {
  mobilidade: {
    eixo: "Cidade e direitos",
    resumo: "Transporte, acessibilidade e o direito de circular pela cidade.",
    textos: [
      {
        texto:
          "Em muitas capitais brasileiras, quem mora nas periferias passa mais de duas horas por dia no transporte coletivo. Esse tempo deixa de ser dedicado ao estudo, ao descanso e à convivência com a família.",
        fonte: "Boletim fictício Cidade em Movimento, 2026.",
      },
      {
        texto:
          "Uma calçada sem rampa, um ônibus sem elevador ou um terminal sem informação sonora transformam o deslocamento em barreira para pessoas com deficiência e pessoas idosas.",
        fonte: "Cartilha fictícia Acessibilidade para Todos, 2026.",
      },
      {
        texto:
          "São direitos sociais a educação, a saúde, a alimentação, o trabalho, a moradia, o transporte, o lazer, a segurança […].",
        fonte:
          "Constituição Federal de 1988, art. 6º (redação dada pela Emenda Constitucional nº 90, de 2015).",
      },
    ],
  },
  leitura: {
    eixo: "Cultura e educação",
    resumo: "Bibliotecas, rodas de leitura e o direito ao livro em todos os bairros.",
    textos: [
      {
        texto:
          "Em muitos bairros, a biblioteca pública mais próxima fica a mais de uma hora de ônibus. Para quem trabalha e estuda, essa distância pesa tanto quanto o preço de um livro.",
        fonte: "Reportagem fictícia do Jornal do Bairro, 2026.",
      },
      {
        texto:
          "Rodas de leitura em praças, escolas e associações de moradores aproximam os livros da vida cotidiana e formam novos leitores de todas as idades.",
        fonte: "Relatório fictício Leitura em Rede, 2026.",
      },
      {
        texto:
          "Ler é também um modo de participar da vida pública: quem lê compreende melhor seus direitos e encontra mais caminhos para expressá-los.",
        fonte: "Ensaio autoral escrito para este simulado, 2026.",
      },
    ],
  },
  cuidado: {
    eixo: "Trabalho e sociedade",
    resumo: "Quem cuida de crianças, idosos e doentes, e quem reconhece esse trabalho.",
    textos: [
      {
        texto:
          "Cuidar de crianças, de pessoas idosas e de pessoas doentes é um trabalho que sustenta a vida em sociedade, mas, quando é feito em casa, raramente é remunerado ou reconhecido.",
        fonte: "Texto autoral escrito para este simulado, 2026.",
      },
      {
        texto:
          "Pesquisas sobre o uso do tempo mostram que as mulheres dedicam, em média, quase o dobro de horas semanais aos afazeres domésticos e ao cuidado de pessoas, em comparação com os homens.",
        fonte: "Boletim fictício Observatório do Cuidado, 2026.",
      },
      {
        texto:
          "Creches, centros-dia para pessoas idosas e licenças parentais ampliadas são exemplos de políticas que dividem a responsabilidade do cuidado entre famílias, Estado e sociedade.",
        fonte: "Cartilha fictícia Cuidar é Trabalho, 2026.",
      },
    ],
  },
};

/** Estrutura sugerida, mostrada ao lado do editor. */
export const estruturaRedacao = [
  { parte: "Introdução", dica: "Apresente o tema e deixe clara a sua tese." },
  { parte: "Desenvolvimento 1", dica: "Um argumento, comprovado com dado, lei ou exemplo." },
  { parte: "Desenvolvimento 2", dica: "Outro argumento, ligado ao primeiro por um conectivo." },
  {
    parte: "Conclusão",
    dica: "Proposta com agente, ação, meio, finalidade e detalhamento.",
  },
];

/** Itens da etapa "Revisar". */
export const checklistRevisao = [
  "Minha tese aparece já na introdução.",
  "Cada parágrafo de desenvolvimento tem um argumento e uma prova (dado, lei ou exemplo).",
  "A conclusão traz agente, ação, meio, finalidade e detalhamento.",
  "Reli o texto procurando erros de acentuação e de pontuação.",
];

/** Avisos da etapa "Corrigindo" (para o leitor de tela e abaixo da barra). */
export const mensagensCorrecao = {
  avaliando: "Avaliando as competências",
  preparando: "Preparando sua devolutiva",
};

export type TipoTrecho = "forte" | "melhorar";

export interface Trecho {
  trecho: string;
  /** Índice da competência, de 0 (C1) a 4 (C5). */
  competencia: number;
  tipo: TipoTrecho;
  comentario: string;
}

export interface PassoPlano {
  competencia: number;
  titulo: string;
  texto: string;
}

export interface Devolutiva {
  competencias: number[];
  comentarios: string[];
  trechos: Trecho[];
  plano: PassoPlano[];
}

const textoJulho =
  "No Brasil, o direito de ir e vir está garantido na Constituição, mas, na prática, muitos brasileiros não conseguem circular pela cidade com dignidade. Nas periferias, o transporte coletivo é caro, demorado e pouco acessível, o que limita o acesso ao trabalho, à escola e ao lazer.\n\nEm primeiro lugar, o tempo gasto no deslocamento prejudica a vida de trabalhadores e estudantes. Quem mora longe do centro chega a passar horas dentro do ônibus todos os dias, e esse tempo poderia ser usado para estudar ou descansar. Isso mostra que a desigualdade também aparece no mapa da cidade.\n\nAlém disso, as pessoas com deficiência e os idosos enfrentam barreiras ainda maiores. Calçadas quebradas, ônibus sem elevador e terminais sem informação dificultam a autonomia dessas pessoas, que muitas vezes deixam de sair de casa.\n\nPortanto, o governo deve melhorar o transporte público. Para isso, é preciso investir em mais linhas de ônibus e em acessibilidade, para que todos possam circular pela cidade.";

const textoCuidado =
  "Em grande parte dos lares brasileiros, alguém acorda mais cedo para preparar o café, levar as crianças à escola e acompanhar um parente doente. Esse trabalho de cuidado sustenta a vida em sociedade, mas segue invisível e, na maioria das vezes, sem remuneração.\n\nEm primeiro lugar, a divisão desigual das tarefas pesa sobre as mulheres. Segundo pesquisas sobre o uso do tempo, elas dedicam quase o dobro de horas semanais aos afazeres domésticos, o que reduz o tempo disponível para estudar, trabalhar fora e descansar.\n\nAlém disso, a falta de políticas públicas transfere para as famílias uma responsabilidade que deveria ser coletiva. Sem creches suficientes e sem centros de convivência para idosos, muitas jovens deixam os estudos para cuidar de irmãos e avós.\n\nPortanto, o Governo Federal, em parceria com as prefeituras, deve ampliar a rede de creches e de centros-dia para idosos, por meio de recursos garantidos no orçamento, a fim de dividir o cuidado entre famílias, Estado e sociedade. Assim, o trabalho de cuidado será reconhecido como parte da vida pública.";

/** Texto de cada redação de Maria e texto de exemplo de cada proposta (botão de demonstração). */
export const textosRedacao: Record<string, string> = {
  julho: textoJulho,
  setembro: textoRedacao,
  mobilidade: textoJulho,
  leitura: textoRedacao,
  cuidado: textoCuidado,
};

const trechosJulho: Trecho[] = [
  {
    trecho: "o que limita o acesso ao trabalho, à escola e ao lazer",
    competencia: 1,
    tipo: "forte",
    comentario: "Você liga o tema à vida concreta e deixa claro o problema que vai discutir.",
  },
  {
    trecho: "chega a passar horas dentro do ônibus todos os dias",
    competencia: 2,
    tipo: "melhorar",
    comentario:
      "A ideia é boa, mas fica no geral. Um dado, uma lei ou um exemplo do Recife comprovaria o argumento.",
  },
  {
    trecho: "o governo deve melhorar o transporte público",
    competencia: 4,
    tipo: "melhorar",
    comentario:
      "Diga qual esfera do governo age, como a ação acontece e para quê. Assim a proposta fica completa.",
  },
];

const trechosSetembro: Trecho[] = [
  {
    trecho:
      "Entretanto, a distância das bibliotecas e o custo dos livros dificultam esse acesso nas periferias brasileiras.",
    competencia: 1,
    tipo: "forte",
    comentario:
      "Tese clara logo na introdução: você apresenta o problema e as duas causas que vai discutir.",
  },
  {
    trecho: "Bibliotecas de bairro e rodas de leitura aproximam o conhecimento da vida cotidiana.",
    competencia: 2,
    tipo: "melhorar",
    comentario:
      "Boa ideia, ainda genérica. Cite um exemplo concreto, um dado ou uma lei para comprovar o argumento.",
  },
  {
    trecho: "por meio de editais permanentes e acompanhamento público",
    competencia: 4,
    tipo: "melhorar",
    comentario:
      "O meio está presente. Para chegar a 200, explique quem acompanha, com que frequência e com qual finalidade.",
  },
];

const trechosCuidado: Trecho[] = [
  {
    trecho:
      "Esse trabalho de cuidado sustenta a vida em sociedade, mas segue invisível e, na maioria das vezes, sem remuneração.",
    competencia: 1,
    tipo: "forte",
    comentario: "Tese clara e bem posicionada: o leitor sabe desde o início o que você defende.",
  },
  {
    trecho: "Segundo pesquisas sobre o uso do tempo",
    competencia: 2,
    tipo: "melhorar",
    comentario:
      "Diga qual pesquisa e de que ano. Um repertório identificado dá mais força ao argumento.",
  },
  {
    trecho: "a fim de dividir o cuidado entre famílias, Estado e sociedade",
    competencia: 4,
    tipo: "forte",
    comentario:
      "A finalidade está explícita e retoma a sua tese. É assim que a proposta fecha bem.",
  },
];

const repertorio = (exemplo: string): PassoPlano => ({
  competencia: 2,
  titulo: "Um repertório por parágrafo",
  texto: `Traga um dado, uma lei ou um fato histórico e explique como ele comprova a sua tese. ${exemplo}`,
});

const propostaCompleta: PassoPlano = {
  competencia: 4,
  titulo: "Proposta com os 5 elementos",
  texto:
    "Na conclusão, marque agente, ação, meio, finalidade e detalhamento. Se faltar algum, acrescente uma frase.",
};

const virgulas: PassoPlano = {
  competencia: 0,
  titulo: "Vírgulas em períodos longos",
  texto:
    "Leia o texto em voz alta: onde você respira, talvez falte uma vírgula. Períodos mais curtos também ajudam.",
};

/** Devolutivas das redações de Maria e devolutiva de exemplo do editor (protótipo). */
export const devolutivas: Record<"julho" | "setembro" | "exemplo", Devolutiva> = {
  julho: {
    competencias: redacoesMaria[0].competencias,
    comentarios: [
      "Poucos desvios. Atenção à concordância em frases longas.",
      "Você entende o tema, mas às vezes descreve o problema sem defender uma posição.",
      "Os argumentos fazem sentido. Falta comprovar cada um com dados ou exemplos.",
      "Bom uso de conectivos entre os parágrafos. Varie as expressões.",
      "A proposta existe, mas está vaga. Diga quem faz, como faz e para quê.",
    ],
    trechos: trechosJulho,
    plano: [
      {
        competencia: 1,
        titulo: "Defenda uma posição",
        texto:
          "Termine a introdução com uma frase que diga o que você pensa sobre o problema. Ela guia o resto do texto.",
      },
      repertorio(
        "Para mobilidade, o art. 6º da Constituição, que inclui o transporte entre os direitos sociais, é um bom começo.",
      ),
      propostaCompleta,
    ],
  },
  setembro: {
    competencias: redacoesMaria[1].competencias,
    comentarios: comentariosCompetencias,
    trechos: trechosSetembro,
    plano: [
      repertorio(
        "Para leitura, vale citar a Lei nº 12.244, de 2010, que prevê bibliotecas em todas as escolas.",
      ),
      propostaCompleta,
      virgulas,
    ],
  },
  exemplo: {
    competencias: [160, 160, 160, 160, 120],
    comentarios: [
      "Texto claro, com poucos desvios. Revise acentuação e vírgulas antes de conectivos.",
      "O tema está bem compreendido e a estrutura dissertativo-argumentativa se mantém.",
      "Os argumentos se apoiam em exemplos. Aprofunde a ligação entre o repertório e a tese.",
      "Conectivos variados ligam os parágrafos. Cuide das retomadas dentro de cada parágrafo.",
      "Há agente e ação. Detalhe o meio e o acompanhamento para completar a proposta.",
    ],
    trechos: [...trechosJulho, ...trechosSetembro, ...trechosCuidado],
    plano: [
      repertorio("Os textos motivadores dão pistas, mas o repertório que vem de você vale mais."),
      propostaCompleta,
      virgulas,
    ],
  },
};

/** Data de envio de cada redação de Maria (a de setembro bate com a fila da coordenação). */
export const datasRedacoes: Record<string, string> = {
  julho: "26/07/2026",
  setembro: "28/09/2026",
};

/** Primeira proposta que Maria ainda não escreveu: o próximo passo sugerido. */
export const propostaSugerida =
  propostas.find((p) => !redacoesMaria.some((r) => r.tema === p.tema)) ?? propostas[0];

/* ---------- Página inicial ---------- */

export const modalidadesCurtas = [
  {
    id: "rapido",
    titulo: "Rápido",
    questoes: "20 ou 30 questões",
    tempo: "40\u00a0min ou\u00a01h",
    texto: "Questões das quatro áreas para treinar no ônibus ou no intervalo.",
  },
  {
    id: "area",
    titulo: "Por área",
    questoes: "45 questões",
    tempo: "2h30",
    texto: "Foque em Linguagens, Ciências Humanas, Ciências da Natureza ou Matemática.",
  },
  {
    id: "recuperacao",
    titulo: "Recuperação",
    questoes: "15 questões",
    tempo: "30 min",
    texto: "Montado a partir dos assuntos em que você mais errou nos simulados.",
  },
] as const;

export const recursosRedacao = [
  "Temas autorais no estilo do ENEM, com textos motivadores",
  "Editor com contador de linhas e de palavras",
  "Devolutiva pelas 5 competências, com trechos comentados",
  "Plano de melhoria para a próxima redação",
];

export const recursosCoordenacao = [
  {
    id: "polo",
    titulo: "Por polo",
    texto: "Participação, conclusão, desempenho por área e evolução de cada Compaz.",
  },
  {
    id: "estudante",
    titulo: "Por estudante",
    texto:
      "Histórico, assuntos a reforçar e redações de cada estudante, com quem precisa de apoio.",
  },
  {
    id: "sem-ranking",
    titulo: "Sem ranking",
    texto: "Polos em ordem alfabética, para planejar apoio, nunca para expor ninguém.",
  },
] as const;
