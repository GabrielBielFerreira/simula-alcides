/**
 * Prova (tela cheia). É o momento de maior concentração do estudante: o movimento aqui é mínimo,
 * rápido e só responde ao que a pessoa fez (vocabulário em src/components/ds/movimento.tsx e no
 * bloco "movimento: prova" de src/styles.css).
 * - Alternativa: afunda de leve no toque, ganha o estado "selecionado" em 140ms e a letra vira
 *   Check com um pop curto. Riscar: um traço atravessa o texto e ele esmaece.
 * - Trocar de questão: só o corpo desliza 12px com fade (da direita ao avançar, da esquerda ao
 *   voltar); as barras de cima e de baixo ficam paradas e a rolagem volta ao topo da questão.
 * - Barra de progresso por transform; bandeira de "revisar" com pop único; check de "salvo"
 *   que se desenha a cada salvamento; cronômetro que muda de cor aos 30 minutos e pulsa uma vez
 *   por minuto nos últimos 5; anel na questão atual do mapa.
 * - Entregar: depois de confirmar, "Corrigindo sua prova…" por 1s e o resultado.
 * Nada disso toca no carregamento, ao rever uma questão já respondida ou a cada segundo do relógio.
 * Desempenho: o cronômetro renderiza a tela a cada segundo, então texto, alternativas, mapa e
 * revisão são memorizados (com funções estáveis) e o mapa recebe os valores adiados: um toque
 * só renderiza de novo as alternativas que mudaram.
 */
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  X,
  Clock,
  LayoutGrid,
  Flag,
  ChevronLeft,
  ChevronRight,
  Check,
  ClipboardCheck,
  Scissors,
  WifiOff,
  Sun,
  Moon,
  Minus,
  Plus,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  AreaChip,
  Carregando,
  EstadoVazio,
  Preenchimento,
  movimentoReduzidoAgora,
  useMovimentoReduzido,
} from "@/components/ds";
import { areas } from "@/data/mock";
import type { Questao } from "@/data/prototipo";
import { abrirProva, entregarProva, type ProvaCarregada, type QuestaoProva } from "@/lib/dados";
import { Titulo, NaoEncontrado, Cartao } from "@/components/app/shared";
import { MarcadorSelecionado } from "@/components/app/controles";
import { cn } from "@/lib/utils";
import { guardarSom, somLigadoSalvo, tocarAvanco } from "@/lib/som";
import { useProva } from "./useProva";

/** Questões da prova aberta (uma prova por vez na tela). */
let questoes: QuestaoProva[] = [];

/** O que a tela da questão mostra: serve às questões do banco e às do protótipo. */
type QuestaoNaTela = Pick<Questao, "id" | "texto" | "enunciado"> &
  Partial<Pick<Questao, "fonte" | "tabela" | "grafico">> & { imagem?: string | null };

const LETRAS = "ABCDE";
const ORDEM_AREAS = ["linguagens", "humanas", "natureza", "matematica"] as const;
const SEM_RISCOS: number[] = [];
const useEfeitoDeLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Função de identidade fixa que chama sempre a versão mais recente (deixa o memo funcionar). */
function useEstavel<A extends unknown[]>(fn: (...args: A) => void) {
  const recente = useRef(fn);
  useEfeitoDeLayout(() => {
    recente.current = fn;
  });
  return useCallback((...args: A) => recente.current(...args), []);
}

/** Faixas do cronômetro: 0 normal · 1 faltam 30 min · 2 faltam 5 min · 3 falta 1 min · 4 acabou. */
const faixaDoTempo = (s: number) => (s <= 0 ? 4 : s <= 60 ? 3 : s <= 300 ? 2 : s <= 1800 ? 1 : 0);
const AVISO_DA_FAIXA = [
  "",
  "Faltam 30 minutos de prova.",
  "Faltam 5 minutos de prova.",
  "Falta 1 minuto de prova.",
  "O tempo acabou. Revise e entregue o simulado.",
];

function tempoPorExtenso(s: number) {
  if (s <= 0) return "tempo esgotado";
  const minutos = Math.ceil(s / 60);
  if (minutos < 60) return minutos === 1 ? "falta 1 minuto" : `faltam ${minutos} minutos`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `faltam ${h} h${m ? ` e ${m} min` : ""}`;
}

export function TextoQuestao({ q }: { q: QuestaoNaTela }) {
  const maior = q.grafico ? Math.max(...q.grafico.map((p) => p.valor)) : 0;
  const temTexto = Boolean(q.texto || q.imagem || q.tabela || q.grafico);
  return (
    <>
      <div
        className={cn(
          "whitespace-pre-line rounded-xl border border-linha bg-creme p-4 leading-relaxed",
          !temTexto && "hidden",
        )}
      >
        {q.texto && <p>{q.texto}</p>}
        {q.imagem && (
          <img
            src={q.imagem}
            alt="Imagem da questão"
            loading="lazy"
            className="mx-auto mt-4 max-h-[420px] w-auto max-w-full rounded-lg bg-white"
          />
        )}
        {q.tabela && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-base">
              <tbody>
                {q.tabela.map((row, i) => (
                  <tr key={i} className="border-b border-borda-controle">
                    {row.map((c, j) =>
                      i === 0 ? (
                        <th key={j} className="p-2">
                          {c}
                        </th>
                      ) : (
                        <td key={j} className="p-2">
                          {c}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {q.grafico && (
          <div
            role="img"
            aria-label={`Gráfico de barras: ${q.grafico.map((p) => `${p.rotulo}, ${p.valor}`).join("; ")}`}
            className="mt-4 space-y-3"
          >
            {q.grafico.map((p) => (
              <div key={p.rotulo} className="flex items-center gap-3 text-base">
                <span className="w-8">{p.rotulo}</span>
                <div className="h-5 flex-1 rounded bg-card">
                  <div
                    className="h-full rounded bg-marrom"
                    style={{ width: `${(p.valor / maior) * 100}%` }}
                  />
                </div>
                <span>{p.valor}</span>
              </div>
            ))}
          </div>
        )}
        {q.fonte && <p className="mt-3 text-sm text-muted-foreground">{q.fonte}</p>}
      </div>
      <p id={`enunciado-${q.id}`} className="my-5 font-semibold leading-relaxed">
        {q.enunciado}
      </p>
    </>
  );
}
/** Na prova, o texto da questão não renderiza de novo a cada segundo nem a cada toque. */
const TextoQuestaoFixo = memo(TextoQuestao);

/**
 * Texto de alternativa que pode ser riscado. Cada palavra leva o espaço seguinte num <span>, e o
 * traço de cada uma (pseudo-elemento) cresce com scaleX, em sequência da esquerda para a direita:
 * acompanha as quebras de linha como um line-through, animando só transform e opacity.
 */
function TextoRiscavel({ texto, riscado }: { texto: string; riscado: boolean }) {
  const palavras = texto.split(" ");
  let antes = 0;
  return (
    <span className="texto-riscavel" data-riscado={riscado || undefined}>
      {palavras.map((palavra, i) => {
        // O traço percorre o texto inteiro em até 120ms.
        const atraso = Math.round((antes / texto.length) * 120);
        antes += palavra.length + 1;
        return (
          <span
            key={i}
            className="risco-palavra"
            style={{ "--risco-atraso": `${atraso}ms` } as CSSProperties}
          >
            {i < palavras.length - 1 ? `${palavra} ` : palavra}
          </span>
        );
      })}
    </span>
  );
}

const Alternativa = memo(function Alternativa({
  indice,
  texto,
  escolhida,
  riscada,
  recemEscolhida,
  focavel,
  aoEscolher,
  aoRiscar,
  aoMover,
}: {
  indice: number;
  texto: string;
  escolhida: boolean;
  riscada: boolean;
  /** A pessoa acabou de escolher esta: só então o Check dá o pop. */
  recemEscolhida: boolean;
  /** Tabulação itinerante do grupo de rádio: só a escolhida (ou a primeira) entra no Tab. */
  focavel: boolean;
  aoEscolher: (indice: number) => void;
  aoRiscar: (indice: number) => void;
  aoMover: (indice: number, passo: 1 | -1, alvo: HTMLElement) => void;
}) {
  const letra = LETRAS[indice];
  return (
    <div className="flex items-stretch gap-1">
      <Button
        role="radio"
        aria-checked={escolhida}
        aria-label={`Alternativa ${letra}: ${texto}${riscada ? " (riscada)" : ""}`}
        tabIndex={focavel ? 0 : -1}
        variant="outline"
        onClick={() => aoEscolher(indice)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            aoMover(indice, e.key === "ArrowDown" ? 1 : -1, e.currentTarget);
          }
        }}
        className={cn(
          "selecionavel min-h-14 min-w-0 flex-1 justify-start whitespace-normal rounded-xl border-[1.5px] border-linha px-3 py-3 text-left shadow-none hover:border-borda-controle/70 text-[1em] text-inherit active:scale-[0.99]",
          escolhida && "selecionado",
        )}
      >
        <MarcadorSelecionado
          marcado={escolhida}
          recem={recemEscolhida}
          letra={letra}
          className="size-9"
        />
        <TextoRiscavel texto={texto} riscado={riscada} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 self-center text-muted-foreground aria-pressed:bg-creme aria-pressed:text-foreground"
        aria-label={`${riscada ? "Desfazer risco da" : "Riscar"} alternativa ${letra}`}
        aria-pressed={riscada}
        onClick={() => aoRiscar(indice)}
      >
        <Scissors />
      </Button>
    </div>
  );
});

/** Mapa de questões: painel que sobe no celular e coluna fixa no desktop. */
const MapaQuestoes = memo(function MapaQuestoes({
  respostas,
  marcadas,
  atualId,
  noPainel,
  aoIr,
  aoRevisar,
}: {
  respostas: Record<number, number>;
  marcadas: number[];
  /** Questão atual (null na revisão). */
  atualId: number | null;
  /** No painel do celular, o anel da questão atual espera o painel subir. */
  noPainel: boolean;
  aoIr: (indice: number) => void;
  aoRevisar: () => void;
}) {
  const respondidas = questoes.filter((x) => respostas[x.id] !== undefined).length;
  const brancas = questoes.length - respondidas;
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Mapa de questões</h2>
      {ORDEM_AREAS.map((a) => (
        <div key={a}>
          <AreaChip area={a} curto />
          <div className="mt-3 flex flex-wrap gap-2">
            {questoes
              .filter((x) => x.area === a)
              .map((x) => {
                const r = respostas[x.id] !== undefined;
                const m = marcadas.includes(x.id);
                const eAtual = x.id === atualId;
                return (
                  <Button
                    key={x.id}
                    variant="outline"
                    size="icon"
                    aria-label={`Questão ${x.id}, ${r ? "respondida" : "em branco"}${m ? ", marcada para revisar" : ""}`}
                    aria-current={eAtual ? "step" : undefined}
                    onClick={() => aoIr(x.id - 1)}
                    className={cn(
                      "relative border-borda-controle",
                      r
                        ? "bg-marrom text-card hover:bg-marrom/85"
                        : m && "bg-mostarda text-grafite hover:bg-mostarda/85",
                    )}
                  >
                    {x.id}
                    {eAtual && (
                      // Anel da questão atual: surge apertando até o lugar. Monta de novo
                      // (e surge de novo) quando a questão atual muda.
                      <span
                        key={x.id}
                        aria-hidden
                        className="anel-atual pointer-events-none absolute -inset-1.5 rounded-full border-2 border-laranja-acao"
                        style={noPainel ? ({ "--atraso": "200ms" } as CSSProperties) : undefined}
                      />
                    )}
                    {m && (
                      // Selo de "marcada" no canto: legível sobre qualquer fundo e nos dois temas.
                      <span
                        aria-hidden
                        className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-mostarda text-grafite ring-2 ring-background"
                      >
                        <Flag className="size-3! fill-current" />
                      </span>
                    )}
                  </Button>
                );
              })}
          </div>
        </div>
      ))}
      <div className="border-t border-linha pt-4 text-sm">
        <p>
          {respondidas} {respondidas === 1 ? "respondida" : "respondidas"} · {brancas} em branco
        </p>
        <p className="mt-2 flex items-center gap-2">
          <Flag className="size-4 text-mostarda" aria-hidden />
          {marcadas.length} {marcadas.length === 1 ? "marcada" : "marcadas"} para revisar
        </p>
        <Button className="mt-4 w-full" onClick={aoRevisar}>
          Revisar e entregar
        </Button>
      </div>
    </div>
  );
});

/** Revisão antes de entregar: contagens, listas para voltar e o botão de entregar. */
const Revisao = memo(function Revisao({
  respostas,
  marcadas,
  aoIr,
  aoEntregar,
}: {
  respostas: Record<number, number>;
  marcadas: number[];
  aoIr: (indice: number) => void;
  aoEntregar: (origem: HTMLElement) => void;
}) {
  const brancas = questoes.filter((x) => respostas[x.id] === undefined);
  return (
    <>
      <Titulo titulo="Revisar antes de entregar" />
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { n: questoes.length - brancas.length, t: "Respondidas" },
          { n: brancas.length, t: "Em branco" },
          { n: marcadas.length, t: "Marcadas" },
        ].map((x) => (
          <div key={x.t} className="rounded-xl bg-creme p-3">
            <p className="font-display text-3xl font-black">{x.n}</p>
            <p className="text-sm">{x.t}</p>
          </div>
        ))}
      </div>
      <div className="my-5 rounded-xl bg-creme p-4">
        {brancas.length ? (
          brancas.length === 1 ? (
            "Você deixou 1 questão em branco. Ela conta como não respondida."
          ) : (
            `Você deixou ${brancas.length} questões em branco. Elas contam como não respondidas.`
          )
        ) : (
          <p className="flex items-center gap-2 text-acerto">
            <Check aria-hidden />
            Tudo respondido. Pode entregar quando quiser.
          </p>
        )}
      </div>
      {[
        { t: "Em branco", itens: brancas },
        { t: "Marcadas para revisar", itens: questoes.filter((x) => marcadas.includes(x.id)) },
      ].map((g) => (
        <Cartao key={g.t} titulo={g.t} className="mb-5">
          <div className="flex flex-wrap gap-2">
            {g.itens.length ? (
              g.itens.map((x) => (
                <Button key={x.id} variant="outline" onClick={() => aoIr(x.id - 1)}>
                  Ir para a questão {x.id}
                </Button>
              ))
            ) : (
              <p className="text-muted-foreground">Nenhuma questão nesta lista.</p>
            )}
          </div>
        </Cartao>
      ))}
      <Button className="w-full" onClick={(e) => aoEntregar(e.currentTarget)}>
        Entregar simulado
      </Button>
    </>
  );
});

/** Check do "Respostas salvas no aparelho": se desenha de novo a cada salvamento e fica quieto. */
function CheckSalvo({ vez }: { vez: number }) {
  return (
    <svg
      key={vez}
      viewBox="0 0 24 24"
      className="mt-0.5 size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path
        d="M4 12.5l5 5L20 6.5"
        pathLength={1}
        className={vez ? "anima-desenhar duracao-curta" : undefined}
      />
    </svg>
  );
}

/** Depois de entregar: um instante "Corrigindo sua prova…" (anel e check que se desenham). */
function Corrigindo({ refFoco }: { refFoco: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={refFoco}
      tabIndex={-1}
      className="anima-aparecer fixed inset-0 z-40 grid place-items-center bg-background p-6 outline-none"
    >
      <div className="flex max-w-xs flex-col items-center text-center">
        <svg
          viewBox="0 0 48 48"
          className="size-16 text-laranja-acao"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="24" cy="24" r="21" className="stroke-linha" />
          <circle
            cx="24"
            cy="24"
            r="21"
            pathLength={1}
            transform="rotate(-90 24 24)"
            className="corrigindo-anel"
          />
          <path d="M15 24.5l6 6L33 18" pathLength={1} className="corrigindo-check" />
        </svg>
        <p className="mt-5 font-display text-2xl font-bold">Corrigindo sua prova…</p>
        <p className="mt-2 text-muted-foreground">Separando acertos, erros e questões em branco.</p>
      </div>
    </div>
  );
}

/** Abre (ou retoma) a tentativa no banco e mostra a prova. */
export function Prova({ id }: { id: string }) {
  const [dados, setDados] = useState<ProvaCarregada | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    let ativo = true;
    setDados(null);
    setErro(null);
    abrirProva(id)
      .then((d) => {
        if (!ativo) return;
        questoes = d.questoes;
        setDados(d);
      })
      .catch((e: unknown) => ativo && setErro(e instanceof Error ? e.message : String(e)));
    return () => {
      ativo = false;
    };
  }, [id]);
  if (erro)
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6">
        <EstadoVazio
          titulo="Não foi possível abrir o simulado"
          texto={erro}
          acao={
            <Button asChild>
              <Link to="/app/simulados">Voltar para Simulados</Link>
            </Button>
          }
        />
      </main>
    );
  if (!dados || !dados.questoes.length)
    return (
      <main className="p-6">
        <Carregando texto="Abrindo o simulado…" />
      </main>
    );
  return <ProvaAberta key={dados.tentativaId} dados={dados} />;
}

function ProvaAberta({ dados }: { dados: ProvaCarregada }) {
  const p = useProva(dados);
  const navigate = useNavigate();
  const router = useRouter();
  const [escuro, setEscuro] = useState(false);
  const [tamanho, setTamanho] = useState(17);
  // Som ao avançar: ligado por padrão; a escolha fica no aparelho (lida depois de montar).
  const [som, setSom] = useState(true);
  useEffect(() => setSom(somLigadoSalvo()), []);
  const trocarSom = () => {
    const ligado = !som;
    setSom(ligado);
    guardarSom(ligado);
    if (ligado) tocarAvanco();
  };
  const [opcoes, setOpcoes] = useState(false);
  const [mapa, setMapa] = useState(false);
  const semRede = p.semRede;
  const [mostrarTempo, setMostrarTempo] = useState(true);
  const [revisao, setRevisao] = useState(false);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  // Guardado à parte para o texto não trocar enquanto o diálogo fecha.
  const [tipoConfirmacao, setTipoConfirmacao] = useState<"sair" | "entregar">("entregar");
  const [corrigindo, setCorrigindo] = useState(false);
  // Direção da última troca de questão; null no carregamento (nada desliza ao abrir).
  const [direcao, setDirecao] = useState<"frente" | "tras" | null>(null);
  // Só a ação que acabou de acontecer ganha o pop (nunca ao rever uma questão já respondida).
  const [recem, setRecem] = useState<{ alternativa?: number; bandeira?: boolean }>({});
  const [salvamentos, setSalvamentos] = useState(0);
  // Minuto cujo pulso do cronômetro já terminou (o anel sai do DOM, sem sobra invisível).
  const [pulsoFeito, setPulsoFeito] = useState<number | null>(null);
  // Com movimento reduzido, o cronômetro não pulsa (a cor da faixa e o aviso já bastam).
  const reduzido = useMovimentoReduzido();
  // Avisos para leitor de tela: troca de questão e faixas do cronômetro.
  const [aviso, setAviso] = useState("");
  const cabecalho = useRef<HTMLElement>(null);
  const corpo = useRef<HTMLElement>(null);
  const telaCorrigindo = useRef<HTMLDivElement>(null);
  const focarCorpo = useRef(false);
  const entregando = useRef(false);
  // Mapa, "Aa" e confirmações abrem sem Trigger do Radix: ao fechar, o foco volta a quem abriu.
  const abridor = useRef<HTMLElement | null>(null);
  const devolverFoco = (e: Event) => {
    e.preventDefault();
    abridor.current?.focus();
  };
  const simulado = dados.simulado;
  const { atual, restante, respostas, marcadas } = p.estado;
  const q = questoes[atual];
  const chave = revisao ? "revisao" : `questao-${atual}`;
  // O mapa (escondido no celular) pode atualizar um instante depois do toque.
  const respostasMapa = useDeferredValue(respostas);
  const marcadasMapa = useDeferredValue(marcadas);
  const atualMapa = useDeferredValue(revisao ? null : q.id);

  /** Vai para a questão de índice n (saindo da revisão, se for o caso). */
  const irPara = (n: number, { focar = false } = {}) => {
    const destino = Math.min(questoes.length - 1, Math.max(0, n));
    setMapa(false);
    if (!revisao && destino === atual) return;
    setDirecao(!revisao && destino > atual ? "frente" : "tras");
    setRecem({});
    setRevisao(false);
    focarCorpo.current = focar;
    const area = areas.find((a) => a.id === questoes[destino].area)?.nome;
    setAviso(`Questão ${destino + 1} de ${questoes.length}, ${area}.`);
    p.ir(destino);
  };
  const abrirRevisao = useEstavel(() => {
    setMapa(false);
    if (revisao) return;
    setDirecao("frente");
    setRecem({});
    setRevisao(true);
    setAviso("Revisão antes de entregar.");
  });
  const irPeloMapa = useEstavel((n: number) => irPara(n));
  // Os botões da revisão somem: o foco vai para a questão escolhida.
  const irPelaRevisao = useEstavel((n: number) => irPara(n, { focar: true }));
  const voltar = () => irPara(revisao ? atual : atual - 1);
  const avancar = () => {
    if (revisao) return;
    if (som) tocarAvanco();
    if (atual === questoes.length - 1) abrirRevisao();
    else irPara(atual + 1);
  };
  const confirmar = (tipo: "sair" | "entregar", origem: HTMLElement) => {
    abridor.current = origem;
    setTipoConfirmacao(tipo);
    setConfirmacaoAberta(true);
  };
  const confirmarEntrega = useEstavel((origem: HTMLElement) => confirmar("entregar", origem));
  // Modo escuro: um crossfade só da tela inteira (View Transition "troca-de-tema", 140ms, só
  // opacidade, na GPU), nunca a cor de cada elemento transicionando. Sem suporte a tipos de
  // View Transition ou com movimento reduzido, a troca é instantânea.
  const trocarTema = () => {
    const aplicar = () => setEscuro((v) => !v);
    if (
      movimentoReduzidoAgora() ||
      typeof document.startViewTransition !== "function" ||
      !CSS.supports?.("selector(:active-view-transition-type(a))")
    )
      return aplicar();
    document.startViewTransition({
      update: () => flushSync(aplicar),
      types: ["troca-de-tema"],
    });
  };
  const salvou = () => setSalvamentos((n) => n + 1);
  const escolher = useEstavel((i: number) => {
    if (respostas[q.id] !== i) salvou();
    setRecem({ alternativa: i });
    p.responder(q.id, i);
  });
  const riscar = useEstavel((i: number) => {
    salvou();
    p.riscar(q.id, i);
  });
  const mover = useEstavel((i: number, passo: 1 | -1, alvo: HTMLElement) => {
    const proxima = (i + passo + LETRAS.length) % LETRAS.length;
    escolher(proxima);
    const grupo = alvo.closest("[role=radiogroup]");
    grupo?.querySelectorAll<HTMLElement>("[role=radio]")[proxima]?.focus();
  });

  // Setas do teclado trocam de questão (fora de campos, das alternativas e de diálogos abertos).
  const aoTeclar = useEstavel((e: KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (!p.pronto || mapa || opcoes || confirmacaoAberta || corrigindo) return;
    const alvo = e.target;
    if (
      alvo instanceof HTMLElement &&
      (["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName) ||
        alvo.isContentEditable ||
        alvo.getAttribute("role") === "radio")
    )
      return;
    if (e.key === "ArrowRight" && !revisao) {
      e.preventDefault();
      avancar();
    }
    if (e.key === "ArrowLeft" && (revisao || atual > 0)) {
      e.preventDefault();
      voltar();
    }
  });
  useEffect(() => {
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aoTeclar]);

  // Nova questão (ou a revisão): a rolagem volta ao topo dela antes do 1º desenho, sem animar
  // (o deslize do corpo já mostra a troca). Vindo de um botão que some, o foco vai para ela.
  const chaveAnterior = useRef(chave);
  useEfeitoDeLayout(() => {
    if (chaveAnterior.current === chave) return;
    chaveAnterior.current = chave;
    const el = corpo.current;
    if (!el) return;
    const folga = (cabecalho.current?.offsetHeight ?? 0) + 12;
    const topo = el.getBoundingClientRect().top + window.scrollY - folga;
    if (window.scrollY > topo) window.scrollTo({ top: Math.max(0, topo), behavior: "instant" });
    if (focarCorpo.current) el.focus({ preventScroll: true });
    focarCorpo.current = false;
  }, [chave]);

  // Cronômetro: avisa o leitor de tela ao entrar em cada faixa (não no carregamento).
  const faixa = faixaDoTempo(restante);
  const faixaAnterior = useRef<number | null>(null);
  useEffect(() => {
    if (!p.pronto) return;
    const antes = faixaAnterior.current;
    faixaAnterior.current = faixa;
    if (antes !== null && faixa > antes) setAviso(AVISO_DA_FAIXA[faixa]);
  }, [faixa, p.pronto]);

  // Depois de entregar: "Corrigindo sua prova…" por um instante e o resultado (já pré-carregado
  // enquanto o anel se desenha, para abrir na hora: tudo em cerca de 1s).
  useEffect(() => {
    if (!corrigindo) return;
    const destino = { to: "/app/resultado/$id", params: { id: dados.tentativaId } } as const;
    void router.preloadRoute(destino).catch(() => {});
    const relogio = setTimeout(() => void navigate(destino), movimentoReduzidoAgora() ? 600 : 950);
    return () => clearTimeout(relogio);
  }, [corrigindo, navigate, router, dados.tentativaId]);

  // Entrega: manda o que faltou salvar e corrige no banco.
  const entregar = useEstavel(async () => {
    if (entregando.current) return;
    entregando.current = true;
    try {
      if (!(await p.enviarPendentes()))
        throw new Error("Sem conexão. Suas respostas serão enviadas quando a internet voltar.");
      await entregarProva(dados.tentativaId);
      p.setEstado((e) => ({ ...e, entregue: true }));
      setAviso("Corrigindo sua prova…");
      setCorrigindo(true);
    } catch (e) {
      entregando.current = false;
      toast.error(e instanceof Error ? e.message : "Não foi possível entregar. Tente de novo.");
    }
  });
  // Tempo esgotado: entrega sozinha.
  useEffect(() => {
    if (p.pronto && !p.estado.entregue && p.estado.restante === 0) void entregar();
  }, [p.pronto, p.estado.entregue, p.estado.restante, entregar]);

  if (!p.pronto)
    return (
      <main className="p-6">
        <Carregando texto="Recuperando suas respostas…" />
      </main>
    );
  // Voltou para a prova depois de entregar (ex.: botão Voltar do navegador): nada de responder
  // de novo em silêncio; o caminho fica claro.
  if (p.estado.entregue && !corrigindo)
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6">
        <h1 className="sr-only">{simulado.titulo}</h1>
        <EstadoVazio
          icon={ClipboardCheck}
          titulo="Você já entregou este simulado"
          texto="Suas respostas já foram corrigidas. Veja o resultado ou faça o simulado de novo."
          acao={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/app/resultado/$id" params={{ id: dados.tentativaId }}>
                  Ver resultado
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/simulados/$id" params={{ id: simulado.id }}>
                  Fazer de novo
                </Link>
              </Button>
            </div>
          }
        />
      </main>
    );

  const brancas = questoes.filter((x) => respostas[x.id] === undefined).length;
  const marcada = marcadas.includes(q.id);
  const resposta = respostas[q.id];
  const riscadas = p.estado.riscadas[q.id] ?? SEM_RISCOS;
  const tempo = `${Math.floor(restante / 3600)}:${String(Math.floor(restante / 60) % 60).padStart(2, "0")}:${String(restante % 60).padStart(2, "0")}`;
  // Pulso nos últimos 5 minutos: o anel monta de novo a cada minuto (5:00, 4:00… 1:00).
  const minutoFinal = restante > 0 && restante <= 300 ? Math.ceil(restante / 60) : null;

  const sair = () => {
    toast("Suas respostas estão salvas. Continue quando quiser.");
    void navigate({ to: "/app/simulados" });
  };

  return (
    // scroll-padding na página (html) enquanto a prova está aberta: o Tab e o scrollIntoView param
    // o item acima do rodapé fixo (73px) e abaixo do cabeçalho (59px), nunca escondido atrás deles.
    <div
      className={cn(
        "min-h-dvh bg-background text-foreground [html:has(&)]:scroll-pt-[71px] [html:has(&)]:scroll-pb-[calc(85px+env(safe-area-inset-bottom))]",
        escuro && "prova-escura",
      )}
    >
      <div inert={corrigindo}>
        <header ref={cabecalho} className="sticky top-0 z-30 bg-card">
          <div className="flex h-14 items-center gap-1 px-2 lg:mx-auto lg:max-w-[1120px]">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sair da prova"
              onClick={(e) => confirmar("sair", e.currentTarget)}
            >
              <X />
            </Button>
            <span className="min-w-0 flex-1 text-[15px] font-semibold">
              {revisao ? (
                "Revisão"
              ) : (
                <>
                  <span className="hidden min-[400px]:inline">Questão </span>
                  <span className="sr-only min-[400px]:hidden">Questão </span>
                  {q.id}
                  <span className="min-[400px]:hidden">/{questoes.length}</span>
                  <span className="hidden min-[400px]:inline"> de {questoes.length}</span>
                </>
              )}
            </span>
            <Button
              variant="ghost"
              className={cn(
                "cor-suave relative px-2 text-[13px] tabular-nums",
                faixa >= 2
                  ? "bg-mostarda text-grafite hover:bg-mostarda"
                  : faixa === 1
                    ? "bg-creme text-laranja-acao"
                    : "bg-creme",
              )}
              aria-label={
                mostrarTempo
                  ? `Tempo restante: ${tempoPorExtenso(restante)}. Esconder tempo`
                  : "Mostrar tempo"
              }
              onClick={() => setMostrarTempo(!mostrarTempo)}
            >
              {minutoFinal && minutoFinal !== pulsoFeito && !reduzido && (
                <span
                  key={minutoFinal}
                  aria-hidden
                  onAnimationEnd={() => setPulsoFeito(minutoFinal)}
                  className="tempo-pulso pointer-events-none absolute inset-0 rounded-[inherit] border-2 border-mostarda"
                />
              )}
              <Clock
                className={cn("cor-suave size-4", faixa >= 2 ? "text-grafite" : "text-laranja")}
              />
              {mostrarTempo ? tempo : "Mostrar tempo"}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                abridor.current = e.currentTarget;
                setOpcoes(true);
              }}
              aria-label="Opções de leitura"
            >
              Aa
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                abridor.current = e.currentTarget;
                setMapa(true);
              }}
              aria-label="Mapa de questões"
            >
              <LayoutGrid />
            </Button>
          </div>
          <div className="h-[3px] overflow-hidden bg-creme">
            <Preenchimento
              fracao={revisao ? 1 : (atual + 1) / questoes.length}
              className="duracao-curta bg-laranja"
            />
          </div>
        </header>
        <div
          aria-live="polite"
          className={cn(
            "cor-suave px-4 py-2 text-sm",
            semRede ? "bg-mostarda text-grafite" : "text-muted-foreground",
          )}
        >
          <div className="mx-auto flex max-w-[1120px] items-start gap-2">
            {semRede ? (
              <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : (
              <CheckSalvo vez={salvamentos} />
            )}
            {semRede
              ? "Sem conexão. Vamos enviar suas respostas assim que a internet voltar."
              : "Respostas salvas"}
          </div>
        </div>
        <div className="mx-auto flex max-w-[1120px] gap-8 px-4 pb-28 pt-4">
          <main className="mx-auto w-full min-w-0 max-w-[720px]">
            <p className="mb-5 text-sm text-muted-foreground">{simulado.titulo}</p>
            <section
              key={chave}
              ref={corpo}
              tabIndex={-1}
              aria-label={revisao ? "Revisão antes de entregar" : `Questão ${q.id}`}
              className={cn(
                "outline-none",
                direcao === "frente" && "questao-da-direita",
                direcao === "tras" && "questao-da-esquerda",
              )}
            >
              {revisao ? (
                <Revisao
                  respostas={respostas}
                  marcadas={marcadas}
                  aoIr={irPelaRevisao}
                  aoEntregar={confirmarEntrega}
                />
              ) : (
                <div className={`leitura-${tamanho}`}>
                  <AreaChip area={q.area} />
                  <div className="mt-5">
                    <TextoQuestaoFixo q={q} />
                  </div>
                  <div
                    role="radiogroup"
                    aria-labelledby={`enunciado-${q.id}`}
                    className="space-y-3"
                  >
                    {q.alternativas.map((a, i) => (
                      <Alternativa
                        key={i}
                        indice={i}
                        texto={a}
                        escolhida={resposta === i}
                        riscada={riscadas.includes(i)}
                        recemEscolhida={recem.alternativa === i}
                        focavel={resposta === undefined ? i === 0 : resposta === i}
                        aoEscolher={escolher}
                        aoRiscar={riscar}
                        aoMover={mover}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </main>
          <aside className="sticky top-24 hidden max-h-[calc(100dvh-120px)] w-[320px] shrink-0 overflow-auto border-l border-linha pl-6 lg:block">
            <MapaQuestoes
              respostas={respostasMapa}
              marcadas={marcadasMapa}
              atualId={atualMapa}
              noPainel={false}
              aoIr={irPeloMapa}
              aoRevisar={abrirRevisao}
            />
          </aside>
        </div>
        <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-linha bg-card pb-[env(safe-area-inset-bottom)]">
          {/* No desktop, repete a grade do corpo (coluna de 720px + mapa de 320px) para alinhar à leitura. */}
          <div className="mx-auto flex max-w-[1120px] gap-8 lg:px-4">
            <div className="mx-auto flex h-[72px] w-full min-w-0 max-w-[720px] items-center gap-2 px-3 lg:px-0">
              <Button
                variant="outline"
                size="icon"
                className="size-12 shrink-0 border-borda-controle"
                aria-label={revisao ? "Voltar para a questão" : "Questão anterior"}
                disabled={atual === 0 && !revisao}
                onClick={voltar}
              >
                <ChevronLeft />
              </Button>
              {!revisao && (
                <Button
                  variant="ghost"
                  className={cn("px-3", marcada && "bg-mostarda text-grafite hover:bg-mostarda")}
                  onClick={() => {
                    setRecem({ bandeira: !marcada });
                    salvou();
                    p.marcar(q.id);
                  }}
                  aria-pressed={marcada}
                >
                  <Flag
                    className={cn(
                      marcada && "fill-current",
                      marcada && recem.bandeira && "anima-pop",
                    )}
                  />
                  {marcada ? "Marcada" : "Revisar"}
                </Button>
              )}
              <Button
                className="min-w-0 flex-1 whitespace-normal px-2 py-1 text-sm leading-tight"
                onClick={(e) => (revisao ? confirmar("entregar", e.currentTarget) : avancar())}
              >
                {revisao
                  ? "Entregar"
                  : atual === questoes.length - 1
                    ? "Revisar e entregar"
                    : "Próxima"}
                <ChevronRight />
              </Button>
            </div>
            <div className="hidden w-[320px] shrink-0 lg:block" aria-hidden />
          </div>
        </footer>
      </div>
      <p role="status" className="sr-only">
        {aviso}
      </p>
      {corrigindo && <Corrigindo refFoco={telaCorrigindo} />}
      <Sheet open={mapa} onOpenChange={setMapa}>
        <SheetContent
          side="bottom"
          onCloseAutoFocus={devolverFoco}
          className={cn("max-h-[85dvh] overflow-auto bg-background", escuro && "prova-escura")}
        >
          <SheetTitle className="sr-only">Mapa de questões</SheetTitle>
          <SheetDescription className="sr-only">
            Escolha uma questão para continuar.
          </SheetDescription>
          <MapaQuestoes
            respostas={respostas}
            marcadas={marcadas}
            atualId={revisao ? null : q.id}
            noPainel
            aoIr={irPeloMapa}
            aoRevisar={abrirRevisao}
          />
        </SheetContent>
      </Sheet>
      <Dialog open={opcoes} onOpenChange={setOpcoes}>
        <DialogContent
          onCloseAutoFocus={devolverFoco}
          className={cn(
            "max-w-[calc(100%-32px)] rounded-xl bg-background sm:max-w-md",
            escuro && "prova-escura",
          )}
        >
          <DialogTitle>Opções de leitura</DialogTitle>
          <DialogDescription>Ajuste o texto, a aparência e o som da prova.</DialogDescription>
          <div className="flex items-center justify-between gap-3">
            <span id="rotulo-tamanho">Tamanho do texto</span>
            <div className="flex shrink-0 gap-2" role="group" aria-labelledby="rotulo-tamanho">
              <Button
                variant="outline"
                size="icon"
                aria-label="Diminuir texto"
                disabled={tamanho === 17}
                onClick={() => setTamanho(tamanho - 2)}
              >
                <Minus />
              </Button>
              <span className="self-center tabular-nums" aria-live="polite">
                {tamanho}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Aumentar texto"
                disabled={tamanho === 23}
                onClick={() => setTamanho(tamanho + 2)}
              >
                <Plus />
              </Button>
            </div>
          </div>
          <Button variant="outline" aria-pressed={escuro} onClick={trocarTema}>
            {escuro ? <Sun /> : <Moon />}Modo escuro
          </Button>
          <Button variant="outline" aria-pressed={som} onClick={trocarSom}>
            {som ? <Volume2 /> : <VolumeX />}Som ao avançar
          </Button>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmacaoAberta} onOpenChange={setConfirmacaoAberta}>
        <AlertDialogContent
          className={cn("max-w-[calc(100%-32px)] rounded-xl sm:max-w-md", escuro && "prova-escura")}
          onCloseAutoFocus={(e) => {
            // Entregou: o foco vai para a tela "Corrigindo", não para a prova (que fica inerte).
            if (!entregando.current) return devolverFoco(e);
            e.preventDefault();
            telaCorrigindo.current?.focus();
          }}
        >
          <AlertDialogTitle>
            {tipoConfirmacao === "sair" ? "Sair da prova?" : "Entregar agora?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {tipoConfirmacao === "sair"
              ? "Suas respostas ficam salvas e você continua depois."
              : `${
                  brancas === 0
                    ? ""
                    : brancas === 1
                      ? "1 questão ficou em branco. "
                      : `${brancas} questões ficaram em branco. `
                }Depois de entregar, não dá para mudar as respostas.`}
          </AlertDialogDescription>
          <div className="flex flex-wrap justify-end gap-2">
            <AlertDialogCancel>Voltar à prova</AlertDialogCancel>
            <AlertDialogAction onClick={tipoConfirmacao === "sair" ? sair : () => void entregar()}>
              {tipoConfirmacao === "sair" ? "Sair e salvar" : "Entregar simulado"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
