import { useState } from "react";
import { ANO_NASCIMENTO_MINIMO, SENHA_MINIMA } from "@/data/conta";
import { idadeEm } from "@/data/rules";

/** Devolve a mensagem de erro do campo, ou `undefined` quando está tudo certo. */
export type Regra = (valor: string) => string | undefined;

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Máscara do campo de data: só números, com as barras no lugar ("12052007" → "12/05/2007"). */
export function mascaraData(v: string) {
  const numeros = v.replace(/\D/g, "").slice(0, 8);
  return [numeros.slice(0, 2), numeros.slice(2, 4), numeros.slice(4)].filter(Boolean).join("/");
}

/** Máscara do WhatsApp: "81999998888" → "(81) 99999-8888". */
export function mascaraTelefone(v: string) {
  const n = v.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return n.length ? `(${n}` : "";
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  const corte = n.length === 11 ? 7 : 6;
  return `(${n.slice(0, 2)}) ${n.slice(2, corte)}-${n.slice(corte)}`;
}

/** "DD/MM/AAAA" → "AAAA-MM-DD"; vazio quando a data está incompleta ou não existe (ex.: 31/02). */
export function dataIsoDe(v: string) {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!partes) return "";
  const [, dia, mes, ano] = partes;
  const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  const existe =
    data.getUTCFullYear() === Number(ano) &&
    data.getUTCMonth() === Number(mes) - 1 &&
    data.getUTCDate() === Number(dia);
  return existe ? `${ano}-${mes}-${dia}` : "";
}

export const regras = {
  nome: (v: string) => {
    const nome = v.trim();
    if (!nome) return "Informe seu nome.";
    if (nome.length < 2) return "Escreva pelo menos 2 letras.";
    return undefined;
  },
  email: (v: string) => {
    if (!v.trim()) return "Informe seu e-mail.";
    if (!FORMATO_EMAIL.test(v.trim())) return "Confira o e-mail. Exemplo: nome@email.com";
    return undefined;
  },
  emailResponsavel: (v: string) => {
    if (!v.trim()) return "Informe o e-mail de uma pessoa responsável.";
    if (!FORMATO_EMAIL.test(v.trim())) return "Confira o e-mail. Exemplo: nome@email.com";
    return undefined;
  },
  senha: (v: string) => (v ? undefined : "Informe sua senha."),
  senhaNova: (v: string) => {
    if (!v) return "Crie uma senha.";
    if (v.length < SENHA_MINIMA) {
      const faltam = SENHA_MINIMA - v.length;
      return `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres. ${faltam === 1 ? "Falta 1" : `Faltam ${faltam}`}.`;
    }
    return undefined;
  },
  /** Valor do campo de data, digitado como DD/MM/AAAA. */
  nascimento: (v: string) => {
    if (v.length < 10) return "Informe a data completa: dia, mês e ano. Exemplo: 12/05/2007";
    const iso = dataIsoDe(v);
    if (!iso) return "Confira o dia e o mês. Exemplo: 12/05/2007";
    if (Number(iso.slice(0, 4)) < ANO_NASCIMENTO_MINIMO) return "Confira o ano de nascimento.";
    if (idadeEm(iso) < 0) return "A data de nascimento não pode ser depois de hoje.";
    return undefined;
  },
  telefone: (v: string) => {
    const n = v.replace(/\D/g, "");
    if (!n) return "Informe seu WhatsApp com DDD.";
    if (n.length < 10) return "Confira o número com DDD. Exemplo: (81) 99999-8888";
    return undefined;
  },
  nomeCursinho: (v: string) => (v.trim() ? undefined : "Escreva o nome do seu cursinho."),
} satisfies Record<string, Regra>;

/**
 * Estado de um formulário com validação ao sair do campo.
 * O erro aparece depois que a pessoa preencheu e saiu do campo (ou tentou enviar) e some
 * assim que o valor fica certo.
 */
export function useFormulario<C extends string>(
  validadores: Record<C, Regra>,
  inicial: Record<C, string>,
) {
  const [valores, setValores] = useState(inicial);
  const [tocados, setTocados] = useState<Partial<Record<C, boolean>>>({});

  const erro = (c: C) => (tocados[c] ? validadores[c](valores[c]) : undefined);

  /** Props prontas para o `Campo` do design system. */
  const campo = (c: C) => ({
    value: valores[c],
    onChange: (v: string) => setValores((atual) => ({ ...atual, [c]: v })),
    // Campo vazio só é cobrado no envio: quem só passou pelo campo não leva bronca.
    onBlur: () => {
      if (valores[c]) setTocados((atual) => ({ ...atual, [c]: true }));
    },
    erro: erro(c),
  });

  /** Mostra todos os erros e devolve o primeiro campo com problema (ou `null`). */
  const validarTudo = (): C | null => {
    const chaves = Object.keys(validadores) as C[];
    setTocados(Object.fromEntries(chaves.map((c) => [c, true])) as Record<C, boolean>);
    return chaves.find((c) => validadores[c](valores[c])) ?? null;
  };

  return { valores, campo, erro, validarTudo };
}

/**
 * Leva o foco ao campo com erro depois que a mensagem aparece na tela, centralizado
 * (no celular, o botão fixo do rodapé não cobre o campo).
 */
export function focarCampo(id: string) {
  requestAnimationFrame(() => {
    const campo = document.getElementById(id);
    campo?.focus({ preventScroll: true });
    campo?.scrollIntoView({ block: "center" });
  });
}
