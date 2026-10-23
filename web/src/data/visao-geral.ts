/**
 * Números da Visão geral da coordenação (/admin).
 * Tudo é calculado a partir de `coordenacao.ts` (polos, estudantes gerados, externos),
 * nada escrito à mão: se a tabela dos polos mudar, a tela acompanha.
 */
import {
  alunos,
  alunosDoPolo,
  contarStatus,
  dadosPolos,
  dificuldadesRede,
  evolucaoRede,
  externos,
  totais,
  totaisRede,
  type AssuntoPercentual,
  type DadosPolo,
} from "./coordenacao";

const pct = (parte: number, todo: number) => (todo ? Math.round((parte / todo) * 100) : 0);

/* ---------- Regras dos pontos de atenção ---------- */

/** Polo entra quando a fatia de "sem acessar" fica 5 p.p. ou mais acima da Rede. */
export const LIMITE_AUSENTES_PP = 5;
/** ...ou quando a participação no 4º oficial fica 10 p.p. ou mais abaixo da Rede. */
export const LIMITE_PARTICIPACAO_PP = 10;
/** Quantos assuntos com menos acertos aparecem no ponto de atenção de conteúdo. */
export const ASSUNTOS_EM_DESTAQUE = 3;
/** A fila de redações vira ponto de atenção quando menos da metade foi revisada. */
export const LIMITE_REVISADAS = 50;

/* ---------- Composição dos cadastros ---------- */

export interface ParteCadastro {
  id: "rede" | "cursinhos" | "independentes";
  rotulo: string;
  valor: number;
}

/** Quem são os cadastrados: Rede, outros cursinhos e independentes (soma = total). */
export const composicaoCadastro: ParteCadastro[] = [
  { id: "rede", rotulo: "Rede", valor: totaisRede.estudantes },
  { id: "cursinhos", rotulo: "Outros cursinhos", valor: externos.cursinhos },
  { id: "independentes", rotulo: "Independentes", valor: externos.independentes },
];

/* ---------- Indicadores ---------- */

export const indicadores = {
  cadastrados: totais.estudantes,
  ativos: totais.ativos,
  ativosPercentual: pct(totais.ativos, totais.estudantes),
  ativosRede: totaisRede.ativos,
  ativosExternos: externos.ativos,
  iniciados: totais.iniciados,
  iniciadosRede: totaisRede.iniciados,
  iniciadosExternos: externos.iniciados,
  concluidos: totais.concluidos,
  conclusao: totais.conclusao,
  percentual: totais.percentual,
  percentualRede: totaisRede.percentual,
  percentualExternos: externos.percentual,
  redacoes: totais.redacoes,
  redacoesRede: totaisRede.redacoes,
  redacoesExternos: externos.redacoes,
  revisadas: totais.revisadas,
  revisadasPercentual: pct(totais.revisadas, totais.redacoes),
  oficial: totaisRede.oficial,
  estudantesRede: totaisRede.estudantes,
  participacao: totaisRede.participacao,
};

/* ---------- Evolução Rede × Externos ---------- */

export interface SerieEvolucao {
  rotulo: string;
  valores: number[];
  inicio: number;
  fim: number;
  /** Diferença em p.p. entre a 1ª e a última aplicação. */
  variacao: number;
}

const serie = (rotulo: string, valores: number[]): SerieEvolucao => ({
  rotulo,
  valores,
  inicio: valores[0],
  fim: valores[valores.length - 1],
  variacao: valores[valores.length - 1] - valores[0],
});

export const MESES_EVOLUCAO = ["fev", "abr", "jun", "ago"];
export const MESES_EVOLUCAO_EXTENSO = ["fevereiro", "abril", "junho", "agosto"];
export const evolucaoRedeSerie = serie("Rede", evolucaoRede);
export const evolucaoExternosSerie = serie("Externos", externos.evolucao);

/* ---------- Tabela-resumo dos polos ---------- */

export interface LinhaResumoPolo {
  polo: DadosPolo;
  /** Contados na lista de estudantes gerada. */
  atencao: number;
  ausentes: number;
}

/** Os 6 polos em ordem alfabética, com as contagens de status vindas dos estudantes. */
export const resumoPolos: LinhaResumoPolo[] = dadosPolos.map((polo) => {
  const status = contarStatus(alunosDoPolo(polo.id));
  return {
    polo,
    atencao: status["Precisa de atenção"],
    ausentes: status["Sem acessar há 14+ dias"],
  };
});

export interface LinhaTotal {
  id: "rede" | "externos" | "plataforma";
  rotulo: string;
  detalhe?: string;
  estudantes: number;
  ativos: number;
  /** null quando não se aplica (externos não fazem os oficiais da Rede). */
  oficial: number | null;
  participacao: number | null;
  iniciados: number;
  concluidos: number;
  conclusao: number;
  percentual: number;
  atencao: number | null;
}

const statusRede = contarStatus(alunos);

/** Linhas de total da tabela: Rede (soma dos polos), externos à parte e plataforma. */
export const linhasTotais: LinhaTotal[] = [
  {
    id: "rede",
    rotulo: "Rede",
    detalhe: `${dadosPolos.length} polos`,
    estudantes: totaisRede.estudantes,
    ativos: totaisRede.ativos,
    oficial: totaisRede.oficial,
    participacao: totaisRede.participacao,
    iniciados: totaisRede.iniciados,
    concluidos: totaisRede.concluidos,
    conclusao: totaisRede.conclusao,
    percentual: totaisRede.percentual,
    atencao: statusRede["Precisa de atenção"],
  },
  {
    id: "externos",
    rotulo: "Externos",
    detalhe: `Outros cursinhos ${externos.cursinhos} · independentes ${externos.independentes}`,
    estudantes: externos.estudantes,
    ativos: externos.ativos,
    oficial: null,
    participacao: null,
    iniciados: externos.iniciados,
    concluidos: externos.concluidos,
    conclusao: externos.conclusao,
    percentual: externos.percentual,
    atencao: null,
  },
  {
    id: "plataforma",
    rotulo: "Plataforma",
    detalhe: "Rede + externos",
    estudantes: totais.estudantes,
    ativos: totais.ativos,
    oficial: null,
    participacao: null,
    iniciados: totais.iniciados,
    concluidos: totais.concluidos,
    conclusao: totais.conclusao,
    percentual: totais.percentual,
    atencao: null,
  },
];

/* ---------- Pontos de atenção ---------- */

export type PontoDeAtencao =
  | {
      tipo: "polo";
      polo: DadosPolo;
      ausentes: number;
      ausentesPercentual: number;
      participacao: number;
    }
  | { tipo: "estudantes"; quantidade: number; polos: number }
  | {
      tipo: "assunto";
      principal: AssuntoPercentual;
      seguintes: AssuntoPercentual[];
      /** Preenchido quando todos os assuntos em destaque são da mesma área. */
      mesmaArea: AssuntoPercentual["area"] | null;
    }
  | { tipo: "redacoes"; aguardando: number; enviadas: number; revisadas: number };

const ausentesRedePercentual =
  (statusRede["Sem acessar há 14+ dias"] / totaisRede.estudantes) * 100;

function calcularPontos(): PontoDeAtencao[] {
  const pontos: PontoDeAtencao[] = [];

  // Polos com mais estudantes afastados ou participação bem abaixo da Rede.
  for (const { polo, ausentes } of resumoPolos) {
    const ausentesPercentual = (ausentes / polo.estudantes) * 100;
    const afastados = ausentesPercentual - ausentesRedePercentual >= LIMITE_AUSENTES_PP;
    const poucaParticipacao = totaisRede.participacao - polo.participacao >= LIMITE_PARTICIPACAO_PP;
    if (afastados || poucaParticipacao)
      pontos.push({
        tipo: "polo",
        polo,
        ausentes,
        ausentesPercentual: Math.round(ausentesPercentual),
        participacao: polo.participacao,
      });
  }

  // Estudantes que precisam de atenção em toda a Rede.
  const quantidade = statusRede["Precisa de atenção"];
  if (quantidade > 0)
    pontos.push({
      tipo: "estudantes",
      quantidade,
      polos: resumoPolos.filter((l) => l.atencao > 0).length,
    });

  // Assuntos com menos acertos na Rede.
  const [principal, ...seguintes] = dificuldadesRede.slice(0, ASSUNTOS_EM_DESTAQUE);
  if (principal) {
    const mesmaArea = seguintes.every((a) => a.area === principal.area) ? principal.area : null;
    pontos.push({ tipo: "assunto", principal, seguintes, mesmaArea });
  }

  // Fila de revisão humana das redações.
  if (pct(totais.revisadas, totais.redacoes) < LIMITE_REVISADAS)
    pontos.push({
      tipo: "redacoes",
      aguardando: totais.redacoes - totais.revisadas,
      enviadas: totais.redacoes,
      revisadas: totais.revisadas,
    });

  return pontos;
}

export const pontosDeAtencao = calcularPontos();

/** Valores da Rede usados como referência nos textos. */
export const referenciaRede = {
  participacao: totaisRede.participacao,
  ausentesPercentual: Math.round(ausentesRedePercentual),
};
