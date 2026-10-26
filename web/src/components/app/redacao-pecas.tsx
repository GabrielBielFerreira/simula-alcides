/**
 * Peças da área de Redação do estudante: selo de prévia, etapas, barra de competência
 * e a devolutiva completa (usada nas redações de Maria e no fim do editor).
 */
import { useState, type CSSProperties, type ReactNode } from "react";
import {
  Check,
  Info,
  Lightbulb,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DURACAO, EstadoVazio, NumeroAnimado, Revelar, Selo } from "@/components/ds";
import { competenciasRedacao } from "@/data/mock";
import {
  competenciasCurtas,
  etapasRedacao,
  type Devolutiva as DadosDevolutiva,
  type TipoTrecho,
  type Trecho,
} from "@/data/estudante";
import { Cartao, formato } from "./shared";
import { BarraCompetencia } from "./barra-competencia";
import { FotosDaFolha } from "./redacao-foto";

export const AVISO_ESTIMATIVA =
  "Estimativa pedagógica gerada por IA. Não é a nota oficial do ENEM. Um professor pode revisar.";

export function SeloPrevia() {
  return (
    <Selo tom="creme">
      <Sparkles className="size-4" aria-hidden />
      Nota estimada por IA
    </Selo>
  );
}

/* ---------- Etapas: Proposta → Escrever → Revisar → Corrigindo → Devolutiva ---------- */

/**
 * Ao avançar, o Check da etapa concluída entra com um pop e a linha até a próxima se preenche
 * (scaleX, 360ms); ao voltar, a linha se esvazia. Só anima o que muda depois de montar: a
 * devolutiva aberta direto já chega pronta, sem pops.
 */
export function EtapasRedacao({ atual }: { atual: number }) {
  const [vista, setVista] = useState(atual);
  const [anterior, setAnterior] = useState(atual);
  if (atual !== vista) {
    setAnterior(vista);
    setVista(atual);
  }
  const mudou = anterior !== atual;
  return (
    <nav aria-label="Etapas da redação" className="mb-8">
      <ol className="flex items-center">
        {etapasRedacao.map((etapa, i) => {
          const feita = i < atual;
          const ativa = i === atual;
          const acabouDeFicarFeita = feita && i >= anterior;
          return (
            <li
              key={etapa}
              aria-current={ativa ? "step" : undefined}
              className="flex flex-1 items-center last:flex-none"
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums transition-colors",
                    feita && "bg-marrom text-card",
                    ativa && "bg-laranja-acao text-primary-foreground ring-4 ring-laranja-acao/20",
                    !feita &&
                      !ativa &&
                      "border-2 border-borda-controle bg-card text-muted-foreground",
                  )}
                >
                  {feita ? (
                    <Check
                      className={cn(
                        "size-4",
                        acabouDeFicarFeita && "anima-pop motion-reduce:animate-none",
                      )}
                    />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    "hidden text-sm md:inline",
                    ativa ? "font-bold text-marrom" : "font-semibold text-muted-foreground",
                  )}
                >
                  {etapa}
                </span>
                <span className="sr-only">
                  {feita ? ", concluída" : ativa ? ", etapa atual" : ", próxima"}
                </span>
              </span>
              {i < etapasRedacao.length - 1 && (
                <span
                  aria-hidden
                  className="relative mx-2 h-0.5 min-w-3 flex-1 overflow-hidden rounded-full bg-linha md:mx-3"
                >
                  <span
                    className={cn(
                      "absolute inset-0 origin-left rounded-full bg-marrom transition-transform duration-360 ease-saida",
                      feita ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p
        key={atual}
        className={cn(
          "mt-3 text-sm font-semibold text-marrom md:hidden",
          mudou && "anima-aparecer motion-reduce:animate-none",
        )}
        aria-hidden
      >
        Etapa {atual + 1} de {etapasRedacao.length} · {etapasRedacao[atual]}
      </p>
    </nav>
  );
}

/** Mudança de pontos entre duas redações: subiu (verde), igual (muted) ou caiu (marrom). */
export function MudancaPontos({ de, para }: { de: number; para: number }) {
  const d = para - de;
  const Icone = d > 0 ? TrendingUp : d < 0 ? TrendingDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-end gap-1 whitespace-nowrap text-sm font-semibold",
        d > 0 ? "text-acerto" : d < 0 ? "text-marrom" : "text-muted-foreground",
      )}
    >
      <Icone className="size-4 shrink-0" aria-hidden />
      {d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : "estável"}
    </span>
  );
}

/** "jul 120 → set 160", com a seta lida como "para". */
function DePara({
  de,
  para,
}: {
  de: { rotulo: string; valor: number };
  para: { rotulo: string; valor: number };
}) {
  return (
    <span className="block text-sm tabular-nums text-muted-foreground">
      {de.rotulo} {de.valor} <span aria-hidden>→</span>
      <span className="sr-only">para</span> {para.rotulo}{" "}
      <span className="font-semibold text-marrom">{para.valor}</span>
    </span>
  );
}

/* ---------- Trechos destacados ---------- */

const estiloTrecho: Record<
  TipoTrecho,
  { rotulo: string; icone: LucideIcon; marca: string; selo: string }
> = {
  forte: {
    rotulo: "Ponto forte",
    icone: Check,
    marca: "bg-amarelo/45",
    selo: "bg-amarelo/45 text-marrom",
  },
  melhorar: {
    rotulo: "Dá para melhorar",
    icone: Lightbulb,
    marca: "bg-rosa/12 underline decoration-rosa decoration-2 underline-offset-4",
    selo: "bg-rosa/10 text-rosa",
  },
};

type TrechoNumerado = Trecho & { n: number; posicao: number };

/** Trechos que aparecem no texto, numerados na ordem de leitura. */
function localizarTrechos(texto: string, trechos: Trecho[]): TrechoNumerado[] {
  const unicos = trechos.filter((t, i) => trechos.findIndex((x) => x.trecho === t.trecho) === i);
  return unicos
    .map((t) => ({ ...t, n: 0, posicao: texto.indexOf(t.trecho) }))
    .filter((t) => t.posicao >= 0)
    .sort((a, b) => a.posicao - b.posicao)
    .map((t, i) => ({ ...t, n: i + 1 }));
}

function NumeroTrecho({ n, className }: { n: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid size-6 shrink-0 place-items-center rounded-full bg-marrom indent-0 text-xs font-bold tabular-nums text-card",
        className,
      )}
    >
      {n}
    </span>
  );
}

/** O texto da redação, com parágrafos recuados e os trechos marcados. */
function TextoComTrechos({ texto, trechos }: { texto: string; trechos: TrechoNumerado[] }) {
  let inicio = 0;
  const paragrafos = texto.split("\n").map((p) => {
    const bloco = { texto: p, inicio };
    inicio += p.length + 1;
    return bloco;
  });
  return (
    <div className="space-y-4 text-[17px] leading-[1.8]">
      {paragrafos
        .filter((p) => p.texto.trim())
        .map((p) => {
          const fim = p.inicio + p.texto.length;
          const partes: ReactNode[] = [];
          let cursor = p.inicio;
          for (const t of trechos) {
            if (t.posicao < cursor || t.posicao + t.trecho.length > fim) continue;
            partes.push(texto.slice(cursor, t.posicao));
            const estilo = estiloTrecho[t.tipo];
            partes.push(
              <mark
                key={t.n}
                className={cn(
                  "rounded px-0.5 text-marrom [-webkit-box-decoration-break:clone] [box-decoration-break:clone]",
                  estilo.marca,
                )}
              >
                <NumeroTrecho n={t.n} className="mr-1 size-5 align-[2px] text-[11px]" />
                <span className="sr-only">
                  Trecho {t.n}, {estilo.rotulo.toLowerCase()}:{" "}
                </span>
                {t.trecho}
              </mark>,
            );
            cursor = t.posicao + t.trecho.length;
          }
          partes.push(texto.slice(cursor, fim));
          return (
            <p key={p.inicio} className="indent-8">
              {partes}
            </p>
          );
        })}
    </div>
  );
}

/* ---------- Devolutiva ---------- */

export function Devolutiva({
  dados,
  texto,
  anterior,
  atual,
  enviadaEm,
  exemplo = false,
  acao,
  acaoSemAnterior,
  fotos = [],
}: {
  dados: DadosDevolutiva;
  texto: string;
  /** Fotos da folha (redação manuscrita): o texto mostrado é o que a IA leu nelas. */
  fotos?: string[];
  /** Redação anterior, para a evolução por competência. */
  anterior?: { rotulo: string; curto: string; competencias: number[] };
  /** Como chamar esta redação na comparação (ex.: "setembro" e "set"). */
  atual: { rotulo: string; curto: string };
  enviadaEm?: string;
  /** Devolutiva de demonstração do editor (notas e comentários de exemplo). */
  exemplo?: boolean;
  /** Botão no fim do plano de melhoria. */
  acao?: ReactNode;
  /** Ação do estado vazio da evolução, quando não há redação anterior. */
  acaoSemAnterior?: ReactNode;
}) {
  const nota = dados.competencias.reduce((a, b) => a + b, 0);
  const notaAnterior = anterior?.competencias.reduce((a, b) => a + b, 0);
  const trechos = localizarTrechos(texto, dados.trechos);

  return (
    <div className="space-y-6">
      {exemplo && (
        <p className="flex items-start gap-2 rounded-xl border border-linha bg-creme px-4 py-3 text-sm text-marrom">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Protótipo: a nota e os comentários desta devolutiva são de exemplo. Na versão final, a IA
          lê o seu texto.
        </p>
      )}

      {/* O único bloco de cor sólida da tela. Entra ao aparecer (no celular, muitas vezes só
          depois de rolar); a nota conta e o selo de diferença surge em seguida. */}
      <Revelar
        como="section"
        aria-labelledby="titulo-nota"
        className="casario-claro rounded-2xl bg-vinho p-5 pb-14 text-creme md:p-8 md:pb-16"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="titulo-nota" className="font-sans text-sm font-semibold text-creme">
              Sua nota
            </h2>
            <p className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
              {/* A nota estimada conta até o valor (600ms); o texto "nota estimada" fica sempre ao lado. */}
              <NumeroAnimado
                valor={nota}
                duracao={DURACAO.longa}
                className="font-display text-[56px] font-black leading-none text-amarelo lg:text-[72px]"
              />
              <span className="pb-1">
                <span className="block font-display text-2xl font-bold text-offwhite">
                  nota estimada
                </span>
                <span className="block text-sm">de 0 a {formato(1000)}</span>
              </span>
            </p>
            {notaAnterior !== undefined && anterior && (
              <p
                className="surge-depois mt-4 inline-flex origin-left items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-offwhite"
                style={{ "--depois": `${DURACAO.longa}ms` } as CSSProperties}
              >
                {nota >= notaAnterior ? (
                  <TrendingUp className="size-4" aria-hidden />
                ) : (
                  <TrendingDown className="size-4" aria-hidden />
                )}
                {nota === notaAnterior
                  ? `Mesma nota de ${anterior.rotulo}`
                  : `${nota > notaAnterior ? "+" : "−"}${Math.abs(nota - notaAnterior)} pontos desde ${anterior.rotulo}`}
              </p>
            )}
          </div>
          <div className="space-y-2 text-sm lg:max-w-xs">
            <p className="flex items-start gap-2">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              {AVISO_ESTIMATIVA}
            </p>
            {enviadaEm && <p className="pl-6">Enviada em {enviadaEm}</p>}
          </div>
        </div>
      </Revelar>

      <Revelar>
        <Cartao>
          <h2 className="text-[22px] font-bold">Por competência</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada competência vale de 0 a 200 pontos, em 5 níveis.
          </p>
          {/* escalonar-filhos: as 5 barras enchem uma depois da outra, cada uma nível a nível. */}
          <ol className="escalonar-filhos mt-2 divide-y divide-linha">
            {dados.competencias.map((valor, i) => (
              <li
                key={competenciasRedacao[i]}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 py-5 last:pb-0 lg:grid-cols-[minmax(0,1fr)_11rem_6.5rem] lg:gap-x-8"
              >
                <div className="col-span-2 flex min-w-0 gap-3 lg:col-span-1">
                  <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-rosa/10 font-display font-black text-rosa"
                  >
                    C{i + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-sans text-base font-semibold leading-snug">
                      <span className="sr-only">Competência {i + 1}: </span>
                      {competenciasRedacao[i]}
                    </h3>
                    <p className="mt-1 text-muted-foreground">{dados.comentarios[i]}</p>
                  </div>
                </div>
                {/* No celular, a barra alinha com o texto da competência, não com o selo C1. */}
                <BarraCompetencia valor={valor} className="pl-[3.25rem] lg:pl-0" />
                <p className="text-right tabular-nums">
                  <span className="font-display text-2xl font-black">{valor}</span>
                  <span className="ml-1 text-sm font-semibold text-muted-foreground">de 200</span>
                </p>
              </li>
            ))}
          </ol>
        </Cartao>
      </Revelar>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Revelar className="min-w-0">
          <Cartao>
            <h2 className="text-[22px] font-bold">Seu texto</h2>
            {fotos.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                Lido da sua foto pela IA. Se alguma palavra saiu diferente da folha, foi a leitura
                da letra.
              </p>
            )}
            {trechos.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2 text-sm" aria-label="Legenda dos destaques">
                {(Object.keys(estiloTrecho) as TipoTrecho[]).map((tipo) => {
                  const { rotulo, icone: Icone, selo } = estiloTrecho[tipo];
                  return (
                    <li
                      key={tipo}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold",
                        selo,
                      )}
                    >
                      <Icone className="size-4" aria-hidden />
                      {rotulo}
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-5">
              <TextoComTrechos texto={texto} trechos={trechos} />
            </div>
            <FotosDaFolha fotos={fotos} className="mt-6 border-t border-linha pt-5" />
          </Cartao>
        </Revelar>

        <Revelar className="min-w-0 lg:sticky lg:top-6">
          <Cartao>
            <h2 className="text-[22px] font-bold">Trechos destacados</h2>
            {trechos.length ? (
              // Os trechos surgem um a um, logo depois do cartão.
              <Revelar como="ol" escalonar efeito="surgir" atraso={150} className="mt-4 space-y-5">
                {trechos.map((t) => {
                  const { rotulo, icone: Icone, selo } = estiloTrecho[t.tipo];
                  return (
                    <li key={t.n} className="flex gap-3">
                      <NumeroTrecho n={t.n} className="mt-0.5" />
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold",
                              selo,
                            )}
                          >
                            <Icone className="size-4" aria-hidden />
                            {rotulo}
                          </span>
                          <span className="font-semibold text-muted-foreground">
                            C{t.competencia + 1} · {competenciasCurtas[t.competencia]}
                          </span>
                        </p>
                        <blockquote className="mt-2 border-l-2 border-linha pl-3 text-sm italic text-muted-foreground">
                          “{t.trecho}”
                        </blockquote>
                        <p className="mt-2">{t.comentario}</p>
                      </div>
                    </li>
                  );
                })}
              </Revelar>
            ) : (
              <p className="mt-3 text-muted-foreground">
                Desta vez não destacamos trechos. Os comentários por competência mostram o caminho.
              </p>
            )}
          </Cartao>
        </Revelar>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Revelar className="min-w-0">
          <Cartao>
            <h2 className="text-[22px] font-bold">Plano de melhoria</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Três passos para a próxima redação, começando pelo que mais rende.
            </p>
            <ol className="mt-5 space-y-5">
              {dados.plano.map((p, i) => (
                <li key={p.titulo} className="flex gap-4">
                  <span
                    aria-hidden
                    className="w-6 shrink-0 font-display text-[32px] font-black leading-none text-laranja"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-rosa">
                      C{p.competencia + 1} · {competenciasCurtas[p.competencia]}
                    </p>
                    <h3 className="mt-0.5 font-sans text-base font-semibold">{p.titulo}</h3>
                    <p className="mt-1 text-muted-foreground">{p.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
            {acao && <div className="mt-6 border-t border-linha pt-5">{acao}</div>}
          </Cartao>
        </Revelar>

        <Revelar className="min-w-0">
          <Cartao>
            <h2 className="text-[22px] font-bold">Evolução por competência</h2>
            {anterior && notaAnterior !== undefined ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  De {anterior.rotulo} para {atual.rotulo}, comparando só redações.
                </p>
                <ul className="mt-4 divide-y divide-linha border-y border-linha">
                  {dados.competencias.map((valor, i) => (
                    <li key={competenciasCurtas[i]} className="flex items-center gap-3 py-3">
                      <span aria-hidden className="w-7 shrink-0 font-display font-black text-rosa">
                        C{i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold leading-snug">
                          <span className="sr-only">Competência {i + 1}, </span>
                          {competenciasCurtas[i]}
                        </span>
                        <DePara
                          de={{ rotulo: anterior.curto, valor: anterior.competencias[i] }}
                          para={{ rotulo: atual.curto, valor }}
                        />
                      </span>
                      <MudancaPontos de={anterior.competencias[i]} para={valor} />
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-3 pt-4">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">Nota estimada</span>
                    <DePara
                      de={{ rotulo: anterior.curto, valor: notaAnterior }}
                      para={{ rotulo: atual.curto, valor: nota }}
                    />
                  </span>
                  <MudancaPontos de={notaAnterior} para={nota} />
                </div>
              </>
            ) : (
              <div className="mt-4">
                <EstadoVazio
                  icon={TrendingUp}
                  titulo="Sua primeira devolutiva"
                  texto="A evolução por competência aparece a partir da segunda redação."
                  acao={acaoSemAnterior}
                />
              </div>
            )}
          </Cartao>
        </Revelar>
      </div>
    </div>
  );
}
