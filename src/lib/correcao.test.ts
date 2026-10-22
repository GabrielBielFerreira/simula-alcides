import { describe, expect, it } from "vitest";
import { corrigir, type QuestaoCorrigivel } from "./correcao";

const questoes: QuestaoCorrigivel[] = [
  { id: "q1", gabarito: "A", area: "MT" },
  { id: "q2", gabarito: "B", area: "MT" },
  { id: "q3", gabarito: "C", area: "LC" },
  { id: "q4", gabarito: "D", area: "LC" },
];

describe("corrigir", () => {
  it("separa acertos, erros e questões em branco", () => {
    const { geral } = corrigir(questoes, [
      { questaoId: "q1", alternativa: "A" },
      { questaoId: "q2", alternativa: "C" },
      { questaoId: "q3", alternativa: null },
    ]);
    expect(geral).toEqual({ total: 4, acertos: 1, erros: 1, emBranco: 2, percentual: 25 });
  });

  it("calcula o placar por área", () => {
    const { porArea } = corrigir(questoes, [
      { questaoId: "q1", alternativa: "A" },
      { questaoId: "q2", alternativa: "B" },
      { questaoId: "q3", alternativa: "C" },
    ]);
    expect(porArea.MT).toMatchObject({ acertos: 2, percentual: 100 });
    expect(porArea.LC).toMatchObject({ acertos: 1, emBranco: 1, percentual: 50 });
  });

  it("ignora respostas de questões que não estão na prova", () => {
    const { geral } = corrigir(questoes, [{ questaoId: "outra", alternativa: "A" }]);
    expect(geral.emBranco).toBe(4);
  });

  it("devolve zero quando a prova não tem questões", () => {
    expect(corrigir([], []).geral.percentual).toBe(0);
  });
});
