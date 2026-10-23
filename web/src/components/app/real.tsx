/**
 * Telas do estudante com os dados reais do banco: início, catálogo, instruções, resultado e
 * desempenho. Seguem o desenho do protótipo (Cartao, Titulo, AreaChip, Selo).
 */
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  CircleCheck,
  ClipboardList,
  Clock,
  EyeOff,
  Flag,
  ListChecks,
  PenLine,
  Save,
  Scissors,
  WifiOff,
} from "lucide-react";
import { AreaChip, Carregando, EstadoVazio, Selo } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { areas } from "@/data/mock";
import type { AreaId } from "@/data/types";
import {
  LETRAS,
  buscarCatalogo,
  buscarResultado,
  dataCurta,
  minhasTentativas,
  type QuestaoCorrigida,
  type SimuladoReal,
  type Tentativa,
} from "@/lib/dados";
import { useSessao } from "@/lib/sessao";
import { TextoQuestao } from "@/components/prova/prova";
import { AvisoTri, BarraResultado, Cartao, Contagens, Titulo } from "./shared";
import { AvisoErro, OpcaoMarcavel } from "./controles";

function Falhou({ erro }: { erro: unknown }) {
  return (
    <EstadoVazio
      titulo="Não foi possível carregar"
      texto={erro instanceof Error ? erro.message : "Verifique a internet e tente de novo."}
      acao={<Button onClick={() => window.location.reload()}>Tentar de novo</Button>}
    />
  );
}

const useCatalogo = () => useQuery({ queryKey: ["catalogo"], queryFn: buscarCatalogo });

/* ---------- Catálogo ---------- */

export function CartaoSimuladoReal({
  s,
  destaque = false,
}: {
  s: SimuladoReal;
  destaque?: boolean;
}) {
  const andamento = s.status === "em_andamento";
  const feito = s.status === "entregue" || s.status === "expirada";
  return (
    <article className={cn("cartao p-5", destaque && "border-2 border-marrom shadow-cartao")}>
      <Selo tom="creme">{destaque ? "Comece por aqui" : s.modalidade}</Selo>
      <h2 className="mt-3 text-[22px] font-bold">{s.titulo}</h2>
      <div className="my-3 flex flex-wrap gap-2">
        {s.areas.map((a) => (
          <AreaChip key={a} area={a} curto />
        ))}
      </div>
      <p className="text-muted-foreground">
        {s.questoes} questões · {s.duracao}
      </p>
      {feito && s.percentual !== null && (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
          <CircleCheck className="size-4" aria-hidden />
          Última vez: {s.percentual.toLocaleString("pt-BR")}% de acertos
        </p>
      )}
      {andamento && (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
          <Save className="size-4" aria-hidden />
          Em andamento
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant={destaque || andamento ? "default" : "outline"}>
          <Link to={andamento ? "/prova/$id" : "/app/simulados/$id"} params={{ id: s.id }}>
            {andamento ? "Continuar" : feito ? "Fazer de novo" : "Começar"}
            <span className="sr-only">: {s.titulo}</span>
            <ArrowRight aria-hidden />
          </Link>
        </Button>
        {feito && s.tentativaId && (
          <Button asChild variant="ghost">
            <Link to="/app/resultado/$id" params={{ id: s.tentativaId }}>
              Ver resultado
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}

export function CatalogoReal() {
  const { data, error } = useCatalogo();
  return (
    <>
      <Titulo titulo="Simulados" subtitulo="Um treino de cada vez. Escolha seu próximo passo." />
      {error ? (
        <Falhou erro={error} />
      ) : !data ? (
        <Carregando texto="Carregando simulados…" />
      ) : data.length === 0 ? (
        <EstadoVazio
          icon={ClipboardList}
          titulo="Nenhum simulado aberto agora"
          texto="Quando a coordenação publicar um simulado, ele aparece aqui."
        />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-2">
          {data.map((s) => (
            <CartaoSimuladoReal key={s.id} s={s} />
          ))}
        </div>
      )}
    </>
  );
}

/* ---------- Instruções ---------- */

const antesDeComecar = [
  { I: EyeOff, t: "O cronômetro pode ser escondido para você se concentrar." },
  { I: Flag, t: "Marque questões para revisar antes de entregar." },
  { I: Scissors, t: "Risque alternativas que você já descartou." },
  { I: WifiOff, t: "Se a internet cair, suas respostas são enviadas quando ela voltar." },
  {
    I: Clock,
    t: "O tempo continua correndo mesmo se você sair. Quando acabar, a prova é entregue.",
  },
];

export function InstrucoesReal({ id }: { id: string }) {
  const navigate = useNavigate();
  const caixa = useRef<HTMLInputElement>(null);
  const [leu, setLeu] = useState(false);
  const [tentativas, setTentativas] = useState(0);
  const { data, error } = useCatalogo();
  if (error) return <Falhou erro={error} />;
  if (!data) return <Carregando />;
  const s = data.find((x) => x.id === id);
  if (!s)
    return (
      <EstadoVazio
        titulo="Simulado não encontrado"
        texto="Ele pode ter sido encerrado."
        acao={
          <Button asChild>
            <Link to="/app/simulados">Ver simulados</Link>
          </Button>
        }
      />
    );
  const erroLeu = tentativas > 0 && !leu;
  const comecar = () => {
    if (!leu) {
      setTentativas((n) => n + 1);
      caixa.current?.focus();
      return;
    }
    void navigate({ to: "/prova/$id", params: { id } });
  };

  return (
    <>
      <Button asChild variant="ghost" className="-ml-3 mb-4">
        <Link to="/app/simulados">
          <ArrowLeft aria-hidden />
          Voltar para Simulados
        </Link>
      </Button>
      <Titulo titulo={s.titulo} subtitulo="Prepare seu espaço e faça no seu ritmo." />
      <Selo tom="creme">{s.modalidade}</Selo>
      <div className="mt-6 space-y-6">
        <Cartao>
          <div className="grid gap-5 sm:grid-cols-2">
            <p className="flex items-center gap-2">
              <ListChecks className="size-5 shrink-0 text-laranja-acao" aria-hidden />
              {s.questoes} questões
            </p>
            <p className="flex items-center gap-2">
              <Clock className="size-5 shrink-0 text-laranja-acao" aria-hidden />
              {s.duracao}
            </p>
            <p className="flex items-center gap-2">
              <Save className="size-5 shrink-0 text-laranja-acao" aria-hidden />
              Salvamento automático
            </p>
            <div className="flex flex-wrap gap-2">
              {s.areas.map((a) => (
                <AreaChip key={a} area={a} curto />
              ))}
            </div>
          </div>
          {s.instrucoes && <p className="mt-5 whitespace-pre-line">{s.instrucoes}</p>}
        </Cartao>
        <Cartao titulo="Antes de começar">
          <ul className="space-y-4">
            {antesDeComecar.map(({ I, t }) => (
              <li key={t} className="flex gap-3">
                <I className="mt-1 size-5 shrink-0 text-laranja-acao" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-5 font-semibold">Seu resultado sai assim que você entregar.</p>
          <AvisoTri />
        </Cartao>
        <div className="space-y-3">
          <OpcaoMarcavel
            refInput={caixa}
            marcado={leu}
            aoMudar={setLeu}
            invalido={erroLeu}
            descricao={erroLeu ? "erro-instrucoes" : undefined}
            className="sm:max-w-md"
          >
            <span className="font-semibold">Li as instruções</span>
          </OpcaoMarcavel>
          {tentativas > 0 && (
            <AvisoErro id="erro-instrucoes" visivel={erroLeu} tentativa={tentativas}>
              Marque “Li as instruções” para começar.
            </AvisoErro>
          )}
          <Button
            variant={leu ? "default" : "outline"}
            className={cn("w-full border-2 sm:w-auto", leu && "border-transparent")}
            onClick={comecar}
          >
            {s.status === "em_andamento" ? "Continuar simulado" : "Começar simulado"}
            <ArrowRight aria-hidden />
          </Button>
        </div>
      </div>
    </>
  );
}

/* ---------- Início ---------- */

export function InicioReal() {
  const { perfil, usuario } = useSessao();
  const catalogo = useCatalogo();
  const historico = useQuery({
    queryKey: ["tentativas", usuario?.id],
    queryFn: () => minhasTentativas(usuario!.id),
    enabled: Boolean(usuario),
  });
  const primeiroNome = perfil?.nome.split(/\s+/)[0] ?? "";
  const andamento = catalogo.data?.find((s) => s.status === "em_andamento");
  const proximo = andamento ?? catalogo.data?.find((s) => !s.status) ?? catalogo.data?.[0];
  const entregues = (historico.data ?? []).filter((t) => t.status !== "em_andamento");

  return (
    <>
      <Titulo
        sobretitulo={perfil?.polo ? `${perfil.polo.nome}` : undefined}
        titulo={primeiroNome ? `Oi, ${primeiroNome}!` : "Oi!"}
        subtitulo="Uma questão de cada vez. Seu próximo passo está aqui."
      />
      {catalogo.error ? (
        <Falhou erro={catalogo.error} />
      ) : !catalogo.data ? (
        <Carregando />
      ) : proximo ? (
        <CartaoSimuladoReal s={proximo} destaque />
      ) : null}

      <section className="mt-10">
        <h2 className="text-[22px] font-bold">Seus simulados</h2>
        {!historico.data ? (
          <div className="mt-4">
            <Carregando />
          </div>
        ) : entregues.length === 0 ? (
          <p className="mt-2 text-muted-foreground">
            Quando você entregar um simulado, o resultado fica aqui.
          </p>
        ) : (
          <ListaTentativas itens={entregues.slice(0, 5)} />
        )}
      </section>
    </>
  );
}

function ListaTentativas({ itens }: { itens: Tentativa[] }) {
  return (
    <ul className="cartao mt-4 divide-y divide-linha">
      {itens.map((t) => (
        <li key={t.id}>
          <Link
            to="/app/resultado/$id"
            params={{ id: t.id }}
            className="flex min-h-16 items-center gap-3 p-4 hover:bg-creme/60"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t.titulo}</p>
              <p className="text-sm text-muted-foreground">
                {dataCurta(t.entregueEm ?? t.iniciadaEm)} · {t.acertos ?? 0} de {t.total ?? 0}{" "}
                acertos
              </p>
            </div>
            <span className="font-display text-xl font-black tabular-nums">
              {(t.percentual ?? 0).toLocaleString("pt-BR")}%
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Desempenho ---------- */

export function DesempenhoReal() {
  const { usuario } = useSessao();
  const historico = useQuery({
    queryKey: ["tentativas", usuario?.id],
    queryFn: () => minhasTentativas(usuario!.id),
    enabled: Boolean(usuario),
  });
  const entregues = (historico.data ?? []).filter((t) => t.status !== "em_andamento");
  const media = entregues.length
    ? Math.round((entregues.reduce((n, t) => n + (t.percentual ?? 0), 0) / entregues.length) * 10) /
      10
    : null;
  return (
    <>
      <Titulo titulo="Desempenho" subtitulo="Todos os simulados que você entregou." />
      {historico.error ? (
        <Falhou erro={historico.error} />
      ) : !historico.data ? (
        <Carregando />
      ) : entregues.length === 0 ? (
        <EstadoVazio
          icon={ClipboardList}
          titulo="Ainda sem simulados entregues"
          texto="Faça seu primeiro simulado para acompanhar sua evolução aqui."
          acao={
            <Button asChild>
              <Link to="/app/simulados">Ver simulados</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Cartao>
            <p className="text-muted-foreground">Média de acertos</p>
            <p className="font-display text-5xl font-black tabular-nums">
              {media?.toLocaleString("pt-BR")}%
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Em {entregues.length} {entregues.length === 1 ? "simulado" : "simulados"}
            </p>
            <AvisoTri />
          </Cartao>
          <ListaTentativas itens={entregues} />
        </>
      )}
    </>
  );
}

/* ---------- Redação ---------- */

export function RedacaoEmBreve() {
  return (
    <>
      <Titulo titulo="Redação" />
      <EstadoVazio
        icon={PenLine}
        titulo="Em breve"
        texto="A correção de redação está sendo preparada. Enquanto isso, treine com os simulados."
        acao={
          <Button asChild>
            <Link to="/app/simulados">Ver simulados</Link>
          </Button>
        }
      />
    </>
  );
}

/* ---------- Resultado ---------- */

const nomeArea = (a: AreaId) => areas.find((x) => x.id === a)?.nome ?? a;

export function ResultadoReal({ id }: { id: string }) {
  const { data, error } = useQuery({
    queryKey: ["resultado", id],
    queryFn: () => buscarResultado(id),
  });
  const porArea = useMemo(() => {
    const m = new Map<AreaId, { acertos: number; total: number }>();
    for (const q of data?.questoes ?? []) {
      const v = m.get(q.area) ?? { acertos: 0, total: 0 };
      v.total += 1;
      if (q.resposta === q.gabarito) v.acertos += 1;
      m.set(q.area, v);
    }
    return [...m.entries()];
  }, [data]);

  if (error) return <Falhou erro={error} />;
  if (data === undefined) return <Carregando texto="Carregando seu resultado…" />;
  if (data === null || data.tentativa.status === "em_andamento")
    return (
      <EstadoVazio
        titulo="Resultado não disponível"
        texto="Este simulado ainda não foi entregue."
        acao={
          <Button asChild>
            <Link to="/app/simulados">Ver simulados</Link>
          </Button>
        }
      />
    );
  const t = data.tentativa;
  return (
    <>
      <Button asChild variant="ghost" className="-ml-3 mb-4">
        <Link to="/app">
          <ArrowLeft aria-hidden />
          Voltar para o início
        </Link>
      </Button>
      <Titulo
        sobretitulo="Resultado"
        titulo={t.titulo}
        subtitulo={`Entregue em ${dataCurta(t.entregueEm ?? t.iniciadaEm)}`}
      />
      <Cartao>
        <p className="font-display text-6xl font-black tabular-nums">
          {(t.percentual ?? 0).toLocaleString("pt-BR")}%
        </p>
        <p className="mb-4 mt-1 text-muted-foreground">
          {t.acertos} de {t.total} questões certas
        </p>
        <BarraResultado acertos={t.acertos ?? 0} erros={t.erros ?? 0} brancos={t.emBranco ?? 0} />
        <div className="mt-4">
          <Contagens acertos={t.acertos ?? 0} erros={t.erros ?? 0} brancos={t.emBranco ?? 0} />
        </div>
        <AvisoTri />
      </Cartao>

      {porArea.length > 1 && (
        <Cartao titulo="Por área" className="mt-6">
          <ul className="space-y-3">
            {porArea.map(([a, v]) => (
              <li key={a} className="flex items-center justify-between gap-3">
                <AreaChip area={a} />
                <span className="font-semibold tabular-nums">
                  {v.acertos} de {v.total}
                </span>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      {data.questoes.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[22px] font-bold">Correção questão por questão</h2>
          <p className="mt-1 text-muted-foreground">Toque numa questão para ver o enunciado.</p>
          <ul className="mt-4 space-y-3">
            {data.questoes.map((q) => (
              <QuestaoRevisada key={q.id} q={q} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function QuestaoRevisada({ q }: { q: QuestaoCorrigida }) {
  const [aberta, setAberta] = useState(false);
  const status = q.resposta === null ? "branco" : q.resposta === q.gabarito ? "acerto" : "erro";
  return (
    <li className="cartao overflow-hidden">
      <button
        type="button"
        aria-expanded={aberta}
        onClick={() => setAberta(!aberta)}
        className="flex min-h-14 w-full items-center gap-3 p-4 text-left hover:bg-creme/60"
      >
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold",
            status === "acerto" && "bg-acerto/15 text-acerto",
            status === "erro" && "bg-erro/15 text-erro",
            status === "branco" && "bg-branco-q/15 text-branco-q-texto",
          )}
        >
          {q.id}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            {status === "acerto" ? "Acertou" : status === "erro" ? "Errou" : "Em branco"}
            <span className="font-normal text-muted-foreground"> · {nomeArea(q.area)}</span>
          </span>
          <span className="block text-sm text-muted-foreground">
            {q.resposta !== null && `Sua resposta: ${LETRAS[q.resposta]} · `}Gabarito:{" "}
            {LETRAS[q.gabarito]}
          </span>
        </span>
        <ChevronDown
          className={cn("size-5 shrink-0 transition-transform", aberta && "rotate-180")}
          aria-hidden
        />
      </button>
      {aberta && (
        <div className="border-t border-linha p-4">
          <TextoQuestao q={q} />
          <ol className="space-y-2">
            {q.alternativas.map((alt, i) => (
              <li
                key={i}
                className={cn(
                  "flex gap-3 rounded-xl border border-linha p-3",
                  i === q.gabarito && "border-acerto bg-acerto/10",
                  i === q.resposta && i !== q.gabarito && "border-erro bg-erro/10",
                )}
              >
                <span className="font-bold">{LETRAS[i]}</span>
                <span className="min-w-0 flex-1">{alt}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </li>
  );
}
