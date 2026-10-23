/**
 * Dados de demonstração da área da coordenação.
 * Tudo é determinístico (nada aleatório) e calculado a partir das tabelas abaixo,
 * para os números baterem entre a Visão geral, o Por Compaz e a ficha do estudante.
 */
import { areas, polos } from "./mock";
import { propostas, redacoesMaria } from "./prototipo";
import type { AreaId, Polo } from "./types";
import { AGORA_DEMO } from "./tempo";

/* ---------- Tabela por polo (Bloco 5 da especificação) ---------- */

interface LinhaPolo {
  estudantes: number;
  /** Acessaram nos últimos 30 dias. */
  ativos: number;
  /** Fizeram o 4º Simulado da Rede (oficial). */
  oficial: number;
  iniciados: number;
  concluidos: number;
  /** % médio de acertos (último simulado completo de cada estudante). */
  percentual: number;
  /** Quantos estudantes com status "Precisa de atenção". */
  atencao: number;
  /** Quantos estudantes com status "Sem acessar há 14+ dias" (inclui os inativos há 30+ dias). */
  ausentes: number;
  /** % médio por área, na ordem Linguagens, Humanas, Natureza, Matemática. */
  areas: [number, number, number, number];
  /** % médio nos simulados completos · Dia 2 de fev, abr, jun e ago. */
  evolucao: [number, number, number, number];
}

const tabelaPolos: Record<string, LinhaPolo> = {
  "paulo-freire": {
    estudantes: 42,
    ativos: 36,
    oficial: 33,
    iniciados: 150,
    concluidos: 132,
    percentual: 56,
    atencao: 6,
    ausentes: 7,
    areas: [58, 60, 54, 52],
    evolucao: [41, 47, 52, 56],
  },
  "eduardo-campos": {
    estudantes: 38,
    ativos: 31,
    oficial: 27,
    iniciados: 134,
    concluidos: 110,
    percentual: 50,
    atencao: 5,
    ausentes: 8,
    areas: [53, 54, 44, 49],
    evolucao: [38, 43, 47, 50],
  },
  "ariano-suassuna": {
    estudantes: 41,
    ativos: 35,
    oficial: 32,
    iniciados: 144,
    concluidos: 124,
    percentual: 55,
    atencao: 5,
    ausentes: 7,
    areas: [57, 58, 54, 51],
    evolucao: [40, 46, 51, 55],
  },
  "dom-helder": {
    estudantes: 36,
    ativos: 28,
    oficial: 22,
    iniciados: 120,
    concluidos: 82,
    percentual: 46,
    atencao: 7,
    ausentes: 9,
    areas: [49, 48, 42, 45],
    evolucao: [37, 41, 44, 46],
  },
  "miguel-arraes": {
    estudantes: 44,
    ativos: 38,
    oficial: 35,
    iniciados: 160,
    concluidos: 138,
    percentual: 54,
    atencao: 5,
    ausentes: 7,
    areas: [56, 51, 55, 54],
    evolucao: [39, 45, 50, 54],
  },
  "leda-alves": {
    estudantes: 39,
    ativos: 32,
    oficial: 29,
    iniciados: 138,
    concluidos: 120,
    percentual: 50,
    atencao: 5,
    ausentes: 8,
    areas: [54, 52, 49, 45],
    evolucao: [36, 42, 47, 50],
  },
};

/** % de acertos por assunto em cada polo (ordem das colunas em `ordemTabela`). */
const ordemTabela = [
  "paulo-freire",
  "eduardo-campos",
  "ariano-suassuna",
  "dom-helder",
  "miguel-arraes",
  "leda-alves",
];
const assuntosBase: { assunto: string; area: AreaId; valores: number[] }[] = [
  { assunto: "Porcentagem", area: "matematica", valores: [33, 30, 32, 27, 33, 30] },
  { assunto: "Interpretação de gráficos", area: "matematica", valores: [37, 34, 36, 31, 38, 33] },
  { assunto: "Funções do 1º grau", area: "matematica", valores: [40, 36, 39, 35, 37, 41] },
  { assunto: "Eletricidade", area: "natureza", valores: [42, 38, 37, 36, 41, 39] },
  { assunto: "Estequiometria", area: "natureza", valores: [44, 39, 43, 38, 40, 37] },
  { assunto: "Figuras de linguagem", area: "linguagens", valores: [45, 37, 46, 40, 44, 42] },
  { assunto: "Brasil República", area: "humanas", valores: [47, 42, 44, 39, 39, 45] },
  { assunto: "Ecologia", area: "natureza", valores: [50, 46, 48, 43, 47, 46] },
  { assunto: "Variação linguística", area: "linguagens", valores: [52, 45, 49, 44, 50, 47] },
];

/* ---------- Tipos ---------- */

export type StatusAluno = "Precisa de atenção" | "Sem acessar há 14+ dias" | "Ativo";
/** Ordem padrão das listas de estudantes. */
export const ordemStatus: StatusAluno[] = [
  "Precisa de atenção",
  "Sem acessar há 14+ dias",
  "Ativo",
];

export interface AssuntoPercentual {
  assunto: string;
  area: AreaId;
  percentual: number;
}

export interface DadosPolo extends Polo {
  estudantes: number;
  ativos: number;
  oficial: number;
  iniciados: number;
  concluidos: number;
  percentual: number;
  /** % dos estudantes que fizeram o 4º oficial. */
  participacao: number;
  /** % de simulados concluídos entre os iniciados. */
  conclusao: number;
  /** Contagem de "Precisa de atenção". */
  atencao: number;
  /** Contagem de "Sem acessar há 14+ dias". */
  ausentes: number;
  areas: { area: AreaId; valor: number }[];
  /** % médio nos completos · Dia 2 de fev, abr, jun e ago. */
  evolucao: number[];
  /** Todos os assuntos acompanhados, do menor % para o maior. */
  assuntos: AssuntoPercentual[];
  /** Os 5 assuntos com menor % de acertos, do menor para o maior. */
  dificuldades: AssuntoPercentual[];
}

const pct = (parte: number, todo: number) => (todo ? Math.round((parte / todo) * 100) : 0);
const porMenorPercentual = (a: AssuntoPercentual, b: AssuntoPercentual) =>
  a.percentual - b.percentual || a.assunto.localeCompare(b.assunto, "pt-BR");

/** Os 6 polos, em ordem alfabética do nome curto. */
export const dadosPolos: DadosPolo[] = polos
  .map((p) => {
    const t = tabelaPolos[p.id];
    const coluna = ordemTabela.indexOf(p.id);
    const assuntos = assuntosBase
      .map((a) => ({ assunto: a.assunto, area: a.area, percentual: a.valores[coluna] }))
      .sort(porMenorPercentual);
    return {
      ...p,
      estudantes: t.estudantes,
      ativos: t.ativos,
      oficial: t.oficial,
      iniciados: t.iniciados,
      concluidos: t.concluidos,
      percentual: t.percentual,
      participacao: pct(t.oficial, t.estudantes),
      conclusao: pct(t.concluidos, t.iniciados),
      atencao: t.atencao,
      ausentes: t.ausentes,
      areas: areas.map((a, i) => ({ area: a.id, valor: t.areas[i] })),
      evolucao: [...t.evolucao],
      assuntos,
      dificuldades: assuntos.slice(0, 5),
    };
  })
  .sort((a, b) => a.nomeCurto.localeCompare(b.nomeCurto, "pt-BR"));

export function buscarPolo(id: string): DadosPolo | undefined {
  return dadosPolos.find((p) => p.id === id);
}

/* ---------- Estudantes da Rede (240) ---------- */

export interface Aluno {
  id: string;
  nome: string;
  iniciais: string;
  poloId: string;
  dataNascimento: string; // AAAA-MM-DD
  /** % de acertos no último simulado completo. */
  percentual: number;
  /** % no completo anterior (igual ao atual quando só há um). */
  anterior: number;
  /** Diferença em p.p. entre os dois últimos completos; null quando só há um completo. */
  tendencia: number | null;
  /** % nos simulados completos · Dia 2, em ordem (1 a 4 pontos). */
  evolucao: number[];
  ultimoSimulado: string;
  /** Dias desde o último acesso (contados a partir de AGORA_DEMO). */
  dias: number;
  ultimoAcesso: string; // AAAA-MM-DD
  ativo30: boolean;
  /** Fez o 4º Simulado da Rede (oficial). */
  oficial: boolean;
  status: StatusAluno;
  /** Simulados concluídos. */
  simulados: number;
  /** Simulados iniciados (inclui os em andamento). */
  iniciados: number;
  redacoes: number;
}

const nomes = [
  "Ana Beatriz",
  "João Victor",
  "Luana",
  "Pedro Henrique",
  "Camila",
  "José",
  "Beatriz",
  "Lucas",
  "Vitória",
  "Gabriel",
  "Raquel",
  "Davi",
  "Larissa",
  "André",
  "Júlia",
  "Rafael",
  "Letícia",
  "Caio",
  "Yasmin",
  "Bruno",
  "Maria Eduarda",
  "Wellington",
  "Thaís",
  "Matheus",
  "Ingrid",
  "Kauã",
  "Rayssa",
  "Igor",
  "Jéssica",
  "Emerson",
  "Natália",
  "Diego",
  "Fernanda",
  "Ítalo",
  "Bianca",
  "Wesley",
  "Sabrina",
  "Marcos",
  "Tainá",
  "Renan",
];
const sobrenomes = [
  "Santos",
  "Oliveira",
  "Nascimento",
  "Lima",
  "Souza",
  "Costa",
  "Ferreira",
  "Almeida",
  "Barbosa",
  "Moura",
  "Cavalcanti",
  "Pereira",
  "Albuquerque",
  "Araújo",
  "Gomes",
  "Silva",
  "Melo",
  "Batista",
  "Rodrigues",
  "Vasconcelos",
];

/** Divide `total` em inteiros proporcionais aos pesos (maiores restos), somando exatamente `total`. */
function distribuir(total: number, pesos: number[]): number[] {
  const soma = pesos.reduce((a, b) => a + b, 0);
  const brutos = pesos.map((p) => (soma ? (p * total) / soma : 0));
  const base = brutos.map(Math.floor);
  let resto = total - base.reduce((a, b) => a + b, 0);
  const ordem = brutos
    .map((b, i) => ({ i, fracao: b - Math.floor(b) }))
    .filter((x) => pesos[x.i] > 0)
    .sort((a, b) => b.fracao - a.fracao || a.i - b.i);
  for (let k = 0; resto > 0; k++, resto--) base[ordem[k % ordem.length].i]++;
  return base;
}

const iniciaisDe = (nome: string) => {
  const partes = nome.split(" ");
  return `${partes[0][0]}${partes[partes.length - 1][0]}`;
};

const dataIso = (diasAtras: number) =>
  new Date(AGORA_DEMO.getTime() - diasAtras * 86400000).toISOString().slice(0, 10);

/**
 * O simulado completo tem 90 questões, e nenhum número de acertos dá 5%, 15%, 25% … 95%.
 * Leva o % ao valor possível mais próximo (55 → 56), para acertos e % baterem na ficha.
 */
const alcancavel = (p: number) => Math.round(Math.round(p * 0.9) / 0.9);

type Categoria = "atencao" | "recente" | "inativo" | "ativo";
const MARIA_ID = "maria-silva";
const OFFSETS = [-12, -8, -5, -3, -1, 0, 2, 4, 6, 9, 12, 15];
const TENDENCIAS = [3, 1, -2, 6, 0, 9, -3, 4, 2, -1, 5, 7];
/** Redações enviadas por estudantes da Rede (as outras 56 são de externos: 214 no total). */
const REDACOES_REDE = 158;
/** Pesos da divisão das redações, alternados por estudante (os ativos escrevem mais). */
const PESOS_REDACAO_ATIVOS = [0, 1, 2, 4, 9];
const PESOS_REDACAO_OUTROS = [0, 1, 0, 2, 0];
/** Simulados de Maria: 4 completos · Dia 2 e 3 rápidos concluídos, mais o Rápido 30 em andamento. */
const SIMULADOS_MARIA = 7;

/**
 * Gera os 240 estudantes da Rede. Dentro de cada polo, as posições definem a categoria:
 * primeiro os que precisam de atenção, depois os sem acessar há 14 a 29 dias, depois os
 * inativos há 30+ dias e, por fim, os ativos. Assim as contagens batem com a tabela.
 */
export function gerarEstudantes(): Aluno[] {
  let global = 0;
  const lista: Aluno[] = [];
  for (const polo of polos) {
    const t = tabelaPolos[polo.id];
    const inativos = t.estudantes - t.ativos;
    const recentes = t.ausentes - inativos;
    const inicioAtivos = t.atencao + recentes + inativos;
    const temMaria = polo.id === "paulo-freire";
    const ehMaria = (i: number) => temMaria && i === inicioAtivos;

    const categorias: Categoria[] = Array.from({ length: t.estudantes }, (_, i) =>
      i < t.atencao
        ? "atencao"
        : i < t.atencao + recentes
          ? "recente"
          : i < inicioAtivos
            ? "inativo"
            : "ativo",
    );

    // Quem NÃO fez o 4º oficial: inativos, depois recentes, depois os últimos ativos.
    const indicesDe = (c: Categoria) =>
      categorias.map((x, i) => (x === c && !ehMaria(i) ? i : -1)).filter((i) => i >= 0);
    const naoFizeram = new Set(
      [
        ...indicesDe("inativo"),
        ...indicesDe("recente"),
        ...indicesDe("ativo").reverse(),
        ...indicesDe("atencao"),
      ].slice(0, t.estudantes - t.oficial),
    );

    // Completos · Dia 2 feitos por cada um (1 a 4).
    const completos = categorias.map((c, i) => {
      const g = global + i;
      if (ehMaria(i)) return 4;
      if (!naoFizeram.has(i)) return Math.min(4, 2 + (g % 2) + (g % 5 === 0 ? 1 : 0));
      return c === "inativo" && g % 2 === 0 ? 1 : 2;
    });
    // Ninguém pode ter mais completos do que simulados concluídos: corta dos maiores até caber.
    const limite = t.concluidos - (temMaria ? SIMULADOS_MARIA - 4 : 0);
    while (completos.reduce((a, b) => a + b, 0) > limite) {
      const maior = completos.reduce(
        (m, n, i) => (!ehMaria(i) && n > (m < 0 ? 0 : completos[m]) ? i : m),
        -1,
      );
      completos[maior]--;
    }

    // Percentuais: atenção abaixo de 35% ou com queda de 5 p.p.; os outros em torno do polo.
    // Todos são % possíveis com 90 questões.
    const percentuais = categorias.map((c, i) => {
      const g = global + i;
      if (ehMaria(i)) return 67;
      if (c === "atencao")
        return alcancavel(i % 2 === 0 ? 28 + ((i * 3) % 7) : t.percentual - 8 + (i % 5));
      return alcancavel(Math.max(36, t.percentual + OFFSETS[g % OFFSETS.length]));
    });
    const tendencias = categorias.map((c, i) => {
      const g = global + i;
      if (ehMaria(i)) return 9;
      if (completos[i] < 2) return null;
      if (c === "atencao") return i % 2 === 0 ? -2 + (i % 3) : -5 - (i % 4);
      return TENDENCIAS[g % TENDENCIAS.length];
    });

    // Ajusta para a média do polo bater exatamente com a tabela, sem criar % impossível.
    let diferenca = t.percentual * t.estudantes - percentuais.reduce((a, b) => a + b, 0);
    const ajustaveis = categorias
      .map((c, i) => (c !== "atencao" && !ehMaria(i) ? i : -1))
      .filter((i) => i >= 0);
    for (let k = 0; diferenca !== 0; k++) {
      const i = ajustaveis[k % ajustaveis.length];
      const passo = diferenca > 0 ? 1 : -1;
      const novo = percentuais[i] + passo;
      if (novo >= 36 && novo <= 92 && novo === alcancavel(novo)) {
        percentuais[i] = novo;
        diferenca -= passo;
      }
    }

    // Simulados concluídos e iniciados: somam exatamente os totais do polo.
    const pesos = categorias.map((c, i) =>
      ehMaria(i) ? 0 : c === "ativo" ? 3 : c === "atencao" ? 2 : c === "recente" ? 1.5 : 1,
    );
    const minimos = completos.map((n, i) => (ehMaria(i) ? 0 : n));
    const extras = distribuir(
      t.concluidos - (temMaria ? SIMULADOS_MARIA : 0) - minimos.reduce((a, b) => a + b, 0),
      pesos,
    );
    const abandonos = distribuir(t.iniciados - t.concluidos - (temMaria ? 1 : 0), pesos);

    categorias.forEach((c, i) => {
      const g = global + i;
      const maria = ehMaria(i);
      const nome = maria
        ? "Maria Silva"
        : `${nomes[g % nomes.length]} ${sobrenomes[(g + Math.floor(g / nomes.length) * 7) % sobrenomes.length]}`;
      const percentual = percentuais[i];
      // A tendência sai dos % já possíveis com 90 questões (pode variar 1 p.p. da planejada).
      const planejada = tendencias[i];
      const anterior = planejada === null ? percentual : alcancavel(percentual - planejada);
      const tendencia = planejada === null ? null : percentual - anterior;
      const evolucao = maria
        ? [42, 51, 58, 67]
        : [anterior - 7, anterior - 4, anterior, percentual]
            .slice(4 - completos[i])
            .map((v) => alcancavel(Math.max(15, v)));
      const fezOficial = !naoFizeram.has(i);
      const dias = maria
        ? 0
        : c === "recente"
          ? 14 + (g % 10)
          : c === "inativo"
            ? 31 + (g % 20)
            : g % 10;
      const simulados = maria ? SIMULADOS_MARIA : minimos[i] + extras[i];
      lista.push({
        id: maria ? MARIA_ID : `${polo.id}-${i + 1}`,
        nome,
        iniciais: iniciaisDe(nome),
        poloId: polo.id,
        dataNascimento: maria
          ? "2007-05-12"
          : `${2002 + ((g * 7) % 8)}-${String(1 + ((g * 5) % 12)).padStart(2, "0")}-${String(1 + ((g * 11) % 28)).padStart(2, "0")}`,
        percentual,
        anterior,
        tendencia,
        evolucao,
        ultimoSimulado: fezOficial
          ? "4º Simulado da Rede · Dia 2"
          : completos[i] >= 2
            ? "3º Simulado da Rede · Dia 2"
            : "2º Simulado da Rede · Dia 2",
        dias,
        ultimoAcesso: dataIso(dias),
        ativo30: c !== "inativo",
        oficial: fezOficial,
        status:
          c === "atencao"
            ? "Precisa de atenção"
            : c === "ativo"
              ? "Ativo"
              : "Sem acessar há 14+ dias",
        simulados,
        iniciados: simulados + (maria ? 1 : abandonos[i]),
        redacoes: 0,
      });
    });
    global += t.estudantes;
  }

  // Redações da Rede: Maria tem as dela; o resto se divide com pesos que variam de estudante
  // para estudante (de 0 a 3 redações cada), com mais peso para os ativos.
  const pesosRedacao = lista.map((a, g) => {
    if (a.id === MARIA_ID) return 0;
    const pesos = a.status === "Ativo" ? PESOS_REDACAO_ATIVOS : PESOS_REDACAO_OUTROS;
    return pesos[(g * 3) % pesos.length];
  });
  const redacoes = distribuir(REDACOES_REDE - redacoesMaria.length, pesosRedacao);
  lista.forEach((a, i) => {
    a.redacoes = a.id === MARIA_ID ? redacoesMaria.length : redacoes[i];
  });
  return lista;
}

export const alunos = gerarEstudantes();

export function buscarAluno(id: string): Aluno | undefined {
  return alunos.find((a) => a.id === id);
}

/** Estudantes do polo na ordem padrão: Precisa de atenção → Sem acessar → Ativo, depois nome. */
export function alunosDoPolo(poloId: string): Aluno[] {
  return alunos
    .filter((a) => a.poloId === poloId)
    .sort(
      (a, b) =>
        ordemStatus.indexOf(a.status) - ordemStatus.indexOf(b.status) ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    );
}

export function contarStatus(lista: Aluno[]): Record<StatusAluno, number> {
  const contagem: Record<StatusAluno, number> = {
    "Precisa de atenção": 0,
    "Sem acessar há 14+ dias": 0,
    Ativo: 0,
  };
  for (const a of lista) contagem[a.status]++;
  return contagem;
}

/* ---------- Externos, Rede e plataforma ---------- */

/** Estudantes de outros cursinhos e independentes (fora da Rede, sempre à parte). */
export const externos = {
  cursinhos: 58,
  independentes: 27,
  estudantes: 85,
  ativos: 61,
  iniciados: 282,
  concluidos: 236,
  conclusao: pct(236, 282),
  percentual: 53,
  evolucao: [45, 48, 50, 53],
  redacoes: 56,
  revisadas: 25,
};

const somaPolos = (campo: (p: DadosPolo) => number) => dadosPolos.reduce((a, p) => a + campo(p), 0);
const estudantesRede = somaPolos((p) => p.estudantes);
/** Média ponderada pelo número de estudantes de cada polo. */
const mediaRede = (campo: (p: DadosPolo) => number) =>
  Math.round(somaPolos((p) => campo(p) * p.estudantes) / estudantesRede);

/** Soma dos 6 polos. */
export const totaisRede = {
  estudantes: estudantesRede,
  ativos: somaPolos((p) => p.ativos),
  oficial: somaPolos((p) => p.oficial),
  iniciados: somaPolos((p) => p.iniciados),
  concluidos: somaPolos((p) => p.concluidos),
  percentual: mediaRede((p) => p.percentual),
  participacao: pct(
    somaPolos((p) => p.oficial),
    estudantesRede,
  ),
  conclusao: pct(
    somaPolos((p) => p.concluidos),
    somaPolos((p) => p.iniciados),
  ),
  atencao: somaPolos((p) => p.atencao),
  ausentes: somaPolos((p) => p.ausentes),
  redacoes: alunos.reduce((a, x) => a + x.redacoes, 0),
  revisadas: 71,
};

/** % médio da Rede nos completos · Dia 2 (fev, abr, jun, ago). */
export const evolucaoRede = [0, 1, 2, 3].map((i) => mediaRede((p) => p.evolucao[i]));

/** % médio da Rede por área. */
export const areasRede: { area: AreaId; valor: number }[] = areas.map((a, i) => ({
  area: a.id,
  valor: mediaRede((p) => p.areas[i].valor),
}));

/** Assuntos da Rede, do menor % de acertos para o maior. */
export const dificuldadesRede: AssuntoPercentual[] = assuntosBase
  .map((a) => ({
    assunto: a.assunto,
    area: a.area,
    percentual: mediaRede((p) => p.assuntos.find((x) => x.assunto === a.assunto)?.percentual ?? 0),
  }))
  .sort(porMenorPercentual);

/** Plataforma inteira: Rede + outros cursinhos + independentes. */
export const totais = {
  estudantes: totaisRede.estudantes + externos.estudantes,
  ativos: totaisRede.ativos + externos.ativos,
  iniciados: totaisRede.iniciados + externos.iniciados,
  concluidos: totaisRede.concluidos + externos.concluidos,
  conclusao: pct(
    totaisRede.concluidos + externos.concluidos,
    totaisRede.iniciados + externos.iniciados,
  ),
  percentual: Math.round(
    (totaisRede.percentual * totaisRede.estudantes + externos.percentual * externos.estudantes) /
      (totaisRede.estudantes + externos.estudantes),
  ),
  redacoes: totaisRede.redacoes + externos.redacoes,
  revisadas: totaisRede.revisadas + externos.revisadas,
};

/* ---------- Papéis da coordenação ---------- */

/** Polo acompanhado pelo papel "Coordenação do Compaz Paulo Freire". */
export const POLO_DA_COORDENACAO = "paulo-freire";

export const perfisCoordenacao = {
  central: { nome: "Renata Moura", iniciais: "RM", cargo: "Coordenação central" },
  polo: {
    nome: "Carlos Albuquerque",
    iniciais: "CA",
    cargo: "Coordenação · Compaz Paulo Freire",
  },
};

/* ---------- Fila de redações para revisão humana ---------- */

export type StatusRedacao = "Aguardando revisão" | "Revisada";

export interface RedacaoFila {
  id: string;
  aluno: Aluno;
  tema: string;
  /** Nota estimada pela IA (0 a 1000). */
  nota: number;
  /** Nota estimada por competência (C1 a C5, 0 a 200). */
  competencias: number[];
  data: string; // DD/MM/AAAA
  status: StatusRedacao;
}

const competenciasDe = (nota: number) => {
  const blocos = nota / 40;
  return [0, 1, 2, 3, 4].map((i) => (Math.floor(blocos / 5) + (i < blocos % 5 ? 1 : 0)) * 40);
};

const notasFila = [640, 600, 680, 560, 700, 620, 660, 580, 740, 600, 640];

/** AAAA-MM-DD → DD/MM/AAAA. */
export const dataBr = (iso: string) => iso.split("-").reverse().join("/");

/** Na amostra, as redações enviadas há mais de 5 dias já passaram por um professor. */
const DIAS_PARA_REVISAR = 5;

/**
 * Amostra da fila: duas redações por polo (uma no Paulo Freire), mais a de setembro de Maria.
 * Cada redação foi enviada no último acesso do estudante, para bater com o status dele
 * em Por Compaz (ninguém "sem acessar há 14+ dias" aparece com redação enviada ontem).
 */
export const filaRedacoes: RedacaoFila[] = dadosPolos
  .flatMap((p) =>
    alunos
      .filter((a) => a.poloId === p.id && a.redacoes > 0 && a.id !== MARIA_ID && a.dias <= 12)
      .slice(0, p.id === POLO_DA_COORDENACAO ? 1 : 2),
  )
  .map((aluno, i): RedacaoFila => ({
    id: `redacao-${i + 1}`,
    aluno,
    tema: propostas[i % propostas.length].tema,
    nota: notasFila[i],
    competencias: competenciasDe(notasFila[i]),
    data: dataBr(aluno.ultimoAcesso),
    status: aluno.dias > DIAS_PARA_REVISAR ? "Revisada" : "Aguardando revisão",
  }))
  .concat({
    id: "redacao-maria-setembro",
    aluno: alunos.find((a) => a.id === MARIA_ID) as Aluno,
    tema: redacoesMaria[1].tema,
    nota: redacoesMaria[1].nota,
    competencias: [...redacoesMaria[1].competencias],
    data: "28/09/2026",
    status: "Revisada",
  });
