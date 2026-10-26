import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  CircleCheck,
  Clock,
  Highlighter,
  Info,
  ListChecks,
  PenLine,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Carregando, EstadoVazio, Revelar } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { regrasRedacao } from "@/data/estudante";
import { useSessao } from "@/lib/sessao";
import {
  buscarPropostas,
  redacoesDoEstudante,
  type PropostaReal,
  type RedacaoResumo,
} from "@/lib/redacao";
import { Cartao, formato } from "./shared";
import { AVISO_ESTIMATIVA, SeloPrevia } from "./redacao-pecas";

export const usePropostas = () =>
  useQuery({ queryKey: ["propostas-redacao"], queryFn: buscarPropostas });

export function useMinhasRedacoes() {
  const { usuario } = useSessao();
  return useQuery({
    queryKey: ["minhas-redacoes", usuario?.id],
    queryFn: () => redacoesDoEstudante(usuario!.id),
    enabled: !!usuario,
  });
}

const dataExtensa = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Recife",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));

/** /app/redacao · propostas de tema e redações do estudante. */
export function RedacaoInicio() {
  const propostas = usePropostas();
  const minhasQ = useMinhasRedacoes();
  const erro = propostas.error ?? minhasQ.error;
  if (erro)
    return (
      <EstadoVazio
        titulo="Não foi possível carregar"
        texto={erro instanceof Error ? erro.message : "Verifique a internet e tente de novo."}
        acao={<Button onClick={() => window.location.reload()}>Tentar de novo</Button>}
      />
    );
  if (!propostas.data || !minhasQ.data) return <Carregando texto="Carregando a redação…" />;

  const minhas = minhasQ.data;
  const lista = propostas.data;
  const sugerida = lista.find((p) => !minhas.some((r) => r.propostaId === p.id)) ?? lista[0];
  // O tema sugerido vem primeiro: é o próximo passo do estudante.
  const ordenadas = sugerida ? [sugerida, ...lista.filter((p) => p.id !== sugerida.id)] : [];
  return (
    <>
      <header className="mb-6">
        <h1 className="titulo-pagina">Redação</h1>
        <p className="mt-3 text-muted-foreground">
          Escolha um tema, escreva à mão no papel, tire uma foto e receba a correção por
          competência.
        </p>
        <div className="mt-4">
          <SeloPrevia />
        </div>
      </header>

      {/* No celular, as redações vêm antes das propostas; no desktop, ficam à direita. */}
      <div className="grid items-start gap-6 xl:grid-cols-3 xl:grid-rows-[auto_1fr]">
        <Revelar className="min-w-0 xl:col-start-3 xl:row-start-1">
          <MinhasRedacoes minhas={minhas} />
        </Revelar>
        <section
          id="propostas"
          aria-labelledby="titulo-propostas"
          className="min-w-0 scroll-mt-6 xl:col-span-2 xl:col-start-1 xl:row-span-2 xl:row-start-1"
        >
          <h2 id="titulo-propostas" className="text-[22px] font-bold">
            Propostas
          </h2>
          <p className="mt-1 text-muted-foreground">
            Temas no estilo do ENEM, com textos motivadores.
          </p>
          <Revelar como="ul" escalonar className="mt-4 space-y-4">
            {ordenadas.map((p) => (
              <li key={p.id}>
                <CartaoProposta
                  proposta={p}
                  feita={minhas.find((r) => r.propostaId === p.id)}
                  sugerida={p.id === sugerida?.id}
                />
              </li>
            ))}
          </Revelar>
        </section>
        <Revelar className="min-w-0 xl:col-start-3 xl:row-start-2">
          <ComoEaDevolutiva />
        </Revelar>
      </div>
    </>
  );
}

function CartaoProposta({
  proposta,
  feita,
  sugerida,
}: {
  proposta: PropostaReal;
  /** Redação do estudante sobre este tema, se houver (a mais recente). */
  feita?: RedacaoResumo;
  /** Próximo tema sugerido: ganha o destaque de cartão tocável. */
  sugerida: boolean;
}) {
  return (
    <article
      className={cn("cartao p-5 md:p-6", sugerida && "border-laranja-acao/35 shadow-cartao")}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span className="font-bold uppercase tracking-[0.14em] text-rosa">{proposta.eixo}</span>
        {feita ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-creme px-2.5 py-0.5 font-semibold text-marrom ring-1 ring-linha">
            <CircleCheck className="size-4" aria-hidden />
            Você escreveu em {dataExtensa(feita.enviadaEm)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amarelo px-2.5 py-0.5 font-semibold text-vinho">
            <Sparkles className="size-4" aria-hidden />
            Tema novo para você
          </span>
        )}
      </div>
      <h3 className="mt-3 text-xl font-bold leading-snug md:text-[22px]">{proposta.tema}</h3>
      {proposta.resumo && <p className="mt-2 text-muted-foreground">{proposta.resumo}</p>}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {proposta.textos.length} textos motivadores · {regrasRedacao.minLinhas} a{" "}
          {regrasRedacao.maxLinhas} linhas
        </p>
        <Button asChild variant={sugerida ? "default" : "outline"} className="w-full sm:w-auto">
          <Link to="/app/redacao/$id" params={{ id: proposta.id }}>
            <PenLine />
            {feita ? "Escrever de novo" : "Escrever"}
            <span className="sr-only">: {proposta.tema}</span>
          </Link>
        </Button>
      </div>
    </article>
  );
}

function MinhasRedacoes({ minhas }: { minhas: RedacaoResumo[] }) {
  const corrigidas = minhas.filter((r) => r.nota !== null);
  const primeira = corrigidas[corrigidas.length - 1];
  const ultima = corrigidas[0];
  return (
    <Cartao>
      <h2 className="text-[22px] font-bold">Minhas redações</h2>
      {minhas.length ? (
        <>
          {corrigidas.length > 1 && ultima.nota! > primeira.nota! && (
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-acerto">
              <TrendingUp className="size-4" aria-hidden />+{ultima.nota! - primeira.nota!} pontos
              desde a primeira
            </p>
          )}
          <ul className="mt-3 divide-y divide-linha">
            {minhas.map((r) => (
              <li key={r.id}>
                <Link
                  to="/app/redacao/$id"
                  params={{ id: r.id }}
                  className="-mx-2 flex min-h-[4.5rem] items-center gap-4 rounded-xl px-2 py-3 hover:bg-creme/60"
                >
                  <span className="w-16 shrink-0">
                    {r.nota !== null ? (
                      <>
                        <span className="block font-display text-[28px] font-black leading-none tabular-nums text-rosa">
                          {r.nota}
                        </span>
                        <span className="mt-1 block text-sm text-muted-foreground">estimada</span>
                      </>
                    ) : (
                      <span className="flex flex-col items-start gap-1 text-sm font-semibold text-muted-foreground">
                        <Clock className="size-6" aria-hidden />
                        sem nota
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-muted-foreground">
                      {dataExtensa(r.enviadaEm)}
                      {r.nota === null && " · aguardando correção"}
                    </span>
                    <span className="mt-0.5 block font-semibold leading-snug">{r.tema}</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-4">
          <EstadoVazio
            icon={PenLine}
            titulo="Sua primeira redação ainda está por vir"
            texto="Escolha uma proposta, escreva no papel e mande a foto. A devolutiva chega em instantes."
            acao={
              <Button asChild>
                <a href="#propostas">Ver propostas</a>
              </Button>
            }
          />
        </div>
      )}
    </Cartao>
  );
}

function ComoEaDevolutiva() {
  const itens = [
    {
      icone: Sparkles,
      texto: `Nota estimada de 0 a ${formato(1000)}, pelas 5 competências do ENEM.`,
    },
    { icone: Highlighter, texto: "Trechos do seu texto comentados." },
    { icone: ListChecks, texto: "Plano de melhoria em 3 passos." },
    {
      icone: ShieldCheck,
      texto: `Até ${regrasRedacao.porDia} redações por dia. Só o texto vai para a IA, sem seu nome nem seus dados.`,
    },
  ];
  return (
    <Cartao>
      <h2 className="text-[22px] font-bold">Como é a devolutiva</h2>
      <ul className="mt-4 space-y-4">
        {itens.map(({ icone: Icone, texto }) => (
          <li key={texto} className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rosa/10 text-rosa">
              <Icone className="size-5" aria-hidden />
            </span>
            <span>{texto}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 flex items-start gap-2 border-t border-linha pt-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        {AVISO_ESTIMATIVA}
      </p>
    </Cartao>
  );
}
