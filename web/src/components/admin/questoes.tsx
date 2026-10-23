import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  BadgeCheck,
  Check,
  Eye,
  History,
  Info,
  PencilLine,
  PenTool,
  Plus,
  ScrollText,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  AreaChip,
  EstadoVazio,
  NumeroAnimado,
  Preenchimento,
  Revelar,
  movimentoReduzidoAgora,
} from "@/components/ds";
import { TextoQuestao } from "@/components/prova/prova";
import { areas } from "@/data/mock";
import {
  alternativaEmAlerta,
  bancoQuestoes,
  niveisDificuldade,
  origensQuestao,
  percentualQuestao,
  precisaRevisaoHumana,
  situacoesQuestao,
  type OrigemQuestao,
  type QuestaoBanco,
  type SituacaoQuestao,
} from "@/data/admin-apoio";
import { CabecalhoAdmin, usePapelCoordenacao } from "./ui";
import {
  CampoSelect,
  TituloBloco,
  classeLinha,
  classeTd,
  classeTh,
  sobretituloDoPapel,
  useAnimaAoMudar,
  useEntradaPorAcao,
  useListaNova,
  focarAntesDeSumir,
} from "./apoio";

const LETRAS = "ABCDE";
const nomeArea = (id: string) => areas.find((a) => a.id === id)?.nome ?? "";

/* ---------- Selos e pílulas ---------- */

const estilosSituacao: Record<SituacaoQuestao, { icone: LucideIcon; classe: string }> = {
  Aprovada: { icone: BadgeCheck, classe: "bg-creme text-marrom ring-1 ring-linha" },
  "Em revisão": { icone: Eye, classe: "bg-mostarda/25 text-marrom" },
  Rascunho: {
    icone: PencilLine,
    classe: "border border-dashed border-borda-controle bg-card text-muted-foreground",
  },
  Arquivada: { icone: Archive, classe: "bg-card text-muted-foreground ring-1 ring-linha" },
};

function PilulaSituacao({ situacao }: { situacao: SituacaoQuestao }) {
  const { icone: Icone, classe } = estilosSituacao[situacao];
  // Ao aprovar, arquivar ou voltar para rascunho, a pílula nova surge (no carregamento, não).
  const surgir = useAnimaAoMudar(situacao, "anima-surgir");
  return (
    <span
      key={situacao}
      onAnimationEnd={surgir.onAnimationEnd}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold",
        classe,
        surgir.className,
      )}
    >
      <Icone className="size-4 shrink-0" aria-hidden />
      {situacao}
    </span>
  );
}

const iconesOrigem: Record<OrigemQuestao, LucideIcon> = {
  Autoral: PenTool,
  "ENEM anterior": ScrollText,
  "Gerada por IA": Sparkles,
};

function Origem({ origem }: { origem: OrigemQuestao }) {
  const Icone = iconesOrigem[origem];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-marrom">
      <Icone className="size-4 shrink-0 text-laranja" aria-hidden />
      {origem}
    </span>
  );
}

/**
 * "Gerada por IA · precisa de revisão humana": aparece até um professor aprovar.
 * Cantos de 12px: no celular o texto quebra em duas linhas sem virar uma bolha.
 */
function SeloIA({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-start gap-1.5 rounded-xl bg-mostarda px-3 py-1 text-left text-sm font-bold leading-snug text-marrom",
        className,
      )}
    >
      <Sparkles className="mt-px size-4 shrink-0" aria-hidden />
      Gerada por IA · precisa de revisão humana
    </span>
  );
}

/** % de acertos com minibarra neutra e, se houver, o alerta de gabarito. */
function Acertos({ q }: { q: QuestaoBanco }) {
  const pct = percentualQuestao(q);
  const alerta = alternativaEmAlerta(q) !== null;
  if (pct === null)
    return <span className="text-sm text-muted-foreground">Ainda não aplicada</span>;
  return (
    <span className="flex items-center justify-end gap-2">
      {alerta && (
        <span className="inline-flex items-center gap-1 rounded-full bg-mostarda/30 px-2 py-0.5 text-sm font-semibold text-marrom">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          Revisar
        </span>
      )}
      <span
        className="h-2 w-10 overflow-hidden rounded-full bg-creme ring-1 ring-linha sm:w-14"
        aria-hidden
      >
        <Preenchimento fracao={pct / 100} className="rounded-full bg-marrom/35" />
      </span>
      <span className="w-10 text-right font-semibold tabular-nums text-marrom">{pct}%</span>
    </span>
  );
}

/* ---------- Filtros ---------- */

/** Chip removido: o foco passa para o chip seguinte (ou o anterior), ou para o título da lista. */
function focarVizinho(chip: HTMLElement) {
  const chips = [...(chip.parentElement?.querySelectorAll<HTMLElement>("[data-chip]") ?? [])];
  const i = chips.indexOf(chip);
  focarAntesDeSumir(chips[i + 1] ?? chips[i - 1] ?? "titulo-questoes");
}

interface Filtros {
  area: string;
  disciplina: string;
  assunto: string;
  habilidade: string;
  dificuldade: string;
  origem: string;
  situacao: string;
  /** Só as geradas por IA que ainda esperam a aprovação de um professor. */
  revisaoHumana: boolean;
}

/** Campos com select no painel de filtros. */
type CampoFiltro = Exclude<keyof Filtros, "revisaoHumana">;

const semFiltros: Filtros = {
  area: "",
  disciplina: "",
  assunto: "",
  habilidade: "",
  dificuldade: "",
  origem: "",
  situacao: "",
  revisaoHumana: false,
};

const unicos = (valores: string[]) =>
  [...new Set(valores)].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

const camposFiltro: {
  campo: CampoFiltro;
  rotulo: string;
  todos: string;
  opcoes: (string | { valor: string; rotulo: string })[];
}[] = [
  {
    campo: "area",
    rotulo: "Área",
    todos: "Todas",
    opcoes: areas.map((a) => ({ valor: a.id, rotulo: a.nome })),
  },
  {
    campo: "disciplina",
    rotulo: "Disciplina",
    todos: "Todas",
    opcoes: unicos(bancoQuestoes.map((q) => q.questao.disciplina)),
  },
  {
    campo: "assunto",
    rotulo: "Assunto",
    todos: "Todos",
    opcoes: unicos(bancoQuestoes.map((q) => q.questao.assunto)),
  },
  {
    campo: "habilidade",
    rotulo: "Habilidade",
    todos: "Todas",
    opcoes: unicos(bancoQuestoes.map((q) => q.habilidade)),
  },
  { campo: "dificuldade", rotulo: "Dificuldade", todos: "Todas", opcoes: niveisDificuldade },
  { campo: "origem", rotulo: "Origem", todos: "Todas", opcoes: origensQuestao },
  { campo: "situacao", rotulo: "Situação", todos: "Todas", opcoes: situacoesQuestao },
];

function valorDoCampo(q: QuestaoBanco, campo: CampoFiltro) {
  switch (campo) {
    case "area":
      return q.questao.area;
    case "disciplina":
      return q.questao.disciplina;
    case "assunto":
      return q.questao.assunto;
    default:
      return q[campo];
  }
}

const rotuloDoFiltro = (campo: CampoFiltro, valor: string) =>
  campo === "area" ? nomeArea(valor) : valor;

/* ---------- Tela ---------- */

/** /admin/questoes · Banco de questões, com estatística por questão. */
export function BancoQuestoes() {
  const { ehPolo } = usePapelCoordenacao();
  const [situacoes, setSituacoes] = useState<Record<number, SituacaoQuestao>>({});
  const [filtros, setFiltros] = useState<Filtros>(semFiltros);
  const [verFiltros, setVerFiltros] = useState(false);
  const [aberta, setAberta] = useState<number | null>(null);
  // Quem abriu o painel: ao fechar (Esc, X ou fora), o foco volta para ele.
  const origemPainel = useRef<{ numero: number; el: HTMLElement | null }>(null);
  const abrir = (numero: number) => {
    const ativo = document.activeElement;
    origemPainel.current = {
      numero,
      el: ativo instanceof HTMLElement && ativo !== document.body ? ativo : null,
    };
    setAberta(numero);
  };
  /** Foco de volta para quem abriu; se foi um clique na linha, para o botão da questão. */
  const devolverFoco = () => {
    const origem = origemPainel.current;
    origemPainel.current = null;
    const botao = [
      ...document.querySelectorAll<HTMLElement>(`[data-abre-questao="${origem?.numero}"]`),
    ].find((el) => el.getClientRects().length > 0);
    const alvo =
      (origem?.el?.isConnected ? origem.el : null) ??
      botao ??
      document.getElementById("titulo-questoes");
    alvo?.focus({ preventScroll: true });
  };
  // Depois do primeiro filtro, a lista que entra ganha um fade curto (cascata nas 8 primeiras).
  const [mexeu, setMexeu] = useState(false);
  const filtrar = (novos: Filtros | ((atual: Filtros) => Filtros)) => {
    setFiltros(novos);
    setMexeu(true);
  };

  const itens = bancoQuestoes.map((q) => ({ ...q, situacao: situacoes[q.numero] ?? q.situacao }));
  const ativos = camposFiltro.map((f) => f.campo).filter((c) => filtros[c]);
  const totalAtivos = ativos.length + (filtros.revisaoHumana ? 1 : 0);
  const filtradas = itens.filter(
    (q) =>
      ativos.every((c) => valorDoCampo(q, c) === filtros[c]) &&
      (!filtros.revisaoHumana || precisaRevisaoHumana(q.origem, q.situacao)),
  );
  const emAlerta = itens.filter((q) => alternativaEmAlerta(q) !== null);
  const esperandoIA = itens.filter((q) => precisaRevisaoHumana(q.origem, q.situacao));
  const selecionada = itens.find((q) => q.numero === aberta) ?? null;

  const mudarFiltro = (campo: CampoFiltro, valor: string) =>
    filtrar((atual) => ({ ...atual, [campo]: valor }));
  // Uma chave por combinação de filtros: a lista troca inteira e entra com um fade.
  const chaveLista = JSON.stringify(filtros);

  function mudarSituacao(q: QuestaoBanco, nova: SituacaoQuestao) {
    setSituacoes((atual) => ({ ...atual, [q.numero]: nova }));
    const mensagens: Record<SituacaoQuestao, [string, string]> = {
      Aprovada: [
        `Questão ${q.numero} aprovada`,
        "A revisão humana fica registrada e a questão pode entrar em novos simulados.",
      ],
      Arquivada: [`Questão ${q.numero} arquivada`, "Ela não entra mais em novos simulados."],
      Rascunho: [`Questão ${q.numero} voltou para rascunho`, "Revise antes de aprovar de novo."],
      "Em revisão": [`Questão ${q.numero} em revisão`, ""],
    };
    const [titulo, descricao] = mensagens[nova];
    toast.success(titulo, { description: descricao });
  }

  return (
    <>
      <CabecalhoAdmin
        sobretitulo={sobretituloDoPapel(ehPolo)}
        titulo="Questões da Rede"
        subtitulo="Filtre por área, assunto ou situação. Abra uma questão para ver como os estudantes responderam."
        acoes={
          <Button
            variant="outline"
            onClick={() => toast("O cadastro de questões chega na versão final.")}
          >
            <Plus />
            Nova questão
          </Button>
        }
      />

      {(emAlerta.length > 0 || esperandoIA.length > 0) && (
        <section aria-labelledby="titulo-atencao">
          <TituloBloco id="titulo-atencao" titulo="Pedem sua atenção" />
          <Revelar como="ul" escalonar className="grid gap-4 lg:grid-cols-2">
            {emAlerta.map((q) => {
              const alt = alternativaEmAlerta(q) ?? 0;
              return (
                <li key={q.numero}>
                  <ItemAtencao
                    icone={AlertTriangle}
                    titulo={`Questão ${q.numero} · ${nomeArea(q.questao.area)} · ${q.questao.assunto} · ${percentualQuestao(q)}% de acertos`}
                    texto={`A alternativa ${LETRAS[alt]} atraiu mais respostas que o gabarito.`}
                    acao="Ver questão"
                    aoClicar={() => abrir(q.numero)}
                  />
                </li>
              );
            })}
            {esperandoIA.length > 0 && (
              <li>
                <ItemAtencao
                  icone={Sparkles}
                  titulo={`${esperandoIA.length} ${esperandoIA.length === 1 ? "questão gerada" : "questões geradas"} por IA ${esperandoIA.length === 1 ? "aguarda" : "aguardam"} revisão humana`}
                  texto="Questão gerada por IA só entra em simulado depois que um professor aprova."
                  acao={esperandoIA.length === 1 ? "Ver na lista" : "Ver questões"}
                  aoClicar={() => {
                    filtrar({ ...semFiltros, revisaoHumana: true });
                    // O botão continua na tela, mas a lista filtrada é o que importa agora: o foco
                    // vai para o título dela. Com movimento reduzido, a página pula direto.
                    const titulo = document.getElementById("titulo-questoes");
                    titulo?.focus({ preventScroll: true });
                    titulo?.scrollIntoView({
                      behavior: movimentoReduzidoAgora() ? "auto" : "smooth",
                      block: "start",
                    });
                  }}
                />
              </li>
            )}
          </Revelar>
        </section>
      )}

      <section aria-labelledby="titulo-questoes" className="mt-10">
        <TituloBloco
          id="titulo-questoes"
          titulo="Todas as questões"
          focavel
          className="scroll-mt-6 lg:scroll-mt-28"
          acoes={
            <Button
              variant="outline"
              className="lg:hidden"
              aria-expanded={verFiltros}
              aria-controls="painel-filtros"
              onClick={() => setVerFiltros(!verFiltros)}
            >
              <SlidersHorizontal />
              Filtros
              {totalAtivos > 0 && (
                // Pula a cada filtro que entra ou sai: o retorno aparece mesmo com o painel fechado.
                <span
                  key={totalAtivos}
                  className="anima-pop grid size-6 place-items-center rounded-full bg-laranja-acao text-sm font-bold text-primary-foreground"
                >
                  {totalAtivos}
                </span>
              )}
            </Button>
          }
        >
          {bancoQuestoes.length} questões: autorais, de edições anteriores do ENEM e geradas por IA.
        </TituloBloco>

        {/* No celular, o painel abre surgindo de cima (escala e fade); fecha na hora. */}
        <div
          id="painel-filtros"
          className={cn(
            "cartao mb-4 origin-top grid-cols-1 gap-x-3 gap-y-4 p-4 max-lg:anima-surgir min-[420px]:grid-cols-2 lg:grid lg:grid-cols-4 lg:gap-4 lg:p-5",
            verFiltros ? "grid" : "hidden",
          )}
        >
          {camposFiltro.map((f) => (
            <CampoSelect
              key={f.campo}
              id={`filtro-${f.campo}`}
              rotulo={f.rotulo}
              todos={f.todos}
              valor={filtros[f.campo]}
              aoMudar={(v) => mudarFiltro(f.campo, v)}
              opcoes={f.opcoes}
            />
          ))}
          <div className="flex items-end">
            <Button
              variant="ghost"
              className="w-full justify-center"
              disabled={totalAtivos === 0}
              onClick={() => {
                // O botão fica desabilitado depois de limpar: o foco vai para o primeiro filtro.
                focarAntesDeSumir("filtro-area");
                filtrar(semFiltros);
              }}
            >
              <X />
              Limpar filtros
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ativos.map((c) => (
            <button
              key={c}
              type="button"
              data-chip
              onClick={(e) => {
                focarVizinho(e.currentTarget);
                mudarFiltro(c, "");
              }}
              className="selecionavel anima-surgir inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-laranja-acao bg-laranja-acao/8 py-1 pl-4 pr-3 text-sm font-semibold text-marrom hover:bg-laranja-acao/15 active:scale-[0.97]"
            >
              {camposFiltro.find((f) => f.campo === c)?.rotulo}: {rotuloDoFiltro(c, filtros[c])}
              <X className="size-4" aria-hidden />
              <span className="sr-only">(remover filtro)</span>
            </button>
          ))}
          {filtros.revisaoHumana && (
            <button
              type="button"
              data-chip
              onClick={(e) => {
                focarVizinho(e.currentTarget);
                filtrar((atual) => ({ ...atual, revisaoHumana: false }));
              }}
              className="selecionavel anima-surgir inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-laranja-acao bg-laranja-acao/8 py-1 pl-4 pr-3 text-sm font-semibold text-marrom hover:bg-laranja-acao/15 active:scale-[0.97]"
            >
              <Sparkles className="size-4 text-laranja-acao" aria-hidden />
              Precisa de revisão humana
              <X className="size-4" aria-hidden />
              <span className="sr-only">(remover filtro)</span>
            </button>
          )}
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {totalAtivos === 0
              ? `Mostrando as ${itens.length} questões.`
              : `Mostrando ${filtradas.length} de ${itens.length} questões.`}
          </p>
        </div>

        {filtradas.length === 0 ? (
          <div className="anima-surgir mt-4">
            <EstadoVazio
              icon={SearchX}
              titulo="Nenhuma questão com esses filtros"
              texto="Tire um filtro ou comece de novo para ver todo o banco."
              acao={
                <Button
                  variant="outline"
                  onClick={() => {
                    focarAntesDeSumir("titulo-questoes");
                    filtrar(semFiltros);
                  }}
                >
                  Limpar filtros
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <Tabela key={`tabela-${chaveLista}`} lista={filtradas} aoAbrir={abrir} mexeu={mexeu} />
            <Cartoes
              key={`cartoes-${chaveLista}`}
              lista={filtradas}
              aoAbrir={abrir}
              mexeu={mexeu}
            />
            <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />% de acertos: parte das
              respostas que marcou o gabarito, somando todas as aplicações. Não é a nota TRI oficial
              do ENEM.
            </p>
          </>
        )}
      </section>

      <PainelQuestao
        q={selecionada}
        aoFechar={() => setAberta(null)}
        aoDevolverFoco={devolverFoco}
        aoMudarSituacao={mudarSituacao}
      />
    </>
  );
}

function ItemAtencao({
  icone: Icone,
  titulo,
  texto,
  acao,
  aoClicar,
}: {
  icone: LucideIcon;
  titulo: string;
  texto: string;
  acao: string;
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      className="cartao cartao-interativo group flex h-full w-full items-start gap-4 p-5 text-left"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mostarda/30 text-marrom">
        <Icone className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug text-marrom">{titulo}</span>
        <span className="mt-1 block text-[15px] text-muted-foreground">{texto}</span>
        <span className="mt-3 inline-flex items-center gap-1.5 font-semibold text-laranja-acao group-hover:underline">
          {acao}
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </span>
    </button>
  );
}

/* ---------- Lista ---------- */

interface PropsLista {
  lista: QuestaoBanco[];
  aoAbrir: (numero: number) => void;
  /** A pessoa já filtrou: a lista nova entra com um fade. */
  mexeu: boolean;
}

interface PropsItem {
  q: QuestaoBanco;
  aoAbrir: (numero: number) => void;
  entrada: boolean;
  posicao: number;
}

/** Desktop: tabela; a linha inteira abre o painel da questão. */
function Tabela({ lista, aoAbrir, mexeu }: PropsLista) {
  const nova = useListaNova();
  return (
    <div className="cartao mt-4 hidden xl:block">
      <table className="w-full border-separate border-spacing-0 text-[15px]">
        <caption className="sr-only">Questões do banco. Abra uma para ver a estatística.</caption>
        <thead>
          <tr>
            <th scope="col" className={cn(classeTh, "w-14")}>
              Nº
            </th>
            <th scope="col" className={classeTh}>
              Questão
            </th>
            <th scope="col" className={classeTh}>
              Área
            </th>
            <th scope="col" className={classeTh}>
              Habilidade
            </th>
            <th scope="col" className={classeTh}>
              Origem
            </th>
            <th scope="col" className={classeTh}>
              Situação
            </th>
            <th scope="col" className={cn(classeTh, "text-right")}>
              <span className="inline-flex items-center gap-1">
                % de acertos
                <Info className="size-3.5" aria-hidden />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lista.map((q, i) => (
            <LinhaQuestao
              key={q.numero}
              q={q}
              aoAbrir={aoAbrir}
              entrada={mexeu}
              posicao={nova ? i : 0}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LinhaQuestao({ q, aoAbrir, entrada, posicao }: PropsItem) {
  const { classe, estilo, aoTerminar } = useEntradaPorAcao(entrada, posicao);
  return (
    <tr
      onAnimationEnd={aoTerminar}
      onClick={() => aoAbrir(q.numero)}
      className={cn(classeLinha, "cursor-pointer active:bg-creme", classe)}
      style={estilo}
    >
      <td className={cn(classeTd, "font-display text-xl font-black tabular-nums text-marrom")}>
        {q.numero}
      </td>
      <td className={cn(classeTd, "max-w-0 w-full")}>
        <button
          type="button"
          data-abre-questao={q.numero}
          onClick={(e) => {
            e.stopPropagation();
            aoAbrir(q.numero);
          }}
          className="block max-w-full text-left font-semibold text-marrom hover:underline"
        >
          {q.questao.assunto}
          <span className="sr-only">: abrir a questão {q.numero}</span>
        </button>
        <p className="truncate text-sm text-muted-foreground">
          {q.questao.disciplina} · {q.questao.enunciado}
        </p>
        {precisaRevisaoHumana(q.origem, q.situacao) && (
          <span className="mt-1.5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-mostarda px-2.5 py-0.5 text-sm font-bold text-marrom">
            <Sparkles className="size-4 shrink-0" aria-hidden />
            Precisa de revisão humana
          </span>
        )}
      </td>
      <td className={classeTd}>
        <AreaChip area={q.questao.area} curto className="whitespace-nowrap" />
      </td>
      <td className={cn(classeTd, "whitespace-nowrap")}>
        <span className="font-semibold text-marrom">{q.habilidade}</span>
        <span className="block text-sm text-muted-foreground">{q.dificuldade}</span>
      </td>
      <td className={classeTd}>
        <Origem origem={q.origem} />
      </td>
      <td className={classeTd}>
        <PilulaSituacao situacao={q.situacao} />
      </td>
      <td className={cn(classeTd, "whitespace-nowrap")}>
        <Acertos q={q} />
      </td>
    </tr>
  );
}

/** Celular e tablet: um cartão tocável por questão. */
function Cartoes({ lista, aoAbrir, mexeu }: PropsLista) {
  const nova = useListaNova();
  return (
    <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:hidden">
      {lista.map((q, i) => (
        <CartaoQuestao
          key={q.numero}
          q={q}
          aoAbrir={aoAbrir}
          entrada={mexeu}
          posicao={nova ? i : 0}
        />
      ))}
    </ul>
  );
}

function CartaoQuestao({ q, aoAbrir, entrada, posicao }: PropsItem) {
  const { classe, estilo, aoTerminar } = useEntradaPorAcao(entrada, posicao);
  return (
    <li onAnimationEnd={aoTerminar} className={cn("min-w-0", classe)} style={estilo}>
      <button
        type="button"
        data-abre-questao={q.numero}
        onClick={() => aoAbrir(q.numero)}
        className="cartao cartao-interativo flex h-full w-full flex-col p-4 text-left"
      >
        <span className="flex w-full items-center justify-between gap-3">
          <span className="font-display text-lg font-black text-marrom">Questão {q.numero}</span>
          <PilulaSituacao situacao={q.situacao} />
        </span>
        <span className="mt-2 block font-semibold leading-snug text-marrom">
          {q.questao.assunto}
        </span>
        <span className="line-clamp-2 text-sm text-muted-foreground">
          {q.questao.disciplina} · {q.questao.enunciado}
        </span>
        <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <AreaChip area={q.questao.area} curto />
          <span className="text-muted-foreground">
            {q.habilidade} · {q.dificuldade}
          </span>
          {/* O selo já diz "Gerada por IA": a origem não se repete no cartão. */}
          {!precisaRevisaoHumana(q.origem, q.situacao) && <Origem origem={q.origem} />}
        </span>
        {precisaRevisaoHumana(q.origem, q.situacao) && <SeloIA className="mt-3 self-start" />}
        <span className="mt-4 flex w-full items-center justify-between gap-3 border-t border-linha pt-3">
          <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-muted-foreground">
            % de acertos
          </span>
          <Acertos q={q} />
        </span>
        <span className="sr-only">Abrir a questão {q.numero}</span>
      </button>
    </li>
  );
}

/* ---------- Painel da questão ---------- */

function PainelQuestao({
  q,
  aoFechar,
  aoDevolverFoco,
  aoMudarSituacao,
}: {
  q: QuestaoBanco | null;
  aoFechar: () => void;
  /** O Sheet é controlado e não tem Trigger: o foco volta por aqui (senão cai no <body>). */
  aoDevolverFoco: () => void;
  aoMudarSituacao: (q: QuestaoBanco, nova: SituacaoQuestao) => void;
}) {
  return (
    <Sheet open={q !== null} onOpenChange={(aberto) => !aberto && aoFechar()}>
      <SheetContent
        side="right"
        // O X de fechar fica acima do título fixo.
        className="area-coordenacao flex w-full flex-col gap-0 p-0 sm:max-w-2xl [&>button]:z-20"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          document.getElementById("titulo-painel-questao")?.focus();
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          aoDevolverFoco();
        }}
      >
        {q && <ConteudoPainel q={q} aoMudarSituacao={aoMudarSituacao} />}
      </SheetContent>
    </Sheet>
  );
}

function ConteudoPainel({
  q,
  aoMudarSituacao,
}: {
  q: QuestaoBanco;
  aoMudarSituacao: (q: QuestaoBanco, nova: SituacaoQuestao) => void;
}) {
  const pct = percentualQuestao(q);
  const alerta = alternativaEmAlerta(q);
  const ehIA = q.origem === "Gerada por IA";
  const precisaRevisao = precisaRevisaoHumana(q.origem, q.situacao);
  return (
    <>
      {/* O título fica fixo no topo; as etiquetas e o corpo rolam (sobra espaço no celular). */}
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-linha bg-background px-5 py-4 pr-16 sm:px-6 sm:py-5 sm:pr-16">
          <SheetTitle
            id="titulo-painel-questao"
            tabIndex={-1}
            className="font-display text-xl font-black leading-tight text-marrom focus:outline-none sm:text-[26px]"
          >
            Questão {q.numero} · {nomeArea(q.questao.area)} · {q.questao.assunto} ·{" "}
            {pct === null ? "ainda não aplicada" : `${pct}% de acertos`}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Classificação, estatística das respostas e texto completo da questão.
          </SheetDescription>
        </div>
        <div className="border-b border-linha px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <AreaChip area={q.questao.area} curto />
            <PilulaSituacao situacao={q.situacao} />
            <span className="rounded-full bg-card px-3 py-1 text-sm font-semibold text-marrom ring-1 ring-linha">
              {q.habilidade} · {q.dificuldade}
            </span>
            {precisaRevisao ? (
              <SeloIA />
            ) : (
              <span className="rounded-full bg-card px-3 py-1 text-sm font-semibold ring-1 ring-linha">
                <Origem origem={q.origem} />
              </span>
            )}
          </div>
        </div>

        <div className="space-y-8 px-5 py-6 sm:px-6">
          {q.nota && (
            <p className="flex items-start gap-2 text-[15px] text-muted-foreground">
              <History className="mt-0.5 size-4 shrink-0" aria-hidden />
              {q.nota}
            </p>
          )}

          {alerta !== null && (
            <div
              role="note"
              className="flex items-start gap-3 rounded-xl border-2 border-mostarda bg-mostarda/15 p-4 text-marrom"
            >
              <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
              <p>
                <strong className="font-semibold">
                  A alternativa {LETRAS[alerta]} atraiu mais respostas que o gabarito.
                </strong>{" "}
                Vale revisar o enunciado ou o gabarito.
              </p>
            </div>
          )}

          <section aria-labelledby="titulo-distribuicao">
            <h3 id="titulo-distribuicao" className="text-xl font-bold text-marrom">
              Como os estudantes responderam
            </h3>
            {q.distribuicao ? (
              <>
                <p className="mt-1 text-[15px] text-muted-foreground">
                  {q.respostas.toLocaleString("pt-BR")} respostas em {q.aplicacoes}{" "}
                  {q.aplicacoes === 1 ? "aplicação" : "aplicações"}.
                </p>
                <Distribuicao q={q} />
              </>
            ) : (
              <p className="mt-2 rounded-xl bg-creme/70 px-4 py-3 text-[15px] text-marrom ring-1 ring-linha">
                Ainda não aplicada. A estatística aparece depois da primeira aplicação.
              </p>
            )}
          </section>

          <section aria-labelledby="titulo-texto">
            <h3 id="titulo-texto" className="mb-3 text-xl font-bold text-marrom">
              A questão
            </h3>
            <TextoQuestao q={q.questao} />
            <ol className="space-y-2">
              {q.questao.alternativas.map((alt, i) => {
                const gabarito = i === q.questao.gabarito;
                return (
                  <li
                    key={i}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border-2 p-3",
                      gabarito ? "border-acerto/50 bg-acerto/5" : "border-linha bg-card",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                        gabarito
                          ? "bg-acerto text-white"
                          : "bg-creme text-marrom ring-1 ring-linha",
                      )}
                    >
                      {gabarito ? <Check className="size-4" strokeWidth={3} /> : LETRAS[i]}
                    </span>
                    <span className="min-w-0 pt-0.5 text-marrom">
                      <span className="sr-only">Alternativa {LETRAS[i]}: </span>
                      {gabarito && (
                        <span className="mr-2 font-semibold text-acerto">
                          {LETRAS[i]} · Gabarito
                        </span>
                      )}
                      {alt}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-labelledby="titulo-comentario">
            <h3 id="titulo-comentario" className="mb-2 text-xl font-bold text-marrom">
              Comentário do gabarito
            </h3>
            <p className="text-marrom">{q.questao.comentario}</p>
          </section>
        </div>
      </div>

      <div className="flex gap-3 border-t border-linha bg-card px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
        {q.situacao === "Rascunho" || q.situacao === "Em revisão" ? (
          <Button className="flex-1" onClick={() => aoMudarSituacao(q, "Aprovada")}>
            <BadgeCheck />
            {ehIA ? "Revisei e aprovo" : "Aprovar questão"}
          </Button>
        ) : q.situacao === "Arquivada" ? (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => aoMudarSituacao(q, "Rascunho")}
          >
            <Undo2 />
            Voltar para rascunho
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => aoMudarSituacao(q, "Arquivada")}
          >
            <Archive />
            Arquivar
          </Button>
        )}
        <Button
          variant="outline"
          className="shrink-0 px-4 sm:flex-1"
          onClick={() => toast("A edição de questões chega na versão final.")}
        >
          <PencilLine />
          {/* Um só item do flex: o espaço é o da fonte, não o gap de 8px do botão. */}
          <span>
            Editar<span className="hidden sm:inline"> questão</span>
          </span>
        </Button>
      </div>
    </>
  );
}

/**
 * Momento da revelação: as barras enchem uma a uma (50ms) e só quando assentam o gabarito se
 * destaca (círculo verde que pula, rótulo e barra verdes por cima da neutra). Assim se lê
 * primeiro como a turma respondeu, depois qual era a resposta.
 * A lista inteira segue um só estado (`data-revelar`, classe `distribuicao` em src/styles.css):
 * se está à vista quando o painel abre, espera ele deslizar (250ms); se só aparece ao rolar
 * (celular), começa na hora. O destaque (`depois-das-barras`) toca 600ms depois das barras.
 */
const DEPOIS_DAS_BARRAS = "600ms";
const FRACAO_A_VISTA = 0.6;

const useEfeitoDeLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Quanto do elemento aparece de fato: dentro da tela e das caixas que rolam ou cortam. */
function fracaoVisivel(el: HTMLElement) {
  const caixa = el.getBoundingClientRect();
  let topo = 0;
  let base = window.innerHeight;
  for (let pai = el.parentElement; pai; pai = pai.parentElement) {
    if (getComputedStyle(pai).overflowY === "visible") continue;
    const corte = pai.getBoundingClientRect();
    topo = Math.max(topo, corte.top);
    base = Math.min(base, corte.bottom);
  }
  const visto = Math.min(caixa.bottom, base) - Math.max(caixa.top, topo);
  return caixa.height ? Math.max(0, visto) / caixa.height : 0;
}

/**
 * Como o `useRevelar`, mas para a lista dentro do painel que rola: só conta como à vista com 60%
 * dela aparecendo no painel (no celular, o começo dela fica atrás da barra de ações). `revelada`
 * avisa quando os números podem começar a contar, junto com as barras.
 */
function useRevelarNoPainel<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [revelada, setRevelada] = useState(false);
  useEfeitoDeLayout(() => {
    const el = ref.current;
    if (!el) return;
    let relogio: ReturnType<typeof setTimeout> | undefined;
    // Folga para a espera do painel, a cascata, as barras e o destaque do gabarito.
    const revelar = () => {
      setRevelada(true);
      relogio = setTimeout(() => el.setAttribute("data-revelar", "visto"), 1500);
    };
    if (movimentoReduzidoAgora()) {
      el.setAttribute("data-revelar", "visto");
      setRevelada(true);
      return;
    }
    if (fracaoVisivel(el) >= FRACAO_A_VISTA) {
      revelar();
      return () => clearTimeout(relogio);
    }
    el.setAttribute("data-revelar", "espera");
    const observador = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.intersectionRatio >= FRACAO_A_VISTA)) return;
        observador.disconnect();
        el.setAttribute("data-revelar", "entrando");
        revelar();
      },
      { threshold: FRACAO_A_VISTA },
    );
    observador.observe(el);
    return () => {
      observador.disconnect();
      clearTimeout(relogio);
    };
  }, []);
  return [ref, revelada] as const;
}

/** Barras HTML com a letra, o texto e o percentual escritos; gabarito em verde com Check. */
function Distribuicao({ q }: { q: QuestaoBanco }) {
  const [lista, revelada] = useRevelarNoPainel<HTMLUListElement>();
  const alerta = alternativaEmAlerta(q);
  return (
    <ul ref={lista} className="distribuicao escalonar-filhos mt-4 space-y-3">
      {q.questao.alternativas.map((alt, i) => {
        const valor = q.distribuicao?.[i] ?? 0;
        const gabarito = i === q.questao.gabarito;
        const emAlerta = i === alerta;
        const destaque = (efeito: string) =>
          ({ "--efeito": efeito, "--depois": DEPOIS_DAS_BARRAS }) as CSSProperties;
        return (
          <li key={i} className="grid grid-cols-[2rem_minmax(0,1fr)_3rem] items-center gap-3">
            <span aria-hidden className="relative grid size-8 place-items-center">
              <span className="grid size-8 place-items-center rounded-full bg-creme text-sm font-bold text-marrom ring-1 ring-linha">
                {LETRAS[i]}
              </span>
              {gabarito && (
                <span
                  className="depois-das-barras absolute inset-0 grid place-items-center rounded-full bg-acerto text-sm font-bold text-white"
                  style={destaque("pop-check")}
                >
                  {LETRAS[i]}
                </span>
              )}
            </span>
            <div className="min-w-0">
              <p className="mb-1 flex flex-wrap items-center gap-x-2 text-sm">
                <span className="sr-only">Alternativa {LETRAS[i]}:</span>
                <span className="truncate text-marrom">{alt}</span>
                {gabarito && (
                  <span
                    className="depois-das-barras inline-flex items-center gap-1 font-semibold text-acerto"
                    style={destaque("surgir")}
                  >
                    <Check className="size-4" aria-hidden />
                    Gabarito
                  </span>
                )}
                {emAlerta && (
                  <span className="inline-flex items-center gap-1 font-semibold text-marrom">
                    <AlertTriangle className="size-4" aria-hidden />
                    Mais marcada
                  </span>
                )}
              </p>
              <div
                className="relative h-3 overflow-hidden rounded-full bg-creme ring-1 ring-linha"
                aria-hidden
              >
                {/* Sem revelar próprio: a barra enche quando a lista entra (estado da <ul>). */}
                <div
                  className={cn(
                    "barra-cheia rounded-full",
                    emAlerta ? "bg-mostarda ring-1 ring-inset ring-marrom/40" : "bg-marrom/25",
                  )}
                  style={{ "--progresso": valor / 100 } as CSSProperties}
                />
                {gabarito && (
                  // A barra verde já está cheia por baixo do fade: a neutra só "vira" verde.
                  <div
                    className="depois-das-barras absolute inset-0 rounded-full bg-acerto"
                    style={{
                      ...destaque("aparecer"),
                      transform: `translateX(${valor - 100}%)`,
                    }}
                  />
                )}
              </div>
            </div>
            <span className="text-right font-display text-lg font-black tabular-nums text-marrom">
              {revelada ? (
                // Monta quando a lista é revelada: conta de 0 junto com a barra.
                <NumeroAnimado valor={valor} sufixo="%" />
              ) : (
                <>
                  <span aria-hidden className="invisible">
                    {valor}%
                  </span>
                  <span className="sr-only">{valor}%</span>
                </>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
