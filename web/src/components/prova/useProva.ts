import { useCallback, useEffect, useRef, useState } from "react";
import { salvarResposta, type ProvaCarregada } from "@/lib/dados";

export interface EstadoProva {
  respostas: Record<number, number>;
  riscadas: Record<number, number[]>;
  marcadas: number[];
  atual: number;
  entregue: boolean;
  restante: number;
}
export const estadoInicial: EstadoProva = {
  respostas: {},
  riscadas: {},
  marcadas: [],
  atual: 0,
  entregue: false,
  restante: 0,
};

const segundosAte = (prazo: number) => Math.max(0, Math.round((prazo - Date.now()) / 1000));

/**
 * Estado da prova. Respostas e marcações vão para o banco a cada toque; se a internet falhar,
 * ficam numa fila e são reenviadas (a cada 5s e antes de entregar). Riscos e questão atual
 * ficam só no aparelho. O tempo segue o prazo do servidor.
 */
export function useProva(dados: ProvaCarregada) {
  const total = dados.questoes.length;
  const chaveLocal = `simula-prova-${dados.tentativaId}`;
  const [estado, setEstado] = useState<EstadoProva>(() => ({
    ...estadoInicial,
    respostas: dados.respostas,
    marcadas: dados.marcadas,
    entregue: dados.entregue,
    restante: segundosAte(dados.prazo),
  }));
  const [pronto, setPronto] = useState(false);
  const [semRede, setSemRede] = useState(false);
  const [salvamentos, setSalvamentos] = useState(0);
  const pendentes = useRef(new Map<number, { alternativa: number | null; marcada: boolean }>());
  const atualRef = useRef(estado);
  atualRef.current = estado;

  // Riscos e questão atual guardados no aparelho.
  useEffect(() => {
    try {
      const salvo = sessionStorage.getItem(chaveLocal);
      if (salvo) {
        const v = JSON.parse(salvo);
        setEstado((e) => ({
          ...e,
          riscadas: v.riscadas ?? {},
          atual: Math.min(total - 1, Math.max(0, Number(v.atual) || 0)),
        }));
      }
    } catch {
      // Sem armazenamento: segue só na memória.
    }
    setPronto(true);
  }, [chaveLocal, total]);
  useEffect(() => {
    if (!pronto) return;
    try {
      sessionStorage.setItem(
        chaveLocal,
        JSON.stringify({ riscadas: estado.riscadas, atual: estado.atual }),
      );
    } catch {
      // Sem armazenamento.
    }
  }, [estado.riscadas, estado.atual, chaveLocal, pronto]);

  // Relógio pelo prazo do servidor (não atrasa se a aba ficar em segundo plano).
  useEffect(() => {
    if (!pronto || estado.entregue) return;
    const timer = setInterval(
      () => setEstado((e) => ({ ...e, restante: segundosAte(dados.prazo) })),
      1000,
    );
    return () => clearInterval(timer);
  }, [pronto, estado.entregue, dados.prazo]);

  const enviarPendentes = useCallback(async () => {
    const fila = [...pendentes.current.entries()];
    if (!fila.length) return true;
    let ok = true;
    for (const [q, r] of fila) {
      try {
        await salvarResposta(
          dados.tentativaId,
          dados.questoes[q - 1].versaoId,
          r.alternativa,
          r.marcada,
        );
        // Só limpa se ninguém mudou a mesma questão enquanto enviava.
        if (pendentes.current.get(q) === r) pendentes.current.delete(q);
      } catch {
        ok = false;
      }
    }
    setSemRede(!ok);
    if (ok) setSalvamentos((n) => n + 1);
    return ok;
  }, [dados]);

  // Tenta de novo a cada 5s enquanto houver fila.
  useEffect(() => {
    if (!semRede) return;
    const t = setInterval(() => void enviarPendentes(), 5000);
    return () => clearInterval(t);
  }, [semRede, enviarPendentes]);

  const salvar = (q: number, alternativa: number | null, marcada: boolean) => {
    pendentes.current.set(q, { alternativa, marcada });
    void enviarPendentes();
  };

  const ir = (atual: number) =>
    setEstado((e) => ({ ...e, atual: Math.min(total - 1, Math.max(0, atual)) }));
  return {
    estado,
    setEstado,
    pronto,
    semRede,
    salvamentos,
    enviarPendentes,
    ir,
    responder: (q: number, a: number) => {
      salvar(q, a, atualRef.current.marcadas.includes(q));
      setEstado((e) => ({
        ...e,
        respostas: { ...e.respostas, [q]: a },
        riscadas: { ...e.riscadas, [q]: (e.riscadas[q] ?? []).filter((n) => n !== a) },
      }));
    },
    riscar: (q: number, a: number) =>
      setEstado((e) => ({
        ...e,
        riscadas: {
          ...e.riscadas,
          [q]: (e.riscadas[q] ?? []).includes(a)
            ? e.riscadas[q].filter((n) => n !== a)
            : [...(e.riscadas[q] ?? []), a],
        },
      })),
    marcar: (q: number) => {
      const e = atualRef.current;
      salvar(q, e.respostas[q] ?? null, !e.marcadas.includes(q));
      setEstado((e) => ({
        ...e,
        marcadas: e.marcadas.includes(q) ? e.marcadas.filter((n) => n !== q) : [...e.marcadas, q],
      }));
    },
  };
}
