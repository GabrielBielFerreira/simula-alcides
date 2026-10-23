import type { AreaId } from "./types";
import { AGORA_DEMO } from "./tempo";
export const DEMO = true;
export interface Simulado {
  id: string;
  titulo: string;
  modalidade: string;
  areas: AreaId[];
  questoes: number;
  duracao: string;
  minutos: number;
  oficial?: boolean;
  abertura?: string;
  fechamento?: string;
  andamento?: number;
}
export const estudanteLogada = {
  id: "maria-silva",
  nome: "Maria Silva",
  email: "maria.silva@email.com",
  dataNascimento: "2007-05-12",
  poloId: "paulo-freire",
  iniciais: "MS",
  desde: "fevereiro de 2026",
};
export interface ItemHistorico {
  id: string;
  titulo: string;
  mes: string;
  /** DD/MM/AAAA */
  data: string;
  acertos: number;
  erros: number;
  brancos: number;
  total: number;
  percentual: number;
  /** Tempo total de prova, em segundos (só o 4º tem esse detalhe no protótipo). */
  tempoSegundos?: number;
}
export const historico: ItemHistorico[] = [
  {
    id: "rede-1",
    titulo: "1º Simulado da Rede · Dia 2",
    mes: "fev",
    data: "21/02/2026",
    acertos: 38,
    erros: 44,
    brancos: 8,
    total: 90,
    percentual: 42,
  },
  {
    id: "rede-2",
    titulo: "2º Simulado da Rede · Dia 2",
    mes: "abr",
    data: "18/04/2026",
    acertos: 46,
    erros: 37,
    brancos: 7,
    total: 90,
    percentual: 51,
  },
  {
    id: "rede-3",
    titulo: "3º Simulado da Rede · Dia 2",
    mes: "jun",
    data: "20/06/2026",
    acertos: 52,
    erros: 32,
    brancos: 6,
    total: 90,
    percentual: 58,
  },
  {
    id: "rede-4",
    titulo: "4º Simulado da Rede · Dia 2",
    mes: "ago",
    data: "22/08/2026",
    acertos: 60,
    erros: 24,
    brancos: 6,
    total: 90,
    percentual: 67,
    // 4h12min no total: 2min48s por questão, em média.
    tempoSegundos: 15120,
  },
];
export const rapidos = [
  { mes: "mai", percentual: 45, acertos: 9, total: 20 },
  { mes: "jul", percentual: 53, acertos: 16, total: 30 },
  { mes: "set", percentual: 63, acertos: 19, total: 30 },
];
export const resultadoAreas = [
  { area: "natureza" as const, acertos: 33, erros: 10, brancos: 2 },
  { area: "matematica" as const, acertos: 27, erros: 14, brancos: 4 },
];
export const disciplinas: {
  nome: string;
  area: AreaId;
  acertos: number;
  erros: number;
  brancos: number;
}[] = [
  { nome: "Biologia", area: "natureza", acertos: 13, erros: 2, brancos: 0 },
  { nome: "Química", area: "natureza", acertos: 11, erros: 3, brancos: 1 },
  { nome: "Física", area: "natureza", acertos: 9, erros: 5, brancos: 1 },
  { nome: "Matemática", area: "matematica", acertos: 27, erros: 14, brancos: 4 },
];

/* ---------- Gabarito do 4º Simulado da Rede · Dia 2 ---------- */

export type StatusGabarito = "acerto" | "erro" | "branco";

export interface QuestaoGabarito {
  numero: number;
  area: AreaId;
  disciplina: string;
  status: StatusGabarito;
  /** Alternativa marcada (0 = A); null quando ficou em branco. */
  resposta: number | null;
  /** Alternativa correta (0 = A). */
  gabarito: number;
}

/**
 * Espalha acertos, erros e em branco ao longo de um bloco de questões, sempre na mesma ordem:
 * a cada posição entra o status mais "atrasado" em relação à sua proporção no bloco.
 */
function distribuirStatus(acertos: number, erros: number, brancos: number): StatusGabarito[] {
  const total = acertos + erros + brancos;
  const metas: Record<StatusGabarito, number> = { acerto: acertos, erro: erros, branco: brancos };
  const usados: Record<StatusGabarito, number> = { acerto: 0, erro: 0, branco: 0 };
  return Array.from({ length: total }, (_, i) => {
    const atraso = (s: StatusGabarito) => (metas[s] * (i + 1)) / total - usados[s];
    const status = (["acerto", "erro", "branco"] as const).reduce((a, b) =>
      atraso(b) > atraso(a) ? b : a,
    );
    usados[status]++;
    return status;
  });
}

/**
 * As 90 questões do 4º, na ordem da prova: Biologia (1 a 15), Química (16 a 30), Física (31 a 45)
 * e Matemática (46 a 90). As contagens batem com `disciplinas` e `resultadoAreas`.
 */
export const gabaritoRede4: QuestaoGabarito[] = disciplinas
  .flatMap((d) =>
    distribuirStatus(d.acertos, d.erros, d.brancos).map((status) => ({
      area: d.area,
      disciplina: d.nome,
      status,
    })),
  )
  .map((q, i) => {
    const gabarito = (i * 7 + 3) % 5;
    const resposta =
      q.status === "acerto" ? gabarito : q.status === "erro" ? (gabarito + 1 + (i % 4)) % 5 : null;
    return { ...q, numero: i + 1, gabarito, resposta };
  });
export const dificuldades = [
  { assunto: "Porcentagem", acertos: 2, total: 6 },
  { assunto: "Interpretação de gráficos", acertos: 3, total: 6 },
  { assunto: "Funções do 1º grau", acertos: 2, total: 5 },
];
export const metas = [
  { titulo: "Fazer 2 treinos rápidos", valor: 1, total: 2 },
  { titulo: "Revisar porcentagem", valor: 0, total: 1 },
];

/** Selos de participação (nunca de desempenho nem de comparação com colegas). */
export const conquistas = {
  feitas: [
    { id: "primeiro", numero: "1º", rotulo: "simulado feito" },
    { id: "completos", numero: String(historico.length), rotulo: "simulados completos" },
    { id: "semanas", numero: "3", rotulo: "semanas seguidas" },
  ],
  proxima: {
    id: "completos-proximo",
    numero: String(historico.length + 1),
    rotulo: "simulados completos",
    falta: 1,
  },
} as const;

/* ---------- Datas dos simulados (fuso do Recife: iguais no servidor e no navegador) ---------- */

const formatarData = (iso: string, opcoes: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", ...opcoes }).format(new Date(iso));
const semPonto = (texto: string) => texto.replace(".", "");

/** Bloco em formato de ingresso: { semana: "SÁB", dia: "31", mes: "OUT" }. */
export function partesIngresso(iso: string) {
  return {
    semana: semPonto(formatarData(iso, { weekday: "short" })).toUpperCase(),
    dia: formatarData(iso, { day: "2-digit" }),
    mes: semPonto(formatarData(iso, { month: "short" })).toUpperCase(),
  };
}

/** "sábado, 31 de outubro". */
export const diaPorExtenso = (iso: string) =>
  formatarData(iso, { weekday: "long", day: "numeric", month: "long" });

/** "13h" ou "18h30". */
export function horaCurta(iso: string) {
  const [h, m] = formatarData(iso, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).split(
    ":",
  );
  return `${Number(h)}h${m === "00" ? "" : m}`;
}

/** Dias inteiros entre AGORA_DEMO e a data (negativo se já passou). */
export const diasAte = (iso: string) =>
  Math.floor((new Date(iso).getTime() - AGORA_DEMO.getTime()) / 86400000);

/** "sábado, 31 de outubro · 13h às 18h30". */
export function quandoAcontece(s: Simulado) {
  if (!s.abertura) return "";
  const horario = s.fechamento
    ? `${horaCurta(s.abertura)} às ${horaCurta(s.fechamento)}`
    : horaCurta(s.abertura);
  return `${diaPorExtenso(s.abertura)} · ${horario}`;
}

/** "21/02/2026" → início da aplicação em ISO ("2026-02-21T13:00:00-03:00"). */
export function isoDaAplicacao(dataBr: string) {
  const [dia, mes, ano] = dataBr.split("/");
  return `${ano}-${mes}-${dia}T13:00:00-03:00`;
}
export const catalogo: Simulado[] = [
  {
    id: "rede-5-dia-1",
    titulo: "5º Simulado da Rede · Dia 1",
    modalidade: "Completos",
    areas: ["linguagens", "humanas"],
    questoes: 90,
    duracao: "5h30",
    minutos: 330,
    oficial: true,
    abertura: "2026-10-31T13:00:00-03:00",
    fechamento: "2026-10-31T18:30:00-03:00",
  },
  {
    id: "rede-5-dia-2",
    titulo: "5º Simulado da Rede · Dia 2",
    modalidade: "Completos",
    areas: ["natureza", "matematica"],
    questoes: 90,
    duracao: "5h",
    minutos: 300,
    oficial: true,
    abertura: "2026-11-07T13:00:00-03:00",
    fechamento: "2026-11-07T18:00:00-03:00",
  },
  {
    id: "demo",
    titulo: "Simulado de demonstração",
    modalidade: "Rápidos",
    areas: ["linguagens", "humanas", "natureza", "matematica"],
    questoes: 12,
    duracao: "25 min",
    minutos: 25,
  },
  {
    id: "completo-dia-1",
    titulo: "Completo · Dia 1",
    modalidade: "Completos",
    areas: ["linguagens", "humanas"],
    questoes: 90,
    duracao: "5h30 + redação",
    minutos: 330,
  },
  {
    id: "completo-dia-2",
    titulo: "Completo · Dia 2",
    modalidade: "Completos",
    areas: ["natureza", "matematica"],
    questoes: 90,
    duracao: "5h",
    minutos: 300,
  },
  {
    id: "rapido-20",
    titulo: "Rápido · 20 questões",
    modalidade: "Rápidos",
    areas: ["linguagens", "humanas", "natureza", "matematica"],
    questoes: 20,
    duracao: "40 min",
    minutos: 40,
  },
  {
    id: "rapido-30",
    titulo: "Rápido · 30 questões",
    modalidade: "Rápidos",
    areas: ["linguagens", "humanas", "natureza", "matematica"],
    questoes: 30,
    duracao: "1h",
    minutos: 60,
    andamento: 12,
  },
  ...(["linguagens", "humanas", "natureza", "matematica"] as AreaId[]).map((area) => ({
    id: `area-${area}`,
    titulo: `Treino de ${{ linguagens: "Linguagens", humanas: "Ciências Humanas", natureza: "Ciências da Natureza", matematica: "Matemática" }[area]}`,
    modalidade: "Por área",
    areas: [area],
    questoes: 45,
    duracao: "2h30",
    minutos: 150,
  })),
  {
    id: "recuperacao",
    titulo: "Porcentagem e gráficos",
    modalidade: "Recuperação",
    areas: ["matematica"],
    questoes: 15,
    duracao: "30 min",
    minutos: 30,
  },
];
export interface Questao {
  id: number;
  area: AreaId;
  disciplina: string;
  assunto: string;
  texto: string;
  fonte: string;
  enunciado: string;
  alternativas: string[];
  gabarito: number;
  comentario: string;
  tabela?: string[][];
  grafico?: { rotulo: string; valor: number }[];
  habilidade: string;
  dificuldade: string;
  origem: string;
  status: string;
  percentual: number;
}
const brutas: Omit<
  Questao,
  "id" | "habilidade" | "dificuldade" | "origem" | "status" | "percentual"
>[] = [
  {
    area: "linguagens",
    disciplina: "Literatura",
    assunto: "Sentido figurado",
    texto:
      "No bolso, levo a rua.\nNo peito, um mapa sem fim.\nCada janela acesa\né um caminho dentro de mim.",
    fonte: "Lia Melo. Caderno de caminhos, poema autoral para este simulado, 2026.",
    enunciado: "A imagem “um mapa sem fim” sugere que o eu lírico",
    alternativas: [
      "conhece todas as ruas.",
      "carrega experiências e possibilidades.",
      "procura um endereço perdido.",
      "rejeita a vida na cidade.",
      "descreve um mapa impresso.",
    ],
    gabarito: 1,
    comentario:
      "O mapa é uma metáfora para as experiências e possibilidades do sujeito. As janelas e os caminhos relacionam a cidade à vida interior, sem descrever um objeto literal.",
  },
  {
    area: "linguagens",
    disciplina: "Português",
    assunto: "Gêneros textuais",
    texto:
      "Mutirão de leitura na praça: sábado, às 9h. Traga um livro e compartilhe uma história. Participação gratuita.",
    fonte: "Boletim fictício da Associação Leitura no Bairro, 2026.",
    enunciado: "A principal finalidade desse texto é",
    alternativas: [
      "narrar uma lembrança.",
      "explicar uma teoria.",
      "mobilizar moradores para um encontro.",
      "vender livros raros.",
      "criticar a praça.",
    ],
    gabarito: 2,
    comentario:
      "O convite apresenta data, local e uma ação dirigida ao leitor. Esses elementos buscam mobilizar a comunidade para participar do evento.",
  },
  {
    area: "linguagens",
    disciplina: "Português",
    assunto: "Variação linguística",
    texto:
      "“Oxente, a gente se encontra depois da aula!” A frase circula numa conversa entre colegas do Recife.",
    fonte: "Registro fictício de conversa estudantil, 2026.",
    enunciado: "O uso de “oxente” revela",
    alternativas: [
      "uma linguagem sem regras.",
      "um erro que impede a compreensão.",
      "a exclusividade da linguagem escrita.",
      "uma marca de identidade regional.",
      "um termo técnico científico.",
    ],
    gabarito: 3,
    comentario:
      "Expressões regionais fazem parte da diversidade linguística brasileira. O contexto informal e compartilhado pelos colegas permite a compreensão sem desvalorizar a fala.",
  },
  {
    area: "humanas",
    disciplina: "Geografia",
    assunto: "Mobilidade urbana",
    texto:
      "Uma pesquisa comunitária fictícia registrou o tempo de viagem até a escola em três bairros.",
    fonte: "Observatório Comunitário de Mobilidade, relatório didático fictício, 2026.",
    tabela: [
      ["Bairro", "Tempo médio"],
      ["A", "20 min"],
      ["B", "45 min"],
      ["C", "70 min"],
    ],
    enunciado: "A diferença entre os tempos sugere a necessidade de",
    alternativas: [
      "fechar escolas próximas.",
      "reduzir o transporte coletivo.",
      "proibir deslocamentos longos.",
      "igualar todos os bairros por decreto.",
      "planejar transporte considerando desigualdades territoriais.",
    ],
    gabarito: 4,
    comentario:
      "O tempo de deslocamento varia conforme a oferta de transporte e a distribuição dos serviços. Planejar a mobilidade com base nessas desigualdades pode ampliar o acesso à educação.",
  },
  {
    area: "humanas",
    disciplina: "História",
    assunto: "Memória e patrimônio",
    texto:
      "Moradores recolhem relatos, fotografias e receitas para organizar um arquivo do bairro, incluindo pessoas antes ausentes dos registros oficiais.",
    fonte: "Projeto fictício Memórias do Nosso Lugar, 2026.",
    enunciado: "Essa iniciativa contribui para",
    alternativas: [
      "ampliar os sujeitos reconhecidos na memória coletiva.",
      "substituir documentos por opiniões sem análise.",
      "apagar a história do bairro.",
      "preservar apenas histórias de autoridades.",
      "impedir novas interpretações.",
    ],
    gabarito: 0,
    comentario:
      "A memória coletiva pode incorporar experiências de diferentes grupos sociais. Relatos e fotografias são fontes que devem ser analisadas e contextualizadas, ampliando a compreensão histórica.",
  },
  {
    area: "humanas",
    disciplina: "Sociologia",
    assunto: "Participação cidadã",
    texto:
      "Em uma assembleia, moradores debatem prioridades e votam propostas para a melhoria de uma praça pública.",
    fonte: "Jornal fictício Voz da Comunidade, 2026.",
    enunciado: "A prática descrita exemplifica",
    alternativas: [
      "consumo individual.",
      "participação democrática nas decisões locais.",
      "ausência de conflitos sociais.",
      "privatização obrigatória.",
      "substituição de todas as instituições.",
    ],
    gabarito: 1,
    comentario:
      "O debate e a votação permitem participação nas decisões de interesse coletivo. A democracia também se exerce em espaços locais, com diálogo e negociação de prioridades.",
  },
  {
    area: "natureza",
    disciplina: "Biologia",
    assunto: "Ecologia",
    texto:
      "Um jardim comunitário passou a ter mais abelhas após o plantio de diferentes espécies de flores nativas.",
    fonte: "Caderno fictício de campo Jardim Vivo, 2026.",
    enunciado: "A presença das abelhas favorece principalmente",
    alternativas: [
      "a erosão do solo.",
      "o consumo de toda a água.",
      "a polinização das plantas.",
      "a eliminação das sementes.",
      "o bloqueio da fotossíntese.",
    ],
    gabarito: 2,
    comentario:
      "Ao visitar flores, as abelhas podem transportar pólen entre elas. Esse processo favorece a reprodução de muitas plantas e a diversidade do jardim.",
  },
  {
    area: "natureza",
    disciplina: "Química",
    assunto: "Separação de misturas",
    texto:
      "Após uma chuva, um recipiente contém água e areia. Um grupo deseja separar a areia sem evaporar a água.",
    fonte: "Roteiro fictício de oficina Ciência no Compaz, 2026.",
    enunciado: "O procedimento mais adequado é",
    alternativas: [
      "dissolver a areia em açúcar.",
      "congelar tudo.",
      "adicionar óleo.",
      "filtrar a mistura.",
      "aquecer até desaparecer.",
    ],
    gabarito: 3,
    comentario:
      "A filtração retém as partículas sólidas de areia e permite a passagem da água. É um método de separação de misturas heterogêneas, não uma garantia de potabilidade.",
  },
  {
    area: "natureza",
    disciplina: "Física",
    assunto: "Energia elétrica",
    texto:
      "Uma lâmpada de 10 W fica ligada por 5 horas. O consumo de energia pode ser calculado multiplicando potência por tempo.",
    fonte: "Guia fictício de uso consciente de energia, 2026.",
    enunciado: "A energia consumida nesse período é",
    alternativas: ["2 Wh.", "5 Wh.", "10 Wh.", "25 Wh.", "50 Wh."],
    gabarito: 4,
    comentario:
      "Multiplicando 10 W por 5 h, obtemos 50 Wh. Potência e energia são grandezas diferentes: a energia depende também do tempo de uso.",
  },
  {
    area: "matematica",
    disciplina: "Matemática",
    assunto: "Interpretação de gráficos",
    texto: "O gráfico apresenta a quantidade de livros emprestados por uma biblioteca comunitária.",
    fonte: "Biblioteca fictícia Pontes de Leitura, 2026.",
    grafico: [
      { rotulo: "jun", valor: 20 },
      { rotulo: "jul", valor: 30 },
      { rotulo: "ago", valor: 40 },
    ],
    enunciado: "De junho a agosto, o número de empréstimos",
    alternativas: [
      "dobrou.",
      "caiu pela metade.",
      "cresceu 10%.",
      "ficou constante.",
      "triplicou.",
    ],
    gabarito: 0,
    comentario:
      "Os empréstimos passaram de 20 para 40. O valor final é duas vezes o inicial, correspondendo a um aumento de 100%.",
  },
  {
    area: "matematica",
    disciplina: "Matemática",
    assunto: "Funções do 1º grau",
    texto: "Uma entrega custa R$ 4,00 de taxa fixa mais R$ 2,00 por quilômetro percorrido.",
    fonte: "Tabela fictícia da cooperativa Entrega do Bairro, 2026.",
    enunciado: "Para uma distância de 3 km, o custo é",
    alternativas: ["R$ 6,00.", "R$ 10,00.", "R$ 12,00.", "R$ 14,00.", "R$ 18,00."],
    gabarito: 1,
    comentario:
      "A expressão do custo é C = 4 + 2d. Para d = 3, temos 4 + 6 = 10 reais; a taxa fixa não depende da distância.",
  },
  {
    area: "matematica",
    disciplina: "Matemática",
    assunto: "Porcentagem",
    texto:
      "Na feira de Casa Amarela, uma cesta custa R$ 40,00. No fim do dia, a feirante oferece desconto de 20%.",
    fonte: "Situação autoral inspirada em feiras do Recife, 2026.",
    enunciado: "Qual é o preço da cesta com desconto?",
    alternativas: ["R$ 8,00.", "R$ 32,00.", "R$ 36,00.", "R$ 38,00.", "R$ 48,00."],
    gabarito: 1,
    comentario:
      "Vinte por cento de 40 reais são 8 reais. O preço final é 40 − 8 = 32 reais; é importante distinguir o desconto do valor que será pago.",
  },
];
export const questoes: Questao[] = brutas.map((q, i) => ({
  ...q,
  id: i + 1,
  habilidade: `H${i + 1}`,
  dificuldade: i % 3 === 0 ? "Média" : "Fácil",
  origem: i === 11 ? "Gerada por IA" : "Autoral",
  status: i === 11 ? "Em revisão" : i === 10 ? "Rascunho" : "Aprovada",
  percentual: i === 11 ? 28 : 40 + i * 3,
}));
export const propostas = [
  { id: "mobilidade", tema: "Desafios para garantir mobilidade urbana inclusiva no Brasil" },
  { id: "leitura", tema: "Caminhos para democratizar o acesso à leitura nas periferias" },
  { id: "cuidado", tema: "A valorização do trabalho de cuidado na sociedade brasileira" },
];
export const redacoesMaria = [
  {
    id: "julho",
    mes: "julho",
    nota: 680,
    tema: propostas[0].tema,
    competencias: [160, 120, 120, 160, 120],
  },
  {
    id: "setembro",
    mes: "setembro",
    nota: 720,
    tema: propostas[1].tema,
    competencias: [160, 160, 120, 160, 120],
  },
];
export const textoRedacao =
  "O acesso à leitura é um direito que amplia a participação social. Entretanto, a distância das bibliotecas e o custo dos livros dificultam esse acesso nas periferias brasileiras.\n\nNesse contexto, os espaços comunitários demonstram a importância de ações locais. Bibliotecas de bairro e rodas de leitura aproximam o conhecimento da vida cotidiana. Porém, essas iniciativas precisam de recursos contínuos, e não apenas de campanhas pontuais.\n\nAlém disso, o poder público deve ampliar os equipamentos culturais. A ausência desses espaços reforça desigualdades e limita as oportunidades dos jovens. É necessário considerar também horários acessíveis e transporte adequado.\n\nPortanto, as prefeituras, em parceria com associações comunitárias, devem financiar bibliotecas e encontros de leitura, por meio de editais permanentes e acompanhamento público. Assim, mais moradores poderão exercer o direito à cultura e construir novos caminhos.";
export const comentariosCompetencias = [
  "Bom domínio da escrita. Revise a pontuação em períodos longos.",
  "Você desenvolve o tema e mantém o texto dissertativo-argumentativo.",
  "Aprofunde os exemplos e conecte as evidências à sua tese.",
  "Os conectivos organizam o texto. Evite repetições entre parágrafos.",
  "A proposta tem agente e ação. Detalhe os meios e o acompanhamento.",
];
