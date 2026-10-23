import type {
  Area,
  Estudante,
  Faq,
  Modalidade,
  Passo,
  Polo,
  ResultadoArea,
  ResumoPolo,
} from "./types";

export const areas: Area[] = [
  { id: "linguagens", nome: "Linguagens", nomeCurto: "Linguagens", questoes: 45 },
  { id: "humanas", nome: "Ciências Humanas", nomeCurto: "Humanas", questoes: 45 },
  { id: "natureza", nome: "Ciências da Natureza", nomeCurto: "Natureza", questoes: 45 },
  { id: "matematica", nome: "Matemática", nomeCurto: "Matemática", questoes: 45 },
];

export const polos: Polo[] = [
  { id: "paulo-freire", nomeCurto: "Paulo Freire", nome: "Compaz Paulo Freire", bairro: "Ibura" },
  {
    id: "eduardo-campos",
    nomeCurto: "Eduardo Campos",
    nome: "Compaz Governador Eduardo Campos",
    bairro: "Alto Santa Terezinha",
  },
  {
    id: "ariano-suassuna",
    nomeCurto: "Ariano Suassuna",
    nome: "Compaz Escritor Ariano Suassuna",
    bairro: "Cordeiro",
  },
  { id: "dom-helder", nomeCurto: "Dom Helder", nome: "Compaz Dom Helder Câmara", bairro: "Coque" },
  {
    id: "miguel-arraes",
    nomeCurto: "Miguel Arraes",
    nome: "Compaz Miguel Arraes",
    bairro: "Caxangá",
  },
  { id: "leda-alves", nomeCurto: "Lêda Alves", nome: "Compaz Lêda Alves", bairro: "Pina" },
];

export const passos: Passo[] = [
  {
    titulo: "Crie sua conta",
    texto: "Leva um minuto. Entre com o Google ou com seu e-mail. É de graça e sempre vai ser.",
  },
  {
    titulo: "Faça o simulado no celular",
    texto: "Uma questão por vez, letra grande, no seu ritmo.",
    itens: [
      "Cronômetro do tempo de prova",
      "Marcar questão para revisar",
      "Salvamento automático",
      "A internet caiu? Nada se perde",
    ],
  },
  {
    titulo: "Veja onde evoluir",
    texto: "Seu resultado mostra o caminho, não só o número.",
    itens: [
      "Acertos, erros e em branco por área e assunto",
      "Gabarito comentado",
      "Seu próximo passo de estudo",
    ],
  },
];

export const modalidades: Modalidade[] = [
  {
    titulo: "Simulado rápido",
    descricao: "20 ou 30 questões misturadas, para treinar no ônibus ou no intervalo.",
  },
  { titulo: "Por área", descricao: "Foque só em Matemática, Linguagens, Humanas ou Natureza." },
  {
    titulo: "Treino de redação",
    descricao: "Tema do ENEM, tempo de prova e orientação por competência.",
    emBreve: true,
  },
];

export const competenciasRedacao = [
  "Domínio da norma padrão da língua escrita",
  "Compreensão da proposta e do tipo textual",
  "Seleção e organização de argumentos",
  "Uso dos mecanismos de coesão",
  "Proposta de intervenção com respeito aos direitos humanos",
];

export const faqs: Faq[] = [
  {
    pergunta: "É grátis mesmo?",
    resposta:
      "Sim. O Simula Alcides é gratuito para qualquer estudante, sem pegadinha, sem plano pago escondido.",
  },
  {
    pergunta: "Preciso ser da Rede Alcides Nascimento?",
    resposta:
      "Não. Estudantes de outros cursinhos e quem estuda por conta própria usam a plataforma do mesmo jeito.",
  },
  {
    pergunta: "Funciona no celular?",
    resposta:
      "Foi pensado primeiro para o celular. Funciona bem mesmo em aparelhos simples e com internet fraca.",
  },
  {
    pergunta: "E se a internet cair no meio da prova?",
    resposta:
      "Suas respostas ficam guardadas no aparelho e são enviadas quando a conexão voltar. Você continua de onde parou.",
  },
];

const estudanteAntigo: Estudante = {
  nome: "Maria Eduarda",
  email: "maria.eduarda@email.com",
  dataNascimento: "2009-03-14",
};

const resultadoAntigo: ResultadoArea[] = [
  { area: "linguagens", acertos: 31, erros: 10, brancos: 4 },
  { area: "humanas", acertos: 28, erros: 14, brancos: 3 },
  { area: "natureza", acertos: 19, erros: 22, brancos: 4 },
  { area: "matematica", acertos: 17, erros: 21, brancos: 7 },
];

export const resumoPolosMock: ResumoPolo[] = [
  {
    poloId: "paulo-freire",
    estudantes: 42,
    simuladosFeitos: 132,
    percentualAcerto: 56,
    areaReforco: "matematica",
  },
  {
    poloId: "eduardo-campos",
    estudantes: 38,
    simuladosFeitos: 110,
    percentualAcerto: 50,
    areaReforco: "natureza",
  },
  {
    poloId: "ariano-suassuna",
    estudantes: 41,
    simuladosFeitos: 124,
    percentualAcerto: 55,
    areaReforco: "matematica",
  },
  {
    poloId: "dom-helder",
    estudantes: 36,
    simuladosFeitos: 82,
    percentualAcerto: 46,
    areaReforco: "natureza",
  },
  {
    poloId: "miguel-arraes",
    estudantes: 44,
    simuladosFeitos: 138,
    percentualAcerto: 54,
    areaReforco: "humanas",
  },
  {
    poloId: "leda-alves",
    estudantes: 39,
    simuladosFeitos: 120,
    percentualAcerto: 50,
    areaReforco: "matematica",
  },
];

export const questaoExemplo = {
  numero: 47,
  total: 90,
  area: "matematica" as const,
  enunciado:
    "Uma feira no Recife vende 3 macaxeiras por R$ 7,50. Mantendo o mesmo preço por unidade, quanto custam 8 macaxeiras?",
  alternativas: ["R$ 15,00", "R$ 18,00", "R$ 20,00", "R$ 22,50", "R$ 24,00"],
  marcada: 2,
};

export * from "./prototipo";
