/**
 * Peças das telas de apoio da coordenação (ficha, simulados, questões e redações).
 * Seguem o padrão de `ui.tsx` e do Por Compaz: o estado "selecionado" único do produto,
 * campos com borda `borda-controle`, cabeçalhos de tabela em 13px maiúsculo.
 */
import { useEffect, useRef, useState, type AnimationEvent, type ReactNode } from "react";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DURACAO, escalonado, movimentoReduzidoAgora } from "@/components/ds";
import { partesData } from "@/data/admin-apoio";
import { POLO_DA_COORDENACAO, buscarPolo } from "@/data/coordenacao";

/** Sobretítulo das telas de apoio: diz de onde se olha (a barra superior já diz a tela). */
export const sobretituloDoPapel = (ehPolo: boolean) =>
  ehPolo ? (buscarPolo(POLO_DA_COORDENACAO)?.nome ?? "Compaz Paulo Freire") : "Coordenação central";

/* ---------- Classes compartilhadas ---------- */

/** Campo de texto, data, hora, select e textarea: mesma borda e foco do `Campo`. */
export const classeCampo =
  "min-h-12 w-full rounded-xl border-2 border-borda-controle bg-card px-4 text-[17px] text-marrom placeholder:text-muted-foreground/80 hover:border-muted-foreground/50 focus:outline-none focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-laranja-acao aria-[invalid=true]:border-erro";

/** Cabeçalho de tabela: 13px maiúsculo, muted. */
export const classeThBase =
  "border-b-[1.5px] border-linha bg-card px-3 py-3 text-left align-bottom text-[13px] font-semibold uppercase leading-snug tracking-wide text-muted-foreground first:pl-5 last:pr-5";

/** Cabeçalho de tabela em cartão próprio: fixo sob a barra superior no desktop. */
export const classeTh = `${classeThBase} sticky top-[77px] z-10 first:rounded-tl-[16px] last:rounded-tr-[16px]`;

export const classeTd = "border-b border-linha px-3 py-3 align-middle first:pl-5 last:pr-5";

/** Linha de tabela clicável, com cantos arredondados na última linha. O fundo reage ao mouse e
 * ao foco do teclado dentro da linha. */
export const classeLinha =
  "group transition-colors focus-within:bg-creme/60 hover:bg-creme/60 [&:last-child>td]:border-b-0 [&:last-child>td:first-child]:rounded-bl-[16px] [&:last-child>td:last-child]:rounded-br-[16px]";

/* ---------- Movimento das telas da coordenação ---------- */

/**
 * Quando `ligado` passa de falso a verdadeiro depois da montagem, o círculo do que a pessoa
 * acabou de marcar ganha `anima-pop` (`classe`). O que já vem marcado no carregamento não pula.
 * A classe sai ao terminar (`aoTerminar` no onAnimationEnd do círculo): se a tela for escondida
 * e mostrada de novo (fila de redações), o pulo não se repete.
 */
export function useAcabouDeMarcar(ligado: boolean) {
  const [anterior, setAnterior] = useState(ligado);
  const [marcou, setMarcou] = useState(false);
  if (ligado !== anterior) {
    setAnterior(ligado);
    setMarcou(ligado);
  }
  const pulando = marcou && ligado;
  return {
    classe: pulando ? "anima-pop" : undefined,
    aoTerminar: pulando
      ? (e: AnimationEvent<HTMLElement>) => {
          if (e.target === e.currentTarget) setMarcou(false);
        }
      : undefined,
  };
}

/**
 * Entrada de um item de lista que montou por causa de uma ação (filtro, busca, publicar): um fade
 * curto (`anima-aparecer`). O que veio no carregamento e o que já estava na lista não animam de
 * novo a cada filtro ou tecla: a decisão é tomada uma vez, na montagem do item.
 * `posicao`: lugar do item numa lista que acabou de trocar inteira (cascata de 50ms até o 8º;
 * do 9º em diante entram juntos). Fora disso, 0.
 * Com movimento reduzido não ganha classe nenhuma: a animação de 0,01ms ainda pinta um quadro
 * no estado inicial (lista em branco por um instante). `depoisDeAcao` só é verdadeiro depois de
 * um clique ou tecla, nunca no servidor, então consultar a preferência aqui é seguro.
 */
export function useEntradaPorAcao(depoisDeAcao: boolean, posicao = 0) {
  const [entrada, setEntrada] = useState(() =>
    depoisDeAcao && !movimentoReduzidoAgora() ? posicao : null,
  );
  return entrada === null
    ? { classe: undefined, estilo: undefined, aoTerminar: undefined }
    : {
        classe: "anima-aparecer",
        estilo: escalonado(entrada),
        // A classe sai quando a entrada termina: se a lista for reordenada (publicar), o React
        // move o nó no DOM e uma animação CSS ainda presa a ele tocaria de novo.
        aoTerminar: (e: AnimationEvent<HTMLElement>) => {
          if (e.target === e.currentTarget) setEntrada(null);
        },
      };
}

/**
 * Foco para quando a ação tira da tela o próprio botão clicado (o "Limpar busca" do estado vazio,
 * o chip de filtro removido): o foco vai antes para um elemento que continua na tela. Sem isso
 * ele cai no <body> e quem usa teclado ou leitor de tela volta para o começo da página.
 */
export function focarAntesDeSumir(alvo: string | HTMLElement | null | undefined) {
  const el = typeof alvo === "string" ? document.getElementById(alvo) : alvo;
  el?.focus();
}

/** O primeiro botão de um grupo de filtros (o "Todos"), achado pelo rótulo do grupo. */
export const primeiroDoGrupo = (rotulo: string) =>
  document.querySelector<HTMLElement>(`[role="group"][aria-label="${rotulo}"] button`);

/**
 * Classe de animação que toca uma vez quando `valor` muda (no carregamento, não) e sai quando
 * termina, para não tocar de novo se o elemento for movido no DOM. Ex.: a pílula de situação que
 * surge ao publicar um simulado ou aprovar uma questão.
 */
export function useAnimaAoMudar<T>(valor: T, classe: string) {
  const [anterior, setAnterior] = useState(valor);
  const [tocando, setTocando] = useState(false);
  if (valor !== anterior) {
    setAnterior(valor);
    setTocando(true);
  }
  return {
    className: tocando ? classe : undefined,
    onAnimationEnd: tocando
      ? (e: AnimationEvent<HTMLElement>) => {
          if (e.target === e.currentTarget) setTocando(false);
        }
      : undefined,
  };
}

/**
 * Número de rótulo (contagem numa pílula, total de uma soma) que muda suave quando o valor muda:
 * 220ms do anterior ao novo, na curva de saída. Diferente do `NumeroAnimado` (números de
 * destaque), não conta ao aparecer: já vem certo no carregamento, ao abrir um painel ou numa
 * fileira que rola de lado. Leitor de tela lê só o valor final; movimento reduzido troca direto.
 */
export function ContagemSuave({ valor, className }: { valor: number; className?: string }) {
  const [mostrado, setMostrado] = useState(valor);
  const atual = useRef(valor);
  useEffect(() => {
    const de = atual.current;
    if (de === valor) return;
    if (movimentoReduzidoAgora()) {
      atual.current = valor;
      setMostrado(valor);
      return;
    }
    let quadro = 0;
    let inicio: number | undefined;
    const passo = (agora: number) => {
      inicio ??= agora;
      const t = Math.min(1, (agora - inicio) / DURACAO.curta);
      atual.current = de + (valor - de) * (1 - Math.pow(1 - t, 5));
      setMostrado(Math.round(atual.current));
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [valor]);
  const final = valor.toLocaleString("pt-BR");
  return (
    <span className={cn("relative inline-grid tabular-nums", className)}>
      <span aria-hidden className="col-start-1 row-start-1">
        {mostrado.toLocaleString("pt-BR")}
      </span>
      <span className="sr-only">{final}</span>
    </span>
  );
}

/** true só na primeira renderização: os itens que montam junto com a lista entram em cascata. */
export function useListaNova() {
  const [nova, setNova] = useState(true);
  useEffect(() => setNova(false), []);
  return nova;
}

/* ---------- Título de bloco ---------- */

export function TituloBloco({
  id,
  titulo,
  children,
  acoes,
  focavel = false,
  className,
}: {
  id?: string;
  titulo: string;
  /** Linha de apoio abaixo do título. */
  children?: ReactNode;
  /** Botão ou link alinhado à direita. */
  acoes?: ReactNode;
  /** O título pode receber o foco por script (quando o controle que tinha o foco sai da tela). */
  focavel?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3", className)}
    >
      <div className="min-w-0">
        <h2
          id={id}
          tabIndex={focavel ? -1 : undefined}
          className="text-[22px] font-bold text-marrom"
        >
          {titulo}
        </h2>
        {children && <div className="mt-1.5 text-[15px] text-muted-foreground">{children}</div>}
      </div>
      {acoes}
    </div>
  );
}

/* ---------- Pílula de filtro (estado "selecionado" com contagem) ---------- */

export function PilulaFiltro({
  ativo,
  aoClicar,
  rotulo,
  contagem,
  icone: Icone,
}: {
  ativo: boolean;
  aoClicar: () => void;
  rotulo: string;
  contagem?: number;
  icone?: LucideIcon;
}) {
  const pop = useAcabouDeMarcar(ativo);
  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={ativo}
      className={cn("selecionavel rounded-full pl-3", ativo && "selecionado")}
      onClick={aoClicar}
    >
      {ativo ? (
        <span
          onAnimationEnd={pop.aoTerminar}
          className={cn(
            "grid size-5 place-items-center rounded-full bg-laranja-acao text-primary-foreground",
            pop.classe,
          )}
          aria-hidden
        >
          <Check className="size-3.5!" strokeWidth={3} />
        </span>
      ) : Icone ? (
        <Icone aria-hidden />
      ) : null}
      {rotulo}
      {contagem !== undefined && (
        <span className="rounded-full bg-card px-2 text-sm font-bold ring-1 ring-linha">
          <ContagemSuave valor={contagem} />
        </span>
      )}
    </Button>
  );
}

/* ---------- Cartão de escolha (rádio ou caixa) ---------- */

/**
 * Opção tocável com o "selecionado" do produto: borda 2px laranja-ação, fundo a 8% e
 * círculo preenchido com Check. O input nativo fica invisível, mas é ele que recebe foco e teclado.
 */
export function OpcaoEscolha({
  id,
  tipo,
  nome,
  valor,
  marcado,
  aoMudar,
  titulo,
  detalhe,
  desabilitado = false,
  indicador,
  className,
}: {
  /** Id do input, para levar o foco até a opção. */
  id?: string;
  tipo: "radio" | "checkbox";
  nome: string;
  valor: string;
  marcado: boolean;
  aoMudar: (marcado: boolean) => void;
  titulo: ReactNode;
  detalhe?: ReactNode;
  desabilitado?: boolean;
  /** Troca o círculo padrão (por exemplo, um cadeado numa opção fixa). */
  indicador?: ReactNode;
  className?: string;
}) {
  const pop = useAcabouDeMarcar(marcado);
  return (
    <label
      className={cn(
        "selecionavel flex min-h-14 items-start gap-3 rounded-xl border-2 p-3.5 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-laranja-acao",
        marcado
          ? "border-laranja-acao bg-laranja-acao/8"
          : "border-borda-controle bg-card hover:bg-creme/60",
        desabilitado ? "cursor-default" : "cursor-pointer",
        className,
      )}
    >
      <input
        id={id}
        type={tipo}
        name={nome}
        value={valor}
        checked={marcado}
        disabled={desabilitado}
        onChange={(e) => aoMudar(e.target.checked)}
        className="sr-only"
      />
      {indicador ?? (
        <span
          onAnimationEnd={pop.aoTerminar}
          aria-hidden
          className={cn(
            "selecionavel mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2",
            marcado
              ? "border-laranja-acao bg-laranja-acao text-primary-foreground"
              : "border-borda-controle bg-card",
            pop.classe,
          )}
        >
          {marcado && <Check className="size-4" strokeWidth={3} />}
        </span>
      )}
      <span className="min-w-0">
        <span className="block font-semibold leading-snug text-marrom">{titulo}</span>
        {detalhe && (
          <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{detalhe}</span>
        )}
      </span>
    </label>
  );
}

/* ---------- Bloco de data em formato de ingresso ---------- */

/** "SÁB / 31 / OUT" em creme com borda tracejada, como nos simulados oficiais do app. */
export function BilheteData({ iso, className }: { iso: string; className?: string }) {
  const { semana, dia, mes } = partesData(iso);
  return (
    <span
      aria-hidden
      className={cn(
        "flex w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-borda-controle bg-creme py-1.5 text-[13px] font-semibold leading-tight text-marrom",
        className,
      )}
    >
      <span>{semana}</span>
      <span className="font-display text-2xl font-black leading-none tabular-nums">{dia}</span>
      <span>{mes}</span>
    </span>
  );
}

/* ---------- Select com rótulo ---------- */

export function CampoSelect({
  id,
  rotulo,
  valor,
  aoMudar,
  opcoes,
  todos = "Todas",
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  /** Texto simples ou { valor, rotulo } quando o valor guardado é diferente do texto. */
  opcoes: (string | { valor: string; rotulo: string })[];
  /** Texto da opção vazia ("Todas" ou "Todos"). */
  todos?: string;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-muted-foreground">
        {rotulo}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className={cn(
          classeCampo,
          "cursor-pointer px-3 text-base transition-colors",
          valor && "border-laranja-acao",
        )}
      >
        <option value="">{todos}</option>
        {opcoes.map((o) => {
          const { valor: v, rotulo: r } = typeof o === "string" ? { valor: o, rotulo: o } : o;
          return (
            <option key={v} value={v}>
              {r}
            </option>
          );
        })}
      </select>
    </div>
  );
}
