// Regra de correção das questões objetivas. A correção oficial roda no banco
// (função `entregar_tentativa`); esta versão em TypeScript existe para os
// testes das regras de negócio e para a tela de resultado.

export type Alternativa = "A" | "B" | "C" | "D" | "E";

export type QuestaoCorrigivel = {
  id: string;
  gabarito: Alternativa;
  area: "LC" | "CH" | "CN" | "MT";
};

export type Resposta = {
  questaoId: string;
  alternativa: Alternativa | null;
};

export type Placar = {
  total: number;
  acertos: number;
  erros: number;
  emBranco: number;
  // Percentual de acertos sobre o total de questões, arredondado a 1 casa.
  // Não é nota TRI.
  percentual: number;
};

const vazio = (): Placar => ({ total: 0, acertos: 0, erros: 0, emBranco: 0, percentual: 0 });

function fechar(p: Placar): Placar {
  return { ...p, percentual: p.total === 0 ? 0 : Math.round((p.acertos / p.total) * 1000) / 10 };
}

export function corrigir(questoes: QuestaoCorrigivel[], respostas: Resposta[]) {
  const porQuestao = new Map(respostas.map((r) => [r.questaoId, r.alternativa]));
  const geral = vazio();
  const porArea: Partial<Record<QuestaoCorrigivel["area"], Placar>> = {};

  for (const q of questoes) {
    const area = (porArea[q.area] ??= vazio());
    const marcada = porQuestao.get(q.id) ?? null;
    for (const p of [geral, area]) {
      p.total++;
      if (marcada === null) p.emBranco++;
      else if (marcada === q.gabarito) p.acertos++;
      else p.erros++;
    }
  }

  return {
    geral: fechar(geral),
    porArea: Object.fromEntries(
      Object.entries(porArea).map(([k, v]) => [k, fechar(v)]),
    ) as Partial<Record<QuestaoCorrigivel["area"], Placar>>,
  };
}
