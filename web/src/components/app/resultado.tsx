import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronDown, Clock, Info, TrendingUp } from "lucide-react";
import {
  disciplinas,
  gabaritoRede4,
  historico,
  questoes,
  resultadoAreas,
  type ItemHistorico,
  type Questao,
} from "@/data/prototipo";
import { assuntosDificuldade } from "@/data/estudante";
import { areas } from "@/data/mock";
import { Button } from "@/components/ui/button";
import {
  EstadoVazio,
  Carregando,
  AreaChip,
  StatusBadge,
  DURACAO,
  NumeroAnimado,
  Preenchimento,
  Revelar,
} from "@/components/ds";
import { cn } from "@/lib/utils";
import {
  Cartao,
  Titulo,
  AvisoTri,
  Contagens,
  BarraResultado,
  Evolucao,
  NaoEncontrado,
} from "./shared";
import { CheckSelecionado } from "./controles";
import { estadoInicial, type EstadoProva } from "@/components/prova/useProva";
import type { AreaId, ResultadoArea } from "@/data/types";

/** Único simulado do histórico com detalhe por área, disciplina e questão no protótipo. */
const ID_DETALHADO = "rede-4";
const LETRAS = "ABCDE";
const nomeArea = Object.fromEntries(areas.map((a) => [a.id, a.nome])) as Record<AreaId, string>;

const filtros = ["Todas", "Erros", "Em branco", "Marcadas"] as const;
type Filtro = (typeof filtros)[number];

type StatusResposta = "acerto" | "erro" | "branco";

/** Uma linha do gabarito, venha da demonstração ou do 4º simulado. */
interface ItemGabarito {
  numero: number;
  area: AreaId;
  status: StatusResposta;
  /** Alternativa marcada (0 = A); null quando ficou em branco. */
  resposta: number | null;
  gabarito: number;
  marcada: boolean;
  /** Só a demonstração tem enunciado e comentário. */
  questao?: Questao;
}

interface AssuntoReforco {
  assunto: string;
  detalhe: string;
  /** Simulado que abre no botão "Treinar". */
  simuladoId: string;
}

export function Resultado({ id }: { id: string }) {
  if (id === "demo") return <ResultadoDemonstracao />;
  const indice = historico.findIndex((h) => h.id === id);
  if (indice < 0) return <NaoEncontrado />;
  return <ResultadoDoHistorico atual={historico[indice]} anterior={historico[indice - 1]} />;
}

/* ---------- Simulado de demonstração: calculado pelas respostas salvas ---------- */

function ResultadoDemonstracao() {
  const [estado, setEstado] = useState<EstadoProva | null>(null);
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    try {
      const salvo = sessionStorage.getItem("simula-resultado-demo");
      if (salvo) setEstado(JSON.parse(salvo));
    } catch {
      // Sem armazenamento ou resposta ilegível: mostra o convite para fazer a demonstração.
    }
    setPronto(true);
  }, []);

  if (!pronto) return <Carregando />;
  if (!estado)
    return (
      <EstadoVazio
        titulo="Faça o simulado de demonstração para ver seu resultado"
        texto="São 12 questões para experimentar seu próximo passo."
        acao={
          <Button asChild>
            <Link to="/app/simulados/$id" params={{ id: "demo" }}>
              Fazer demonstração
            </Link>
          </Button>
        }
      />
    );

  const itens: ItemGabarito[] = questoes.map((q) => {
    const resposta = estado.respostas[q.id];
    return {
      numero: q.id,
      area: q.area,
      status: resposta === undefined ? "branco" : resposta === q.gabarito ? "acerto" : "erro",
      resposta: resposta ?? null,
      gabarito: q.gabarito,
      marcada: estado.marcadas.includes(q.id),
      questao: q,
    };
  });
  const porArea: ResultadoArea[] = areas.map(({ id: area }) => {
    const daArea = itens.filter((q) => q.area === area);
    return {
      area,
      acertos: daArea.filter((q) => q.status === "acerto").length,
      erros: daArea.filter((q) => q.status === "erro").length,
      brancos: daArea.filter((q) => q.status === "branco").length,
    };
  });
  const reforcar: AssuntoReforco[] = itens
    .filter((q) => q.status !== "acerto" && q.questao)
    .slice(0, 3)
    .map((q) => ({
      assunto: q.questao?.assunto ?? "",
      detalhe: `Questão ${q.numero} · ${nomeArea[q.area]}`,
      simuladoId: `area-${q.area}`,
    }));

  return (
    <>
      <Topo
        frase="Primeiro passo dado. Agora você sabe onde focar."
        titulo="Simulado de demonstração"
        itens={itens}
        tempoSegundos={Math.max(0, estadoInicial.restante - estado.restante)}
      />
      <div className="mt-6 space-y-6">
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <PorArea porArea={porArea} />
          <AssuntosParaReforcar assuntos={reforcar} />
        </div>
        <Gabarito itens={itens} comentado />
        <ProximoPasso />
      </div>
    </>
  );
}

/* ---------- Simulados oficiais do histórico de Maria ---------- */

function ResultadoDoHistorico({
  atual,
  anterior,
}: {
  atual: ItemHistorico;
  anterior?: ItemHistorico;
}) {
  const detalhado = atual.id === ID_DETALHADO;
  const itens: ItemGabarito[] = detalhado
    ? gabaritoRede4.map((q) => ({ ...q, marcada: false }))
    : [];
  // Trajetória nos completos (Dia 2) até este simulado: só a mesma modalidade se compara.
  const ate = historico.slice(0, historico.indexOf(atual) + 1);
  return (
    <>
      <Topo
        frase={fraseDeIncentivo(atual, anterior)}
        titulo={atual.titulo}
        itens={itens}
        contagens={atual}
        tempoSegundos={atual.tempoSegundos}
        diferenca={anterior && atual.acertos - anterior.acertos}
        evolucao={
          anterior && {
            valores: ate.map((h) => h.percentual),
            rotulos: ate.map((h) => h.mes),
          }
        }
      />
      <div className="mt-6 space-y-6">
        {detalhado ? (
          <>
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <PorArea porArea={resultadoAreas} />
              <AssuntosParaReforcar
                assuntos={assuntosDificuldade.map((d) => ({
                  assunto: d.assunto,
                  detalhe: `${nomeArea[d.area]} · ${d.acertos} de ${d.total} questões`,
                  simuladoId: "recuperacao",
                }))}
              />
            </div>
            <PorDisciplina />
            <Gabarito itens={itens} comentado={false} />
          </>
        ) : (
          <Revelar>
            <Cartao titulo="Gabarito comentado">
              <p className="flex items-start gap-2 text-muted-foreground">
                <Info className="mt-1 size-4 shrink-0" aria-hidden />
                Detalhe por questão disponível na versão final.
              </p>
              <Button asChild variant="link" className="mt-3 whitespace-normal px-0">
                <Link to="/app/desempenho">
                  Ver seu desempenho
                  <ArrowRight />
                </Link>
              </Button>
            </Cartao>
          </Revelar>
        )}
        <ProximoPasso />
      </div>
    </>
  );
}

/** Frase de incentivo baseada em fatos: a diferença de acertos para o simulado anterior. */
function fraseDeIncentivo(atual: ItemHistorico, anterior?: ItemHistorico) {
  if (!anterior) return "Primeiro passo dado. Agora você sabe onde focar.";
  const diferenca = atual.acertos - anterior.acertos;
  if (diferenca <= 0) return "Cada simulado mostra um novo próximo passo. Constância dá resultado.";
  const questoesTexto = diferenca === 1 ? "1 questão" : `${diferenca} questões`;
  return `Você acertou ${questoesTexto} a mais que no simulado anterior. Constância dá resultado.`;
}

/** 15120 → "4h12min"; 168 → "2min48s"; 40 → "40s". */
function duracao(segundos: number) {
  const total = Math.round(segundos);
  const h = Math.floor(total / 3600);
  const min = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const doisDigitos = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}h${min ? `${doisDigitos(min)}min` : ""}`;
  if (min > 0) return `${min}min${s ? `${doisDigitos(s)}s` : ""}`;
  return `${s}s`;
}

/* ---------- Blocos da tela ---------- */

/** "2 acertos · 1 erro · 0 em branco". */
function ResumoContagens({
  acertos,
  erros,
  brancos,
}: {
  acertos: number;
  erros: number;
  brancos: number;
}) {
  return (
    <>
      {acertos} {acertos === 1 ? "acerto" : "acertos"} · {erros} {erros === 1 ? "erro" : "erros"} ·{" "}
      {brancos} em branco
    </>
  );
}

/**
 * Acertos, erros e em branco numa barra só, sem somar: enche em sequência (acertos, depois
 * erros, depois em branco). Camadas empilhadas, cada uma até o fim do seu trecho.
 */
function BarraEmSequencia({
  acertos,
  erros,
  brancos,
}: {
  acertos: number;
  erros: number;
  brancos: number;
}) {
  const total = acertos + erros + brancos;
  const fracao = (n: number) => (total ? n / total : 0);
  const naVez = (ordem: number) => ({ "--atraso": `${ordem * 150}ms` }) as CSSProperties;
  return (
    <div
      role="img"
      aria-label={`${acertos} acertos, ${erros} erros e ${brancos} em branco, de ${total} questões`}
      className="relative h-4 overflow-hidden rounded-full bg-creme"
    >
      <Preenchimento
        fracao={fracao(total)}
        className="absolute inset-0 bg-branco-q"
        style={naVez(2)}
      />
      <Preenchimento
        fracao={fracao(acertos + erros)}
        className="absolute inset-0 bg-erro"
        style={naVez(1)}
      />
      <Preenchimento fracao={fracao(acertos)} className="absolute inset-0 bg-acerto" />
    </div>
  );
}

/**
 * Revelação do resultado: os acertos e o % contam (600ms), a barra enche em sequência, os
 * quadros de acertos, erros e em branco contam um depois do outro e a diferença para o simulado
 * anterior surge quando a contagem termina. Ao lado (ou abaixo), a evolução se desenha.
 */
function Topo({
  frase,
  titulo,
  itens,
  contagens,
  tempoSegundos,
  diferenca,
  evolucao,
}: {
  frase: string;
  titulo: string;
  itens: ItemGabarito[];
  /** Totais prontos (histórico). Sem eles, conta a partir dos itens. */
  contagens?: { acertos: number; erros: number; brancos: number };
  tempoSegundos?: number;
  /** Acertos a mais (ou a menos) que no simulado anterior da mesma modalidade. */
  diferenca?: number;
  /** % de acertos dos completos até este, para o gráfico de evolução. */
  evolucao?: { valores: number[]; rotulos: string[] };
}) {
  const { acertos, erros, brancos } = contagens ?? {
    acertos: itens.filter((q) => q.status === "acerto").length,
    erros: itens.filter((q) => q.status === "erro").length,
    brancos: itens.filter((q) => q.status === "branco").length,
  };
  const total = acertos + erros + brancos;
  const percentual = total ? Math.round((acertos / total) * 100) : 0;
  return (
    <>
      <Titulo titulo="Seu resultado" subtitulo={frase} />
      <p className="mb-4 font-semibold text-muted-foreground">{titulo}</p>
      <div className={cn(evolucao && "grid items-start gap-6 lg:grid-cols-2")}>
        <div className="min-w-0">
          <div className="mb-6">
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <NumeroAnimado
                valor={acertos}
                duracao={DURACAO.longa}
                className="font-display text-[56px] font-black leading-none text-laranja lg:text-[72px]"
              />
              <span className="font-display text-2xl font-bold">de {total} questões</span>
              {/* Só a subida vira selo (tendência nunca em vermelho); surge depois da contagem. */}
              {diferenca !== undefined && diferenca > 0 && (
                <span
                  className="anima-surgir motion-reduce:animate-none inline-flex items-center gap-1.5 self-center rounded-full bg-acerto/10 px-3 py-1 text-sm font-semibold text-acerto"
                  style={{ "--atraso": `${DURACAO.longa}ms` } as CSSProperties}
                >
                  <TrendingUp className="size-4" aria-hidden />+{diferenca}{" "}
                  {diferenca === 1 ? "acerto" : "acertos"}
                  <span className="sr-only"> a mais que no simulado anterior</span>
                </span>
              )}
            </p>
            <p className="mt-4 text-xl font-semibold">
              <NumeroAnimado valor={percentual} sufixo="%" duracao={DURACAO.longa} /> de acertos
            </p>
            <AvisoTri />
            <div className="mt-5">
              <BarraEmSequencia acertos={acertos} erros={erros} brancos={brancos} />
            </div>
          </div>
          <Contagens acertos={acertos} erros={erros} brancos={brancos} />
          {tempoSegundos !== undefined && total > 0 && (
            <p className="mt-4 flex items-start gap-2 text-muted-foreground">
              <Clock className="mt-1 size-5 shrink-0 text-laranja" aria-hidden />
              <span>
                <strong className="font-semibold text-marrom tabular-nums">
                  {duracao(tempoSegundos)}
                </strong>{" "}
                no total · <span className="tabular-nums">{duracao(tempoSegundos / total)}</span>{" "}
                por questão, em média
              </span>
            </p>
          )}
        </div>
        {evolucao && (
          <Revelar className="min-w-0">
            <Cartao titulo="Sua evolução">
              <Evolucao valores={evolucao.valores} rotulos={evolucao.rotulos} />
              <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                Só simulados completos · Dia 2, comparados entre si.
              </p>
            </Cartao>
          </Revelar>
        )}
      </div>
    </>
  );
}

function PorArea({ porArea }: { porArea: ResultadoArea[] }) {
  return (
    <Revelar className="min-w-0">
      <Cartao titulo="Por área">
        {/* escalonar-filhos: as barras enchem uma depois da outra. */}
        <div className="escalonar-filhos space-y-5">
          {porArea.map((a) => (
            <div key={a.area}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <AreaChip area={a.area} curto />
                <span className="font-semibold tabular-nums">
                  {a.acertos} de {a.acertos + a.erros + a.brancos}
                </span>
              </div>
              <BarraResultado {...a} />
              <p className="mt-2 text-sm text-muted-foreground">
                <ResumoContagens {...a} />
              </p>
            </div>
          ))}
        </div>
      </Cartao>
    </Revelar>
  );
}

function AssuntosParaReforcar({ assuntos }: { assuntos: AssuntoReforco[] }) {
  return (
    <Revelar className="min-w-0">
      <Cartao titulo="Assuntos para reforçar">
        {assuntos.length ? (
          <ul className="divide-y divide-linha">
            {assuntos.map((d) => (
              <li
                key={d.assunto}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-semibold leading-snug">{d.assunto}</p>
                  <p className="text-sm text-muted-foreground">{d.detalhe}</p>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link to="/app/simulados/$id" params={{ id: d.simuladoId }}>
                    Treinar
                    <span className="sr-only"> {d.assunto}</span>
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            Você acertou todas as questões. Nenhum assunto para reforçar desta vez.
          </p>
        )}
      </Cartao>
    </Revelar>
  );
}

function PorDisciplina() {
  return (
    <Revelar>
      <Cartao titulo="Por disciplina">
        <div className="escalonar-filhos grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {disciplinas.map((d) => (
            <div key={d.nome}>
              <p className="mb-2 font-semibold">
                {d.nome} · {d.acertos} de {d.acertos + d.erros + d.brancos}
              </p>
              <BarraResultado {...d} />
              <p className="mt-2 text-sm text-muted-foreground">
                <ResumoContagens {...d} />
              </p>
            </div>
          ))}
        </div>
      </Cartao>
    </Revelar>
  );
}

/* ---------- Gabarito ---------- */

const passaNoFiltro = (filtro: Filtro, q: ItemGabarito) =>
  filtro === "Todas" ||
  (filtro === "Erros" && q.status === "erro") ||
  (filtro === "Em branco" && q.status === "branco") ||
  (filtro === "Marcadas" && q.marcada);

const vazioPorFiltro: Record<Filtro, string> = {
  Todas: "Nenhuma questão neste simulado",
  Erros: "Nenhum erro neste simulado",
  "Em branco": "Você respondeu todas as questões.",
  Marcadas: "Nenhuma questão marcada para revisar",
};

/**
 * Filtros e lista de questões. Na demonstração, cada questão abre o comentário;
 * no 4º simulado, as 90 ficam numa lista compacta, separadas por área.
 */
function Gabarito({ itens, comentado }: { itens: ItemGabarito[]; comentado: boolean }) {
  const [filtro, setFiltro] = useState<Filtro>("Todas");
  // Depois do 1º toque num filtro, a lista troca com um fade curto (sem cascata nos 90 itens).
  const [filtrou, setFiltrou] = useState(false);
  const filtrar = (f: Filtro) => {
    setFiltro(f);
    setFiltrou(true);
  };
  const filtradas = itens.filter((q) => passaNoFiltro(filtro, q));
  return (
    <Revelar>
      <Cartao titulo="Gabarito comentado">
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrar questões">
          {filtros.map((f) => (
            <Button
              key={f}
              variant="outline"
              size="sm"
              className={cn("selecionavel", filtro === f && "selecionado")}
              aria-pressed={filtro === f}
              onClick={() => filtrar(f)}
            >
              {filtro === f && <CheckSelecionado recem={filtrou} />}
              {f}
              <span className="font-normal tabular-nums text-muted-foreground">
                {itens.filter((q) => passaNoFiltro(f, q)).length}
              </span>
            </Button>
          ))}
        </div>
        {!comentado && (
          <p className="mb-4 flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            Comentário por questão disponível na versão final.
          </p>
        )}
        <div key={filtro} className={cn(filtrou && "anima-aparecer motion-reduce:animate-none")}>
          {filtradas.length === 0 ? (
            <EstadoVazio
              icon={Check}
              titulo={vazioPorFiltro[filtro]}
              texto="Continue explorando seu resultado."
              acao={<Button onClick={() => filtrar("Todas")}>Ver todas</Button>}
            />
          ) : comentado ? (
            <ListaComentada itens={filtradas} />
          ) : (
            <ListaCompacta itens={filtradas} todas={itens} />
          )}
        </div>
      </Cartao>
    </Revelar>
  );
}

/**
 * "Sua resposta: C · Gabarito: B" (ou "Sua: C · Gabarito: B" na lista compacta, que mostra
 * só o gabarito quando a questão ficou em branco: o selo ao lado já diz "Em branco").
 */
function RespostaEGabarito({ q, curto = false }: { q: ItemGabarito; curto?: boolean }) {
  if (curto && q.resposta === null)
    return (
      <>
        <span className="sr-only">Sem resposta. </span>
        <span className="whitespace-nowrap">Gabarito: {LETRAS[q.gabarito]}</span>
      </>
    );
  return (
    <>
      <span className="whitespace-nowrap">
        {curto ? "Sua" : "Sua resposta"}:{" "}
        {q.resposta === null ? (
          <>
            <span aria-hidden>—</span>
            <span className="sr-only">sem resposta</span>
          </>
        ) : (
          LETRAS[q.resposta]
        )}
      </span>{" "}
      · <span className="whitespace-nowrap">Gabarito: {LETRAS[q.gabarito]}</span>
    </>
  );
}

function ListaComentada({ itens }: { itens: ItemGabarito[] }) {
  return (
    <ul className="space-y-3">
      {itens.map((q) => (
        <li key={q.numero}>
          <QuestaoComentada q={q} />
        </li>
      ))}
    </ul>
  );
}

/** Uma questão que abre o comentário. O conteúdo monta de novo a cada abertura, para o fade
 * curto tocar sempre (o <details> do Chrome não repete a animação sozinho). */
function QuestaoComentada({ q }: { q: ItemGabarito }) {
  const [aberturas, setAberturas] = useState(0);
  return (
    <details
      className="group rounded-xl border border-linha"
      onToggle={(e) => {
        if (e.currentTarget.open) setAberturas((n) => n + 1);
      }}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl p-4 hover:bg-creme/60 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Questão {q.numero}</span>
            <StatusBadge status={q.status} />
            {q.marcada && <StatusBadge status="revisao" />}
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">
            <RespostaEGabarito q={q} />
          </span>
        </span>
        <ChevronDown
          className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      {q.questao && (
        <div
          key={aberturas}
          className="anima-aparecer motion-reduce:animate-none border-t border-linha px-4 pb-4 pt-3"
        >
          <p className="text-sm text-muted-foreground">
            {nomeArea[q.area]} · {q.questao.assunto}
          </p>
          <p className="mt-2 font-semibold">{q.questao.enunciado}</p>
          <p className="mt-2">{q.questao.comentario}</p>
        </div>
      )}
    </details>
  );
}

function ListaCompacta({ itens, todas }: { itens: ItemGabarito[]; todas: ItemGabarito[] }) {
  const grupos = areas
    .map(({ id }) => ({
      area: id,
      numeros: todas.filter((q) => q.area === id).map((q) => q.numero),
      itens: itens.filter((q) => q.area === id),
    }))
    .filter((g) => g.itens.length > 0);
  return (
    <div className="grid items-start gap-x-10 gap-y-6 lg:grid-cols-2">
      {grupos.map((g) => (
        <section key={g.area} aria-label={`${nomeArea[g.area]}, questões`} className="min-w-0">
          <h3 className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans">
            <AreaChip area={g.area} curto />
            <span className="text-sm text-muted-foreground">
              Questões {Math.min(...g.numeros)} a {Math.max(...g.numeros)}
            </span>
          </h3>
          <ul className="divide-y divide-linha">
            {g.itens.map((q) => (
              <li key={q.numero} className="flex min-h-11 items-center gap-3 py-1">
                <span className="w-9 shrink-0 font-semibold tabular-nums">
                  <span aria-hidden>Q{q.numero}</span>
                  <span className="sr-only">Questão {q.numero}</span>
                </span>
                <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                  <RespostaEGabarito q={q} curto />
                </span>
                <StatusBadge status={q.status} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** O único bloco de cor sólida da tela. */
function ProximoPasso() {
  return (
    <Revelar como="section" className="rounded-2xl bg-amarelo p-5 text-vinho md:p-6">
      <h2 className="text-2xl font-bold">Próximo passo</h2>
      <p className="my-3">Treino de 15 questões: Porcentagem e gráficos</p>
      <Button asChild>
        <Link to="/app/simulados/$id" params={{ id: "recuperacao" }}>
          Fazer treino
          <ArrowRight />
        </Link>
      </Button>
    </Revelar>
  );
}
