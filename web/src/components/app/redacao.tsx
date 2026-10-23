import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  CircleCheck,
  Highlighter,
  Info,
  ListChecks,
  PenLine,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EstadoVazio, Revelar } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { propostas, redacoesMaria } from "@/data/prototipo";
import { datasRedacoes, detalhesPropostas, partesData, regrasRedacao } from "@/data/estudante";
import { Cartao, formato } from "./shared";
import { AVISO_ESTIMATIVA, SeloPrevia } from "./redacao-pecas";

type Redacao = (typeof redacoesMaria)[number];

/** /app/redacao · propostas de tema e redações de Maria. */
export function RedacaoInicio() {
  // Só para a demonstração: mostra a tela de quem ainda não escreveu nenhuma redação.
  const [verVazio, setVerVazio] = useState(false);
  const minhas: Redacao[] = verVazio ? [] : redacoesMaria;
  const sugerida = propostas.find((p) => !minhas.some((r) => r.tema === p.tema)) ?? propostas[0];
  // O tema sugerido vem primeiro: é o próximo passo de Maria.
  const ordenadas = [sugerida, ...propostas.filter((p) => p.id !== sugerida.id)];
  return (
    <>
      <header className="mb-6">
        <h1 className="titulo-pagina">Redação</h1>
        <p className="mt-3 text-muted-foreground">
          Escolha um tema, escreva no seu ritmo e receba orientação por competência.
        </p>
        <div className="mt-4">
          <SeloPrevia />
        </div>
      </header>

      {/* No celular, as redações vêm antes das propostas; no desktop, ficam à direita. */}
      <div className="grid items-start gap-6 xl:grid-cols-3 xl:grid-rows-[auto_1fr]">
        <Revelar className="min-w-0 xl:col-start-3 xl:row-start-1">
          <MinhasRedacoes
            minhas={minhas}
            verVazio={verVazio}
            alternarDemonstracao={() => setVerVazio((v) => !v)}
          />
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
            Temas autorais no estilo do ENEM, com textos motivadores.
          </p>
          {/* Propostas em cascata (uma vez), a sugerida primeiro. */}
          <Revelar como="ul" escalonar className="mt-4 space-y-4">
            {ordenadas.map((p) => (
              <li key={p.id}>
                <CartaoProposta
                  proposta={p}
                  feita={minhas.find((r) => r.tema === p.tema)}
                  sugerida={p.id === sugerida.id}
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
  proposta: (typeof propostas)[number];
  /** Redação de Maria sobre este tema, se houver. */
  feita?: Redacao;
  /** Próximo tema sugerido: ganha o destaque de cartão tocável. */
  sugerida: boolean;
}) {
  const detalhe = detalhesPropostas[proposta.id];
  return (
    <article
      className={cn("cartao p-5 md:p-6", sugerida && "border-2 border-marrom shadow-cartao")}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span className="font-bold uppercase tracking-[0.14em] text-rosa">{detalhe.eixo}</span>
        {feita ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-creme px-2.5 py-0.5 font-semibold text-marrom ring-1 ring-linha">
            <CircleCheck className="size-4" aria-hidden />
            Você escreveu em {feita.mes}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amarelo px-2.5 py-0.5 font-semibold text-vinho">
            <Sparkles className="size-4" aria-hidden />
            Tema novo para você
          </span>
        )}
      </div>
      <h3 className="mt-3 text-xl font-bold leading-snug md:text-[22px]">{proposta.tema}</h3>
      <p className="mt-2 text-muted-foreground">{detalhe.resumo}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {detalhe.textos.length} textos motivadores · {regrasRedacao.minLinhas} a{" "}
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

function MinhasRedacoes({
  minhas,
  verVazio,
  alternarDemonstracao,
}: {
  minhas: Redacao[];
  verVazio: boolean;
  alternarDemonstracao: () => void;
}) {
  const primeira = minhas[0];
  const ultima = minhas[minhas.length - 1];
  const [trocou, setTrocou] = useState(false);
  return (
    <Cartao>
      <h2 className="text-[22px] font-bold">Minhas redações</h2>
      {/* Ao alternar a demonstração, o conteúdo troca com um fade curto. */}
      <div
        key={String(verVazio)}
        className={cn(trocou && "anima-aparecer motion-reduce:animate-none")}
      >
        {minhas.length ? (
          <>
            {minhas.length > 1 && (
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-acerto">
                <TrendingUp className="size-4" aria-hidden />+{ultima.nota - primeira.nota} pontos
                desde {primeira.mes}
              </p>
            )}
            <ul className="mt-3 divide-y divide-linha">
              {[...minhas].reverse().map((r) => {
                const { dia, mesExtenso } = partesData(datasRedacoes[r.id]);
                return (
                  <li key={r.id}>
                    <Link
                      to="/app/redacao/$id"
                      params={{ id: r.id }}
                      className="-mx-2 flex min-h-[4.5rem] items-center gap-4 rounded-xl px-2 py-3 hover:bg-creme/60"
                    >
                      <span className="w-16 shrink-0">
                        <span className="block font-display text-[28px] font-black leading-none tabular-nums text-rosa">
                          {r.nota}
                        </span>
                        <span className="mt-1 block text-sm text-muted-foreground">estimada</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-muted-foreground">
                          {Number(dia)} de {mesExtenso}
                        </span>
                        <span className="mt-0.5 block font-semibold leading-snug">{r.tema}</span>
                      </span>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="mt-4">
            <EstadoVazio
              icon={PenLine}
              titulo="Sua primeira redação ainda está por vir"
              texto="Escolha uma proposta e escreva no seu ritmo. A devolutiva chega em instantes."
              acao={
                <Button asChild>
                  <a href="#propostas">Ver propostas</a>
                </Button>
              }
            />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          setTrocou(true);
          alternarDemonstracao();
        }}
        className="mt-3 min-h-11 text-sm text-muted-foreground underline underline-offset-4 hover:text-marrom"
      >
        {verVazio ? "Protótipo: voltar às redações de Maria" : "Protótipo: ver sem redações"}
      </button>
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
