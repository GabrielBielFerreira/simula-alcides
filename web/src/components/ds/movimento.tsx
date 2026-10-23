/**
 * Movimento do Simula Alcides: um vocabulário só, no produto inteiro.
 *
 * O movimento explica e responde (onde estou, o que mudou, minha ação funcionou?). Nada de
 * enfeite. Só transform e opacity. Tokens em src/styles.css: micro 140ms (toque, foco, cor),
 * curta 220ms (aparecer, menus, passo/questão, rota), média 360ms (revelar, barras, números),
 * longa 600ms (só herói e celebração); escalonamento de 50ms, no máximo 400ms no total.
 *
 * Quando usar:
 * - Conteúdo que entra ao rolar ou ao abrir a tela → <Revelar> (escalonar para listas e grades).
 * - Número de destaque (indicador, contagem) → <NumeroAnimado>.
 * - Preenchimento de barra → <Preenchimento fracao={0.42} className="bg-…" /> dentro do trilho.
 * - Ícone/linha de SVG que se desenha → <DesenhoSvg> com traços pathLength={1} className="traco".
 * - Algo que monta por causa de uma ação (passo, questão, mensagem, check) → classes `anima-*`
 *   com `key` no elemento: anima-da-direita / anima-da-esquerda (avançar/voltar), anima-aparecer,
 *   anima-surgir, anima-pop (círculo marcado), anima-desenhar (path com pathLength=1),
 *   anima-subir (herói). Escalone com `escalonar-filhos` no pai ou style={escalonado(i)}.
 * - Cartão clicável → `cartao cartao-interativo`. Item que pode ficar `selecionado` → `selecionavel`.
 * - Carregando → <Carregando> (ds) ou a classe `esqueleto` num bloco bg-creme.
 * Movimento reduzido: o CSS leva tudo direto ao estado final; os componentes daqui também.
 */
"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/** Durações em ms, iguais aos tokens --mov-* do CSS (para JS e Recharts). */
export const DURACAO = { micro: 140, curta: 220, media: 360, longa: 600 } as const;
const PASSO = 50;
const PASSO_MAX = 400;
/** Curva de saída cubic-bezier(0.22, 1, 0.36, 1), em texto para o Recharts. */
export const CURVA_SAIDA = "cubic-bezier(0.22, 1, 0.36, 1)";
/** A mesma curva em JS (equivale a easeOutQuint). */
const curvaSaida = (t: number) => 1 - Math.pow(1 - t, 5);

/* ---------- Ambiente (tudo seguro no SSR) ---------- */

const useEfeitoDeLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;
const CONSULTA_REDUZIDO = "(prefers-reduced-motion: reduce)";

/** Lê a preferência agora. Só em efeitos e eventos (no cliente). */
export function movimentoReduzidoAgora() {
  return typeof window !== "undefined" && !!window.matchMedia?.(CONSULTA_REDUZIDO).matches;
}

function assinarPreferencia(avisar: () => void) {
  const consulta = window.matchMedia?.(CONSULTA_REDUZIDO);
  consulta?.addEventListener?.("change", avisar);
  return () => consulta?.removeEventListener?.("change", avisar);
}

/** true se a pessoa pediu menos movimento. No servidor e na hidratação vale false. */
export function useMovimentoReduzido() {
  return useSyncExternalStore(assinarPreferencia, movimentoReduzidoAgora, () => false);
}

const assinarNada = () => () => {};
/** true se o componente montou depois da hidratação (navegação no cliente). */
function useMontouNoCliente() {
  const noCliente = useSyncExternalStore(
    assinarNada,
    () => true,
    () => false,
  );
  return useRef(noCliente).current;
}

const abaixoDaTela = (el: Element) => el.getBoundingClientRect().top >= window.innerHeight;

/** Atraso que o CSS daria ao elemento: --atraso + --i × 50ms (máx. 400ms). */
function atrasoDoElemento(el: Element) {
  const estilo = getComputedStyle(el);
  const i = parseFloat(estilo.getPropertyValue("--i")) || 0;
  const atraso = parseFloat(estilo.getPropertyValue("--atraso")) || 0;
  return atraso + Math.min(i * PASSO, PASSO_MAX);
}

/* ---------- Um IntersectionObserver para o app inteiro ---------- */

let observador: IntersectionObserver | null = null;
const aoEntrar = new Map<Element, () => void>();

/** Chama `entrou` uma vez, quando o elemento entra na tela. Devolve a função que cancela. */
export function quandoEntrarNaTela(el: Element, entrou: () => void) {
  if (typeof IntersectionObserver === "undefined") {
    entrou();
    return () => {};
  }
  observador ??= new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        const avisar = aoEntrar.get(entrada.target);
        aoEntrar.delete(entrada.target);
        observador?.unobserve(entrada.target);
        avisar?.();
      }
    },
    { rootMargin: "0px 0px -32px 0px" },
  );
  aoEntrar.set(el, entrou);
  observador.observe(el);
  return () => {
    aoEntrar.delete(el);
    observador?.unobserve(el);
  };
}

/* ---------- Revelar ---------- */

/*
 * Escritas adiadas da montagem. Cada bloco LÊ a própria posição (getBoundingClientRect) e
 * ESCREVE o data-revelar; intercaladas, cada leitura depois de uma escrita força um layout novo
 * (dezenas por tela, como no resultado: um quadro longo bem quando a tela entra). Assim, todas as
 * leituras da montagem vêm antes e as escritas vão juntas num microtask, ainda antes do 1º desenho.
 */
let escritas: (() => void)[] = [];
function escreverDepois(escrita: () => void) {
  if (escritas.push(escrita) > 1) return;
  queueMicrotask(() => {
    const fila = escritas;
    escritas = [];
    for (const escrever of fila) escrever();
  });
}

/**
 * Liga a entrada de um elemento com classe `revelar`, `barra-cheia` ou `desenho-svg`.
 * - No HTML do servidor (e sem JS) a entrada de CSS toca no 1º desenho: nada some antes.
 * - O que está abaixo da tela na montagem fica em espera (invisível, fora da vista) e entra
 *   quando chega na tela. Depois, `data-revelar="visto"`: 100% opaco, no lugar, sem animação.
 */
export function useRevelar<T extends Element>() {
  const ref = useRef<T>(null);
  useEfeitoDeLayout(() => {
    const el = ref.current;
    if (!el) return;
    let relogio: ReturnType<typeof setTimeout> | undefined;
    const concluir = () => el.setAttribute("data-revelar", "visto");
    // Folga para o maior atraso (400ms) + a entrada mais longa (600ms).
    const concluirDepois = () => {
      relogio = setTimeout(concluir, atrasoDoElemento(el) + PASSO_MAX + DURACAO.longa + 100);
    };
    if (movimentoReduzidoAgora()) {
      escreverDepois(concluir);
      return;
    }
    if (!abaixoDaTela(el)) {
      concluirDepois();
      return () => clearTimeout(relogio);
    }
    escreverDepois(() => el.setAttribute("data-revelar", "espera"));
    const cancelar = quandoEntrarNaTela(el, () => {
      el.setAttribute("data-revelar", "entrando");
      concluirDepois();
    });
    return () => {
      cancelar();
      clearTimeout(relogio);
    };
  }, []);
  return ref;
}

type TagRevelar =
  "div" | "section" | "article" | "header" | "footer" | "aside" | "ul" | "ol" | "li" | "p" | "span";

/**
 * Revela o conteúdo uma vez, quando entra na tela (ou já no carregamento, se estiver à vista).
 * `escalonar`: os filhos diretos entram um a um (50ms entre eles, até 400ms).
 */
export function Revelar({
  como = "div",
  efeito = "subir",
  escalonar = false,
  atraso,
  className,
  style,
  children,
  ...resto
}: {
  como?: TagRevelar;
  /** subir (padrão, 14px), aparecer (só opacidade) ou surgir (escala de 96% a 100%). */
  efeito?: "subir" | "aparecer" | "surgir";
  escalonar?: boolean;
  /** Atraso em ms antes de começar (somado ao escalonamento). */
  atraso?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<"div">, "style" | "className" | "children">) {
  const ref = useRevelar<HTMLElement>();
  const Tag = como as ElementType;
  return (
    <Tag
      ref={ref}
      data-efeito={efeito === "subir" ? undefined : efeito}
      className={cn("revelar", escalonar && "revelar-filhos escalonar-filhos", className)}
      style={atraso ? { ...style, "--atraso": `${atraso}ms` } : style}
      {...resto}
    >
      {children}
    </Tag>
  );
}

/** style para escalonar à mão: <li className="anima-surgir" style={escalonado(i)}>. */
export const escalonado = (i: number) => ({ "--i": Math.min(Math.max(0, i), 8) }) as CSSProperties;

/* ---------- Barras ---------- */

/**
 * Preenchimento de barra (o trilho é seu: `overflow-hidden rounded-full`). Enche ao aparecer e,
 * quando `fracao` muda, desliza até o novo valor. Decorativo: escreva o valor ao lado.
 */
export function Preenchimento({
  fracao,
  className,
  style,
}: {
  /** De 0 a 1. */
  fracao: number;
  /** Cor e forma, como "rounded-full bg-laranja". */
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRevelar<HTMLDivElement>();
  const progresso = Number.isFinite(fracao) ? Math.min(1, Math.max(0, fracao)) : 0;
  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("barra-cheia", className)}
      style={{ ...style, "--progresso": progresso } as CSSProperties}
    />
  );
}

/* ---------- SVG que se desenha ---------- */

/** <svg> cujos traços com pathLength={1} e className="traco" se desenham ao aparecer. */
export function DesenhoSvg({ className, ...props }: ComponentPropsWithoutRef<"svg">) {
  const ref = useRevelar<SVGSVGElement>();
  return <svg ref={ref} className={cn("desenho-svg", className)} {...props} />;
}

/* ---------- Número que conta ---------- */

const formatadores = new Map<number, Intl.NumberFormat>();
function formatar(valor: number, casas: number) {
  let f = formatadores.get(casas);
  if (!f) {
    f = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
    });
    formatadores.set(casas, f);
  }
  return f.format(valor);
}

/**
 * Número em pt-BR ("1.128", "67%") que conta até o valor.
 * - Carregamento (SSR): se já está à vista, mostra o valor final, sem piscar; abaixo da tela,
 *   conta quando aparecer.
 * - Navegação no cliente: conta de 0 ao aparecer. Valor novo: conta do anterior até ele.
 * - Movimento reduzido: valor final direto. Leitor de tela lê só o valor final.
 * O espaço do valor final fica reservado: nada ao lado se mexe enquanto conta.
 */
export function NumeroAnimado({
  valor,
  sufixo = "",
  prefixo = "",
  casas = 0,
  duracao = DURACAO.media,
  className,
}: {
  valor: number;
  /** Colado ao número, como "%". */
  sufixo?: string;
  prefixo?: string;
  casas?: number;
  /** Em ms. Padrão: média (360). Use DURACAO.longa só em celebração. */
  duracao?: number;
  className?: string;
}) {
  const montouNoCliente = useMontouNoCliente();
  const [mostrado, setMostrado] = useState(montouNoCliente ? 0 : valor);
  const ref = useRef<HTMLSpanElement>(null);
  const atual = useRef(mostrado);
  const fase = useRef<"inicio" | "esperando" | "pronto">("inicio");

  useEfeitoDeLayout(() => {
    const el = ref.current;
    if (!el) return;
    let quadro = 0;
    let relogio: ReturnType<typeof setTimeout> | undefined;
    let cancelarEspera = () => {};
    const fator = 10 ** casas;
    // Guarda o valor exato e só renderiza quando o número escrito muda.
    const mostrar = (v: number) => {
      atual.current = v;
      setMostrado(Math.round(v * fator) / fator || 0); // || 0: nunca "-0"
    };
    const contar = (de: number, ms: number, atraso: number) => {
      fase.current = "pronto";
      if (de === valor) return mostrar(valor);
      relogio = setTimeout(() => {
        // O relógio começa no quadro seguinte ao atual: numa tela que acabou de montar, o quadro
        // atual pode ser longo e a contagem pularia o começo. Com t entre 0 e 1, o número fica
        // sempre entre `de` e `valor` (nunca "-0" nem "-1%").
        let inicio: number | null = null;
        const passo = (agora: number) => {
          inicio ??= agora;
          const t = Math.min(1, Math.max(0, (agora - inicio) / ms));
          mostrar(t < 1 ? de + (valor - de) * curvaSaida(t) : valor);
          if (t < 1) quadro = requestAnimationFrame(passo);
        };
        quadro = requestAnimationFrame(() => {
          quadro = requestAnimationFrame(passo);
        });
      }, atraso);
    };

    if (movimentoReduzidoAgora()) {
      fase.current = "pronto";
      mostrar(valor);
    } else if (fase.current === "pronto") {
      contar(atual.current, duracao, 0);
    } else {
      const primeiraVez = fase.current === "inicio";
      if (primeiraVez && !montouNoCliente && !abaixoDaTela(el)) {
        // Já estava à vista no HTML do servidor: fica o valor final.
        fase.current = "pronto";
      } else {
        if (atual.current !== 0) mostrar(0);
        if (!abaixoDaTela(el)) contar(0, duracao, atrasoDoElemento(el));
        else {
          fase.current = "esperando";
          cancelarEspera = quandoEntrarNaTela(el, () => contar(0, duracao, atrasoDoElemento(el)));
        }
      }
    }
    return () => {
      cancelAnimationFrame(quadro);
      clearTimeout(relogio);
      cancelarEspera();
    };
  }, [valor]);

  const final = `${prefixo}${formatar(valor, casas)}${sufixo}`;
  return (
    <span ref={ref} className={cn("inline-grid tabular-nums", className)}>
      <span aria-hidden className="invisible col-start-1 row-start-1">
        {final}
      </span>
      <span aria-hidden className="col-start-1 row-start-1">
        {prefixo}
        {formatar(mostrado, casas)}
        {sufixo}
      </span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
