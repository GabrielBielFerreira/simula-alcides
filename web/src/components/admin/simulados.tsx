import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  CalendarCheck,
  CalendarClock,
  CheckCheck,
  Clock,
  Eye,
  Lock,
  MapPin,
  PencilLine,
  Plus,
  Send,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Campo,
  DURACAO,
  EstadoVazio,
  Preenchimento,
  Revelar,
  movimentoReduzidoAgora,
} from "@/components/ds";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { POLO_DA_COORDENACAO, buscarPolo, dadosPolos, externos } from "@/data/coordenacao";
import {
  dataCurta,
  dataPorExtenso,
  diasAte,
  horaCurta,
  modalidadesSimulado,
  participacaoSimulado,
  simuladosGestao,
  type Liberacao,
  type ModalidadeSimulado,
  type Montagem,
  type SimuladoGestao,
  type StatusSimulado,
} from "@/data/admin-apoio";
import { AGORA_DEMO } from "@/data/tempo";
import { CabecalhoAdmin, StatCard, usePapelCoordenacao } from "./ui";
import {
  BilheteData,
  OpcaoEscolha,
  PilulaFiltro,
  TituloBloco,
  classeCampo,
  classeLinha,
  classeTd,
  classeTh,
  sobretituloDoPapel,
  ContagemSuave,
  useAnimaAoMudar,
  useEntradaPorAcao,
  useListaNova,
  focarAntesDeSumir,
  primeiroDoGrupo,
} from "./apoio";

/* ---------- Regras de exibição ---------- */

const ordemStatus: StatusSimulado[] = ["Agendado", "Rascunho", "Encerrado"];

/** Agendados do mais próximo ao mais distante; encerrados do mais recente ao mais antigo. */
function ordenar(lista: SimuladoGestao[]) {
  return [...lista].sort(
    (a, b) =>
      ordemStatus.indexOf(a.status) - ordemStatus.indexOf(b.status) ||
      (a.status === "Encerrado"
        ? b.abertura.localeCompare(a.abertura)
        : a.abertura.localeCompare(b.abertura)),
  );
}

const nomeModalidade = (id: ModalidadeSimulado) =>
  modalidadesSimulado.find((m) => m.id === id)?.nome ?? "";
const resumoModalidade = (id: ModalidadeSimulado) =>
  modalidadesSimulado.find((m) => m.id === id)?.resumo ?? "";

function textoPolos(s: SimuladoGestao) {
  if (s.polos.length === dadosPolos.length) return "Os 6 polos da Rede";
  const nomes = s.polos.map((p) => buscarPolo(p)?.nomeCurto ?? p);
  return nomes.length > 1 ? `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}` : nomes[0];
}

function textoPeriodo(s: SimuladoGestao) {
  const inicio = dataCurta(s.abertura);
  const fim = dataCurta(s.fechamento);
  const horas = `${horaCurta(s.abertura)} às ${horaCurta(s.fechamento)}`;
  return inicio === fim
    ? { data: inicio, horas }
    : { data: `${inicio.slice(0, 5)} a ${fim}`, horas };
}

/** A coordenação do polo só age sobre o que é só do seu Compaz (o resto é da coordenação central). */
const soDoPolo = (s: SimuladoGestao) => s.polos.every((p) => p === POLO_DA_COORDENACAO);

const textoLiberacao = (l: Liberacao) =>
  l === "fechamento" ? "Resultado após o fechamento" : "Resultado na hora da entrega";

const estilosStatus: Record<StatusSimulado, { icone: LucideIcon; classe: string }> = {
  Agendado: { icone: CalendarClock, classe: "bg-laranja-acao/10 text-laranja-acao" },
  Rascunho: {
    icone: PencilLine,
    classe: "border border-dashed border-borda-controle bg-card text-muted-foreground",
  },
  Encerrado: { icone: CheckCheck, classe: "bg-creme text-marrom ring-1 ring-linha" },
};

function PilulaSimulado({ status }: { status: StatusSimulado }) {
  const { icone: Icone, classe } = estilosStatus[status];
  // Ao publicar, a pílula nova surge no lugar da de rascunho (no carregamento, não).
  const surgir = useAnimaAoMudar(status, "anima-surgir");
  return (
    <span
      key={status}
      onAnimationEnd={surgir.onAnimationEnd}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold",
        classe,
        surgir.className,
      )}
    >
      <Icone className="size-4 shrink-0" aria-hidden />
      {status}
    </span>
  );
}

/* ---------- Tela ---------- */

type Filtro = StatusSimulado | "Todos";

const useEfeitoDeLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;
const CURVA_ENTRA_SAI = "cubic-bezier(0.65, 0, 0.35, 1)";

/** Itens da lista visíveis agora (a tabela no desktop ou os cartões no celular). */
const itensVisiveis = () =>
  [...document.querySelectorAll<HTMLElement>("[data-simulado]")].filter(
    (el) => el.getClientRects().length > 0,
  );

/**
 * Põe o foco no título de um simulado da lista (e rola até ele, se preciso). Se o filtro o
 * esconde (ex.: "Rascunhos"), o foco vai para o título da lista.
 */
function focarTituloSimulado(id: string) {
  const titulo =
    itensVisiveis()
      .find((el) => el.dataset.simulado === id)
      ?.querySelector<HTMLElement>("[data-titulo-simulado]") ??
    document.getElementById("titulo-lista");
  if (!titulo) return;
  titulo.focus({ preventScroll: true });
  titulo.scrollIntoView({
    block: "nearest",
    behavior: movimentoReduzidoAgora() ? "auto" : "smooth",
  });
}

/**
 * Publicar ou criar muda a ordem da lista (agendados primeiro). Cada simulado desliza do lugar
 * antigo para o novo (FLIP: mede antes, mede depois e anima só o transform, 360ms) e o foco vai
 * para o título do que acabou de ser publicado, já que o botão "Publicar" sai da tela.
 */
function useReordenarSuave(lista: SimuladoGestao[]) {
  const antes = useRef<Map<string, DOMRect> | null>(null);
  const focarEm = useRef<string | null>(null);
  useEfeitoDeLayout(() => {
    const posicoes = antes.current;
    antes.current = null;
    if (posicoes && !movimentoReduzidoAgora()) {
      for (const el of itensVisiveis()) {
        const antiga = posicoes.get(el.dataset.simulado ?? "");
        if (!antiga) continue;
        const nova = el.getBoundingClientRect();
        const dx = antiga.left - nova.left;
        const dy = antiga.top - nova.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
        const animacao = el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
          { duration: DURACAO.media, easing: CURVA_ENTRA_SAI },
        );
        // Linhas da tabela não têm fundo: enquanto duas se cruzam, um fundo de cartão evita o
        // texto de uma por cima do da outra. Sai quando o movimento termina.
        const celulas = el.tagName === "TR" ? [...el.children].map((c) => c as HTMLElement) : [];
        for (const c of celulas) c.style.backgroundColor = "var(--card)";
        animacao.onfinish = animacao.oncancel = () => {
          for (const c of celulas) c.style.removeProperty("background-color");
        };
      }
    }
    const id = focarEm.current;
    focarEm.current = null;
    if (id) focarTituloSimulado(id);
  }, [lista]);
  return {
    /** Chame antes de mudar a lista. */
    lembrar(focar?: string) {
      antes.current = new Map(
        itensVisiveis().map((el) => [el.dataset.simulado ?? "", el.getBoundingClientRect()]),
      );
      focarEm.current = focar ?? null;
    },
  };
}

/** /admin/simulados · Gestão de simulados. A coordenação do polo vê só o que envolve o seu Compaz. */
export function GestaoSimulados() {
  const { ehPolo } = usePapelCoordenacao();
  const [lista, setLista] = useState<SimuladoGestao[]>(simuladosGestao);
  const [filtro, setFiltro] = useState<Filtro>("Todos");
  const [criando, setCriando] = useState(false);
  // Depois do primeiro filtro, publicação ou criação, o que entra na lista ganha um fade.
  const [mexeu, setMexeu] = useState(false);
  const reordenar = useReordenarSuave(lista);
  // Ao fechar o sheet o foco volta para quem o abriu; depois de criar, vai para o novo simulado.
  const abriuSheet = useRef<HTMLElement | null>(null);
  const criado = useRef<string | null>(null);
  const abrirNovo = (e: MouseEvent<HTMLElement>) => {
    abriuSheet.current = e.currentTarget;
    criado.current = null;
    setCriando(true);
  };
  const devolverFoco = () => {
    const id = criado.current;
    criado.current = null;
    if (id) focarTituloSimulado(id);
    else if (abriuSheet.current?.isConnected) abriuSheet.current.focus();
    else document.getElementById("titulo-lista")?.focus();
  };
  const filtrar = (f: Filtro) => {
    setFiltro(f);
    setMexeu(true);
  };

  const polosVisiveis = ehPolo ? [POLO_DA_COORDENACAO] : dadosPolos.map((p) => p.id);
  const visiveis = ordenar(lista.filter((s) => !ehPolo || s.polos.includes(POLO_DA_COORDENACAO)));
  const contagem = (st: StatusSimulado) => visiveis.filter((s) => s.status === st).length;
  const filtrados = filtro === "Todos" ? visiveis : visiveis.filter((s) => s.status === filtro);

  function publicar(id: string) {
    const s = lista.find((x) => x.id === id);
    if (!s) return;
    if (ehPolo && !soDoPolo(s)) {
      toast.error("Este rascunho é da coordenação central.", {
        description: "Ele vale para outros polos além do Paulo Freire.",
      });
      return;
    }
    if (new Date(s.abertura) <= AGORA_DEMO) {
      toast.error("Confira a data de abertura antes de publicar.");
      return;
    }
    reordenar.lembrar(id);
    setLista((atual) => atual.map((x) => (x.id === id ? { ...x, status: "Agendado" } : x)));
    setMexeu(true);
    toast.success(`“${s.titulo}” publicado`, {
      description: "Os estudantes dos polos escolhidos já veem no catálogo.",
    });
  }

  function adicionar(novo: SimuladoGestao) {
    reordenar.lembrar();
    criado.current = novo.id;
    setLista((atual) => [novo, ...atual]);
    setFiltro("Todos");
    setMexeu(true);
    setCriando(false);
  }

  return (
    <>
      <CabecalhoAdmin
        sobretitulo={sobretituloDoPapel(ehPolo)}
        titulo={ehPolo ? "Simulados do seu Compaz" : "Simulados da Rede"}
        subtitulo={
          ehPolo
            ? "Os simulados que envolvem o Compaz Paulo Freire: datas, resultado e participação."
            : "Agende as aplicações, escolha os polos e quando o resultado é liberado."
        }
        acoes={
          <Button onClick={abrirNovo}>
            <Plus />
            Novo simulado
          </Button>
        }
      />
      {/* O HTML do servidor já sai com a visão do papel padrão (coordenação central). */}
      <>
        <Resumo visiveis={visiveis} polosVisiveis={polosVisiveis} ehPolo={ehPolo} />
        <Revelar como="section" aria-labelledby="titulo-lista" className="mt-10">
          <TituloBloco id="titulo-lista" titulo="Todos os simulados" focavel>
            Agendados primeiro, depois rascunhos e encerrados.
          </TituloBloco>
          <div role="group" aria-label="Filtrar por situação" className="flex flex-wrap gap-2">
            <PilulaFiltro
              ativo={filtro === "Todos"}
              aoClicar={() => filtrar("Todos")}
              rotulo="Todos"
              contagem={visiveis.length}
            />
            {ordemStatus.map((st) => (
              <PilulaFiltro
                key={st}
                ativo={filtro === st}
                aoClicar={() => filtrar(st)}
                rotulo={`${st}s`}
                icone={estilosStatus[st].icone}
                contagem={contagem(st)}
              />
            ))}
          </div>
          {filtrados.length === 0 ? (
            <div className="anima-surgir mt-5">
              <EstadoVazio
                icon={PencilLine}
                titulo={`Nenhum simulado ${filtro === "Rascunho" ? "em rascunho" : (filtro.toLowerCase() as string)} agora`}
                texto="Comece um novo simulado ou veja a lista completa."
                acao={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={abrirNovo}>
                      <Plus />
                      Novo simulado
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        focarAntesDeSumir(primeiroDoGrupo("Filtrar por situação"));
                        filtrar("Todos");
                      }}
                    >
                      Ver todos
                    </Button>
                  </div>
                }
              />
            </div>
          ) : (
            <>
              {/* A lista troca inteira a cada filtro (cascata nas 8 primeiras linhas). */}
              <Tabela
                key={`tabela-${filtro}`}
                lista={filtrados}
                polosVisiveis={polosVisiveis}
                ehPolo={ehPolo}
                aoPublicar={publicar}
                mexeu={mexeu}
              />
              <Cartoes
                key={`cartoes-${filtro}`}
                lista={filtrados}
                polosVisiveis={polosVisiveis}
                ehPolo={ehPolo}
                aoPublicar={publicar}
                mexeu={mexeu}
              />
            </>
          )}
        </Revelar>
        <NovoSimulado
          aberto={criando}
          aoMudar={setCriando}
          aoFechar={devolverFoco}
          ehPolo={ehPolo}
          aoSalvar={adicionar}
          proximoId={lista.length + 1}
        />
      </>
    </>
  );
}

/* ---------- Resumo ---------- */

function Resumo({
  visiveis,
  polosVisiveis,
  ehPolo,
}: {
  visiveis: SimuladoGestao[];
  polosVisiveis: string[];
  ehPolo: boolean;
}) {
  const agendados = ordenar(visiveis.filter((s) => s.status === "Agendado"));
  const encerrados = visiveis.filter((s) => s.status === "Encerrado");
  const proximo = agendados[0];
  const ultimoOficial = ordenar(encerrados).find((s) => s.titulo.includes("Simulado da Rede"));
  const p = ultimoOficial ? participacaoSimulado(ultimoOficial, polosVisiveis) : null;
  return (
    <Revelar escalonar className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
      <StatCard
        rotulo="Agendados"
        icone={CalendarClock}
        valor={agendados.length}
        detalhe={
          proximo
            ? `Próximo: ${dataPorExtenso(proximo.abertura)}, às ${horaCurta(proximo.abertura)}`
            : "Nenhum agendado"
        }
      />
      <StatCard
        rotulo="Encerrados em 2026"
        icone={CalendarCheck}
        valor={encerrados.length}
        detalhe="Resultados já liberados para os estudantes"
      />
      {p && ultimoOficial && (
        <StatCard
          className="col-span-2 lg:col-span-1"
          rotulo="Participação no último oficial"
          icone={Users}
          valor={`${p.percentual}%`}
          detalhe={`${p.concluiram} de ${p.estudantes} estudantes ${ehPolo ? "do Paulo Freire" : "da Rede"} concluíram o ${ultimoOficial.titulo.split(" · ")[0]}`}
        />
      )}
    </Revelar>
  );
}

/* ---------- Lista ---------- */

function Participacao({
  s,
  polosVisiveis,
  ehPolo,
  aoPublicar,
}: {
  s: SimuladoGestao;
  polosVisiveis: string[];
  ehPolo: boolean;
  aoPublicar: (id: string) => void;
}) {
  if (s.status === "Rascunho" && ehPolo && !soDoPolo(s))
    return (
      <span className="inline-flex items-start gap-1.5 text-[15px] leading-snug text-muted-foreground">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        Rascunho da coordenação central
      </span>
    );
  if (s.status === "Rascunho")
    return (
      <Button variant="outline" size="sm" onClick={() => aoPublicar(s.id)}>
        <Send />
        Publicar<span className="sr-only"> {s.titulo}</span>
      </Button>
    );
  if (s.status === "Agendado") {
    const dias = diasAte(s.abertura);
    return (
      <span className="inline-flex items-center gap-1.5 text-[15px] text-muted-foreground">
        <CalendarClock className="size-4 shrink-0" aria-hidden />
        {dias <= 0 ? "Abre hoje" : dias === 1 ? "Abre amanhã" : `Abre em ${dias} dias`}
      </span>
    );
  }
  const p = participacaoSimulado(s, polosVisiveis);
  return (
    <div className="w-full min-w-36">
      <p className="flex items-baseline justify-between gap-2 text-[15px] tabular-nums">
        <span className="font-semibold text-marrom">
          {p.concluiram} de {p.estudantes}
        </span>
        <span className="text-muted-foreground">{p.percentual}%</span>
      </p>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-creme ring-1 ring-linha"
        aria-hidden
      >
        <Preenchimento fracao={p.percentual / 100} className="rounded-full bg-laranja-acao" />
      </div>
    </div>
  );
}

interface PropsLista {
  lista: SimuladoGestao[];
  polosVisiveis: string[];
  ehPolo: boolean;
  aoPublicar: (id: string) => void;
  /** A pessoa já filtrou, publicou ou criou: o que entra na lista ganha um fade. */
  mexeu: boolean;
}

type PropsItem = Omit<PropsLista, "lista" | "mexeu"> & {
  s: SimuladoGestao;
  entrada: boolean;
  posicao: number;
};

/** Título do simulado: recebe o foco depois de publicar (o botão "Publicar" some). */
function TituloSimulado({ s, className }: { s: SimuladoGestao; className?: string }) {
  return (
    <span data-titulo-simulado tabIndex={-1} className={cn("block rounded-md", className)}>
      {s.titulo}
    </span>
  );
}

/** Desktop: tabela com cabeçalho fixo. */
function Tabela({ lista, mexeu, ...props }: PropsLista) {
  const nova = useListaNova();
  return (
    <div className="cartao mt-5 hidden xl:block">
      <table className="w-full border-separate border-spacing-0 text-[15px]">
        <caption className="sr-only">
          Simulados: agendados primeiro, depois rascunhos e encerrados
        </caption>
        <thead>
          <tr>
            <th scope="col" className={classeTh}>
              Simulado
            </th>
            <th scope="col" className={classeTh}>
              Polos
            </th>
            <th scope="col" className={classeTh}>
              Abre e fecha
            </th>
            <th scope="col" className={classeTh}>
              Situação
            </th>
            <th scope="col" className={cn(classeTh, "w-48")}>
              Participação
            </th>
          </tr>
        </thead>
        <tbody>
          {lista.map((s, i) => (
            <LinhaSimulado key={s.id} s={s} entrada={mexeu} posicao={nova ? i : 0} {...props} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LinhaSimulado({ s, entrada, posicao, polosVisiveis, ehPolo, aoPublicar }: PropsItem) {
  const periodo = textoPeriodo(s);
  const { classe, estilo, aoTerminar } = useEntradaPorAcao(entrada, posicao);
  return (
    <tr
      onAnimationEnd={aoTerminar}
      data-simulado={s.id}
      className={cn(classeLinha, classe)}
      style={estilo}
    >
      <td className={classeTd}>
        <div className="flex items-center gap-4">
          <BilheteData iso={s.abertura} />
          <div className="min-w-0">
            <TituloSimulado s={s} className="font-semibold leading-snug text-marrom" />
            <p className="text-sm leading-snug text-muted-foreground">
              {nomeModalidade(s.modalidade)} · {resumoModalidade(s.modalidade)}
            </p>
          </div>
        </div>
      </td>
      <td className={classeTd}>
        <p className="leading-snug text-marrom">{textoPolos(s)}</p>
        {s.externos && (
          <p className="text-sm leading-snug text-muted-foreground">+ externos e independentes</p>
        )}
      </td>
      <td className={cn(classeTd, "whitespace-nowrap")}>
        <p className="tabular-nums text-marrom">{periodo.data}</p>
        <p className="text-sm text-muted-foreground">{periodo.horas}</p>
      </td>
      <td className={classeTd}>
        <PilulaSimulado status={s.status} />
        <p className="mt-1 text-sm leading-snug text-muted-foreground">
          {textoLiberacao(s.liberacao)}
        </p>
      </td>
      <td className={classeTd}>
        <Participacao s={s} polosVisiveis={polosVisiveis} ehPolo={ehPolo} aoPublicar={aoPublicar} />
      </td>
    </tr>
  );
}

function Linha({ icone: Icone, children }: { icone: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Icone className="mt-1 size-4 shrink-0 text-laranja" aria-hidden />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

/** Celular e tablet: um cartão por simulado. */
function Cartoes({ lista, mexeu, ...props }: PropsLista) {
  const nova = useListaNova();
  return (
    <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:hidden">
      {lista.map((s, i) => (
        <CartaoSimulado key={s.id} s={s} entrada={mexeu} posicao={nova ? i : 0} {...props} />
      ))}
    </ul>
  );
}

function CartaoSimulado({ s, entrada, posicao, polosVisiveis, ehPolo, aoPublicar }: PropsItem) {
  const periodo = textoPeriodo(s);
  const { classe, estilo, aoTerminar } = useEntradaPorAcao(entrada, posicao);
  return (
    <li
      onAnimationEnd={aoTerminar}
      data-simulado={s.id}
      className={cn("cartao flex min-w-0 flex-col p-4 sm:p-5", classe)}
      style={estilo}
    >
      <div className="flex items-start gap-3">
        <BilheteData iso={s.abertura} />
        <div className="min-w-0 flex-1">
          <PilulaSimulado status={s.status} />
          <h3 className="mt-2 font-sans text-[17px] font-semibold leading-snug text-marrom">
            <TituloSimulado s={s} />
          </h3>
          <p className="text-sm text-muted-foreground">
            {nomeModalidade(s.modalidade)} · {resumoModalidade(s.modalidade)}
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-1.5 text-[15px] text-marrom">
        <Linha icone={MapPin}>
          {textoPolos(s)}
          {s.externos && " + externos e independentes"}
        </Linha>
        <Linha icone={Clock}>
          {periodo.data} · {periodo.horas}
        </Linha>
        <Linha icone={Eye}>{textoLiberacao(s.liberacao)}</Linha>
      </ul>
      <div className="mt-auto pt-4">
        <Participacao s={s} polosVisiveis={polosVisiveis} ehPolo={ehPolo} aoPublicar={aoPublicar} />
      </div>
    </li>
  );
}

/* ---------- Novo simulado (sheet) ---------- */

interface Erros {
  nome?: string;
  abertura?: string;
  fechamento?: string;
  polos?: string;
}

function NovoSimulado({
  aberto,
  aoMudar,
  aoFechar,
  ehPolo,
  aoSalvar,
  proximoId,
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  /** Chamado quando o sheet termina de fechar, para pôr o foco no lugar certo. */
  aoFechar: () => void;
  ehPolo: boolean;
  aoSalvar: (s: SimuladoGestao) => void;
  proximoId: number;
}) {
  const todosPolos = dadosPolos.map((p) => p.id);
  const [nome, setNome] = useState("");
  const [modalidade, setModalidade] = useState<ModalidadeSimulado>("dia-1");
  const [montagem, setMontagem] = useState<Montagem>("automatica");
  const [dataAbre, setDataAbre] = useState("2026-11-14");
  const [horaAbre, setHoraAbre] = useState("13:00");
  const [dataFecha, setDataFecha] = useState("2026-11-14");
  const [horaFecha, setHoraFecha] = useState("18:30");
  const [polos, setPolos] = useState<string[]>(todosPolos);
  const [comExternos, setComExternos] = useState(false);
  const [liberacao, setLiberacao] = useState<Liberacao>("fechamento");
  const [erros, setErros] = useState<Erros>({});

  const polosEscolhidos = ehPolo ? [POLO_DA_COORDENACAO] : polos;
  const estudantesRede = polosEscolhidos.reduce(
    (soma, id) => soma + (buscarPolo(id)?.estudantes ?? 0),
    0,
  );
  const abertura = `${dataAbre}T${horaAbre || "00:00"}:00-03:00`;
  const fechamento = `${dataFecha}T${horaFecha || "00:00"}:00-03:00`;

  // Depois de salvar, o formulário só se limpa quando o sheet termina de fechar: quem olha não
  // vê os campos se esvaziarem durante a saída. Ao cancelar, o que foi digitado fica (rascunho
  // na mão), mas os avisos de erro somem.
  const limparAoFechar = useRef(false);
  function limpar() {
    setNome("");
    setModalidade("dia-1");
    setMontagem("automatica");
    setPolos(todosPolos);
    setComExternos(false);
    setLiberacao("fechamento");
    setErros({});
  }

  function validar(publicar: boolean): Erros {
    const e: Erros = {};
    if (!nome.trim()) e.nome = "Dê um nome ao simulado. Ex.: 6º Simulado da Rede · Dia 1.";
    if (!publicar) return e;
    if (!dataAbre || !horaAbre) e.abertura = "Escolha a data e o horário de abertura.";
    else if (new Date(abertura) <= AGORA_DEMO)
      e.abertura = `A abertura precisa ser depois de hoje (${dataCurta(AGORA_DEMO.toISOString())}).`;
    if (!dataFecha || !horaFecha) e.fechamento = "Escolha a data e o horário de fechamento.";
    else if (!e.abertura && new Date(fechamento) <= new Date(abertura))
      e.fechamento = "O fechamento precisa ser depois da abertura.";
    if (!ehPolo && polos.length === 0 && !comExternos)
      e.polos = "Escolha pelo menos um polo ou os externos.";
    return e;
  }

  function salvar(publicar: boolean) {
    const e = validar(publicar);
    setErros(e);
    const primeiro = e.nome
      ? "simulado-nome"
      : e.abertura
        ? "simulado-data-abre"
        : e.fechamento
          ? "simulado-data-fecha"
          : e.polos
            ? `simulado-polo-${todosPolos[0]}`
            : null;
    if (primeiro) {
      document.getElementById(primeiro)?.focus();
      return;
    }
    aoSalvar({
      id: `novo-${proximoId}`,
      titulo: nome.trim(),
      modalidade,
      abertura,
      fechamento,
      polos: ordenarPolos(polosEscolhidos),
      externos: !ehPolo && comExternos,
      status: publicar ? "Agendado" : "Rascunho",
      montagem,
      liberacao,
    });
    if (publicar)
      toast.success(`“${nome.trim()}” publicado`, {
        description: "Os estudantes dos polos escolhidos já veem no catálogo.",
      });
    else
      toast.success("Rascunho salvo", {
        description: "Ele fica na lista, sem aparecer para os estudantes, até você publicar.",
      });
    limparAoFechar.current = true;
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    salvar(true);
  }

  const alternarPolo = (id: string, marcado: boolean) =>
    setPolos((atual) => (marcado ? [...atual, id] : atual.filter((p) => p !== id)));
  const todosMarcados = polos.length === todosPolos.length;

  return (
    <Sheet open={aberto} onOpenChange={aoMudar}>
      <SheetContent
        side="right"
        className="area-coordenacao flex w-full flex-col gap-0 p-0 sm:max-w-xl"
        onOpenAutoFocus={(e) => {
          // Foco no título (e não no botão de fechar), para a leitura começar pelo começo.
          e.preventDefault();
          document.getElementById("titulo-novo-simulado")?.focus();
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          if (limparAoFechar.current) limpar();
          else setErros({});
          limparAoFechar.current = false;
          aoFechar();
        }}
      >
        <div className="border-b border-linha px-5 pb-4 pr-16 pt-5 sm:px-6 sm:pr-16">
          <SheetTitle
            id="titulo-novo-simulado"
            tabIndex={-1}
            className="font-display text-[26px] font-black text-marrom focus:outline-none"
          >
            Novo simulado
          </SheetTitle>
          <SheetDescription className="mt-1 text-[15px]">
            Os estudantes só veem o simulado depois que ele é publicado.
          </SheetDescription>
        </div>
        <form
          id="form-novo-simulado"
          noValidate
          onSubmit={enviar}
          className="form-coordenacao flex-1 space-y-8 overflow-y-auto px-5 py-6 sm:px-6"
        >
          <Grupo numero={1} titulo="Nome e modalidade">
            <Campo
              id="simulado-nome"
              rotulo="Nome do simulado"
              placeholder="Ex.: 6º Simulado da Rede"
              value={nome}
              onChange={(v) => {
                setNome(v);
                if (erros.nome) setErros({ ...erros, nome: undefined });
              }}
              erro={erros.nome}
              required
              autoComplete="off"
            />
            <fieldset className="mt-5">
              <legend className="mb-2 font-semibold text-marrom">Modalidade</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {modalidadesSimulado.map((m) => (
                  <OpcaoEscolha
                    key={m.id}
                    tipo="radio"
                    nome="modalidade"
                    valor={m.id}
                    marcado={modalidade === m.id}
                    aoMudar={() => setModalidade(m.id)}
                    titulo={m.nome}
                    detalhe={m.detalhe}
                  />
                ))}
              </div>
            </fieldset>
          </Grupo>

          <Grupo numero={2} titulo="Montagem das questões">
            <fieldset>
              <legend className="sr-only">Montagem das questões</legend>
              <div className="grid gap-2">
                <OpcaoEscolha
                  tipo="radio"
                  nome="montagem"
                  valor="automatica"
                  marcado={montagem === "automatica"}
                  aoMudar={() => setMontagem("automatica")}
                  titulo="Automática por área"
                  detalhe="O sistema escolhe questões aprovadas do banco, na proporção de cada área do ENEM."
                />
                <OpcaoEscolha
                  tipo="radio"
                  nome="montagem"
                  valor="banco"
                  marcado={montagem === "banco"}
                  aoMudar={() => setMontagem("banco")}
                  titulo="Escolher no banco"
                  detalhe="Você seleciona questão por questão no Banco de questões depois de salvar."
                />
              </div>
            </fieldset>
          </Grupo>

          <Grupo numero={3} titulo="Abertura e fechamento">
            <DataHora
              id="simulado-data-abre"
              rotulo="Abre em"
              data={dataAbre}
              hora={horaAbre}
              aoMudarData={setDataAbre}
              aoMudarHora={setHoraAbre}
              erro={erros.abertura}
            />
            <DataHora
              id="simulado-data-fecha"
              rotulo="Fecha em"
              data={dataFecha}
              hora={horaFecha}
              aoMudarData={setDataFecha}
              aoMudarHora={setHoraFecha}
              erro={erros.fechamento}
              className="mt-4"
            />
          </Grupo>

          <Grupo
            numero={4}
            titulo="Quem faz"
            acao={
              !ehPolo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPolos(todosMarcados ? [] : todosPolos)}
                >
                  {todosMarcados ? "Desmarcar polos" : "Marcar todos os polos"}
                </Button>
              )
            }
          >
            {ehPolo ? (
              <>
                <OpcaoEscolha
                  tipo="checkbox"
                  nome="polos"
                  valor={POLO_DA_COORDENACAO}
                  marcado
                  desabilitado
                  aoMudar={() => {}}
                  titulo={buscarPolo(POLO_DA_COORDENACAO)?.nome}
                  detalhe={`${buscarPolo(POLO_DA_COORDENACAO)?.bairro} · ${estudantesRede} estudantes`}
                  indicador={
                    <span
                      aria-hidden
                      className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-laranja-acao text-primary-foreground"
                    >
                      <Lock className="size-3.5" strokeWidth={2.5} />
                    </span>
                  }
                />
                <p className="mt-3 text-[15px] text-muted-foreground">
                  Como coordenação do polo, você agenda simulados só para o seu Compaz.
                </p>
              </>
            ) : (
              <fieldset aria-describedby={erros.polos ? "simulado-polos-erro" : undefined}>
                <legend className="sr-only">Polos que fazem o simulado</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {dadosPolos.map((p) => (
                    <OpcaoEscolha
                      key={p.id}
                      id={`simulado-polo-${p.id}`}
                      tipo="checkbox"
                      nome="polos"
                      valor={p.id}
                      marcado={polos.includes(p.id)}
                      aoMudar={(m) => {
                        alternarPolo(p.id, m);
                        if (erros.polos) setErros({ ...erros, polos: undefined });
                      }}
                      titulo={p.nomeCurto}
                      detalhe={`${p.bairro} · ${p.estudantes} estudantes`}
                    />
                  ))}
                </div>
                <OpcaoEscolha
                  tipo="checkbox"
                  nome="externos"
                  valor="externos"
                  marcado={comExternos}
                  aoMudar={(m) => {
                    setComExternos(m);
                    if (erros.polos) setErros({ ...erros, polos: undefined });
                  }}
                  titulo="Externos e independentes"
                  detalhe={`${externos.cursinhos} de outros cursinhos e ${externos.independentes} independentes`}
                  className="mt-4"
                />
                {erros.polos && <MensagemErro id="simulado-polos-erro">{erros.polos}</MensagemErro>}
              </fieldset>
            )}
            <p
              aria-live="polite"
              className="mt-4 flex items-center gap-2 rounded-xl bg-creme px-4 py-3 text-[15px] text-marrom ring-1 ring-linha"
            >
              <Users className="size-4 shrink-0 text-laranja-acao" aria-hidden />
              <span>
                Vão poder fazer:{" "}
                <strong>
                  <ContagemSuave valor={estudantesRede} />
                </strong>{" "}
                estudantes da Rede
                {!ehPolo && comExternos && (
                  <>
                    {" "}
                    e <strong className="anima-aparecer tabular-nums">
                      {externos.estudantes}
                    </strong>{" "}
                    externos
                  </>
                )}
                .
              </span>
            </p>
          </Grupo>

          <Grupo numero={5} titulo="Liberação do resultado">
            <fieldset>
              <legend className="sr-only">Quando o resultado é liberado</legend>
              <div className="grid gap-2">
                <OpcaoEscolha
                  tipo="radio"
                  nome="liberacao"
                  valor="fechamento"
                  marcado={liberacao === "fechamento"}
                  aoMudar={() => setLiberacao("fechamento")}
                  titulo="Depois do fechamento"
                  detalhe="Recomendado nos oficiais: ninguém vê o gabarito enquanto a prova está aberta."
                />
                <OpcaoEscolha
                  tipo="radio"
                  nome="liberacao"
                  valor="na-hora"
                  marcado={liberacao === "na-hora"}
                  aoMudar={() => setLiberacao("na-hora")}
                  titulo="Na hora da entrega"
                  detalhe="Bom para treinos livres: o estudante vê o resultado assim que entrega."
                />
              </div>
            </fieldset>
          </Grupo>
        </form>
        <div className="flex gap-3 border-t border-linha bg-card px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
          <Button type="button" variant="outline" className="flex-1" onClick={() => salvar(false)}>
            Salvar rascunho
          </Button>
          <Button type="submit" form="form-novo-simulado" className="flex-1">
            <Send />
            Publicar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const ordenarPolos = (ids: string[]) =>
  dadosPolos.map((p) => p.id).filter((id) => ids.includes(id));

function Grupo({
  numero,
  titulo,
  acao,
  children,
}: {
  numero: number;
  titulo: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`grupo-${numero}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3
          id={`grupo-${numero}`}
          className="flex items-center gap-3 text-xl font-bold text-marrom"
        >
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-full bg-marrom font-display text-base font-black text-creme"
          >
            {numero}
          </span>
          {titulo}
        </h3>
        {acao}
      </div>
      {children}
    </section>
  );
}

function MensagemErro({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="erro-surge mt-2 flex items-center gap-1.5 text-sm font-medium text-erro">
      <X className="size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

function DataHora({
  id,
  rotulo,
  data,
  hora,
  aoMudarData,
  aoMudarHora,
  erro,
  className,
}: {
  id: string;
  rotulo: string;
  data: string;
  hora: string;
  aoMudarData: (v: string) => void;
  aoMudarHora: (v: string) => void;
  erro?: string;
  className?: string;
}) {
  return (
    <fieldset className={className} aria-describedby={erro ? `${id}-erro` : undefined}>
      <legend className="mb-2 font-semibold text-marrom">{rotulo}</legend>
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2">
        <div>
          <label htmlFor={id} className="sr-only">
            Data
          </label>
          <input
            id={id}
            type="date"
            value={data}
            onChange={(e) => aoMudarData(e.target.value)}
            aria-invalid={!!erro}
            className={cn(classeCampo, "px-3")}
          />
        </div>
        <div>
          <label htmlFor={`${id}-hora`} className="sr-only">
            Horário
          </label>
          <input
            id={`${id}-hora`}
            type="time"
            value={hora}
            step={1800}
            onChange={(e) => aoMudarHora(e.target.value)}
            aria-invalid={!!erro}
            className={cn(classeCampo, "px-3")}
          />
        </div>
      </div>
      {erro && <MensagemErro id={`${id}-erro`}>{erro}</MensagemErro>}
    </fieldset>
  );
}
