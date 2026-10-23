import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, CalendarDays, ChevronRight, Download, Info, TrendingUp } from "lucide-react";
import { areas } from "@/data/mock";
import { historico, resultadoAreas } from "@/data/prototipo";
import {
  assuntosDificuldade,
  historicoRapidos,
  modosEvolucao,
  partesData,
  type ModoEvolucao,
} from "@/data/estudante";
import { AreaChip, BarraProgresso, EstadoVazio, NumeroAnimado, Revelar } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AvisoTri, BarraResultado, Cartao, Evolucao, Tendencia } from "./shared";
import { AbasDeslizantes } from "./controles";

const ultimoCompleto = historico[historico.length - 1];
const nomeArea = Object.fromEntries(areas.map((a) => [a.id, a.nome]));
const modos = Object.keys(modosEvolucao) as ModoEvolucao[];
const opcoesModo = modos.map((modo) => ({ valor: modo, rotulo: modosEvolucao[modo].rotulo }));

/** /app/desempenho · evolução por modalidade, áreas, assuntos e histórico de Maria. */
export function Desempenho() {
  return (
    <>
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="titulo-pagina">Seu desempenho</h1>
          <p className="mt-3 text-muted-foreground">
            Sua trajetória desde fevereiro. Cada simulado mostra o próximo passo.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="self-start lg:self-auto"
          onClick={() =>
            toast("Disponível na versão final", {
              description: "O relatório em PDF vai reunir sua evolução e seus próximos passos.",
            })
          }
        >
          <Download />
          Baixar PDF
        </Button>
      </header>

      {/* Uma entrada por seção: o que está à vista entra ao abrir; o resto, ao rolar. */}
      <div className="space-y-6">
        <Revelar>
          <CartaoEvolucao />
        </Revelar>
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Revelar className="min-w-0">
            <PorArea />
          </Revelar>
          <div className="min-w-0 space-y-6">
            <Revelar>
              <AssuntosDificuldade />
            </Revelar>
            <Revelar>
              <ProximoPasso />
            </Revelar>
          </div>
        </div>
        <Revelar>
          <Historico />
        </Revelar>
      </div>
    </>
  );
}

/* ---------- Evolução, com seletor de modalidade ---------- */

/** Ao trocar a modalidade, o indicador desliza, o novo conteúdo aparece, o "+" conta e a linha
 * se desenha de novo (cada aba monta o seu gráfico). */
function CartaoEvolucao() {
  const [modo, setModo] = useState<ModoEvolucao>("completos");
  return (
    <section className="cartao min-w-0 p-5 md:p-6" aria-labelledby="titulo-evolucao">
      <Tabs value={modo} onValueChange={(v) => setModo(v as ModoEvolucao)}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 id="titulo-evolucao" className="text-[22px] font-bold">
            Sua evolução
          </h2>
          <AbasDeslizantes
            opcoes={opcoesModo}
            ativa={modo}
            aoEscolher={setModo}
            rotulo="Modalidade comparada"
            className="w-full md:w-auto"
          />
        </div>
        {modos.map((modo) => (
          <TabsContent key={modo} value={modo} className="mt-6 motion-reduce:animate-none">
            <ConteudoEvolucao modo={modo} />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

function ConteudoEvolucao({ modo }: { modo: ModoEvolucao }) {
  const m = modosEvolucao[modo];
  const primeiro = m.valores[0];
  const ultimo = m.valores[m.valores.length - 1];
  const inicio = partesData(m.datas[0]).mesExtenso;
  const fim = partesData(m.datas[m.datas.length - 1]).mesExtenso;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-10">
      <div className="lg:pt-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-acerto">
          <TrendingUp className="size-4" aria-hidden />
          Subiu desde {inicio}
        </p>
        <p className="mt-3 font-display text-[56px] font-black leading-none text-laranja lg:text-[72px]">
          <NumeroAnimado valor={ultimo - primeiro} prefixo="+" />
        </p>
        <p className="mt-1 font-display text-2xl font-bold">pontos percentuais</p>
        <p className="mt-4 text-muted-foreground">
          De <strong className="font-semibold tabular-nums text-marrom">{primeiro}%</strong> para{" "}
          <strong className="font-semibold tabular-nums text-marrom">{ultimo}%</strong> de acertos
          em {m.valores.length} {m.descricao}, de {inicio} a {fim}.
        </p>
        <p className="mt-5 flex items-start gap-2 rounded-xl bg-creme px-3 py-2.5 text-sm font-semibold text-marrom">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {m.nota}
        </p>
      </div>
      <div className="min-w-0">
        <Evolucao valores={m.valores} rotulos={m.meses} />
        <AvisoTri />
      </div>
    </div>
  );
}

/* ---------- Por área ---------- */

function PorArea() {
  return (
    <Cartao>
      <h2 className="text-[22px] font-bold">Por área</h2>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">
        No {ultimoCompleto.titulo}, em {partesData(ultimoCompleto.data).mesExtenso}.
      </p>
      {/* escalonar-filhos: as barras das áreas enchem uma depois da outra. */}
      <ul className="escalonar-filhos space-y-6">
        {resultadoAreas.map((a) => {
          const total = a.acertos + a.erros + a.brancos;
          return (
            <li key={a.area}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <AreaChip area={a.area} curto />
                <p className="text-right tabular-nums">
                  <span className="font-semibold">
                    {a.acertos} de {total}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {Math.round((a.acertos / total) * 100)}%
                  </span>
                </p>
              </div>
              <BarraResultado {...a} />
              <p className="mt-2 text-sm text-muted-foreground">
                {a.acertos} acertos · {a.erros} erros · {a.brancos} em branco
              </p>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 border-t border-linha pt-6">
        <div className="mb-4 flex flex-wrap gap-2">
          <AreaChip area="linguagens" curto />
          <AreaChip area="humanas" curto />
        </div>
        <EstadoVazio
          icon={CalendarDays}
          titulo={"Você ainda não fez um Dia\u00a01"}
          texto={"O 5º Simulado da Rede · Dia\u00a01 é sábado, 31 de outubro."}
          acao={
            <Button asChild variant="outline">
              <Link to="/app/simulados/$id" params={{ id: "rede-5-dia-1" }}>
                Ver instruções
              </Link>
            </Button>
          }
        />
      </div>
    </Cartao>
  );
}

/* ---------- Assuntos com mais dificuldade ---------- */

function AssuntosDificuldade() {
  return (
    <Cartao>
      <h2 className="text-[22px] font-bold">Assuntos com mais dificuldade</h2>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">
        Do menor para o maior % de acertos, no último simulado completo.
      </p>
      <ol className="escalonar-filhos divide-y divide-linha">
        {assuntosDificuldade.map((d) => (
          <li key={d.assunto} className="py-4 first:pt-0 last:pb-0">
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="min-w-0 font-semibold leading-snug">{d.assunto}</p>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="-mr-3 shrink-0 text-laranja-acao"
              >
                <Link to="/app/simulados/$id" params={{ id: "recuperacao" }}>
                  Treinar
                  <span className="sr-only"> {d.assunto}</span>
                  <ArrowRight />
                </Link>
              </Button>
            </div>
            {/* Barra na cor de ação, não na da área: cores das áreas ficam só nos chips. */}
            <BarraProgresso
              valor={d.acertos}
              total={d.total}
              rotulo={`${nomeArea[d.area]} · ${d.acertos} de ${d.total} questões`}
              cor="bg-laranja-acao"
            />
          </li>
        ))}
      </ol>
    </Cartao>
  );
}

/** O único bloco de cor sólida da tela. */
function ProximoPasso() {
  return (
    <section className="rounded-2xl bg-amarelo p-5 text-vinho md:p-6">
      <p className="text-sm font-bold uppercase tracking-[0.14em]">Seu próximo passo</p>
      <h2 className="mt-2 text-[22px] font-bold">Treino de 15 questões: Porcentagem e gráficos</h2>
      <p className="mt-2 text-marrom">
        30 minutos, montado a partir dos assuntos em que você mais errou.
      </p>
      <Button asChild className="mt-4 w-full sm:w-auto">
        <Link to="/app/simulados/$id" params={{ id: "recuperacao" }}>
          Começar treino
          <ArrowRight />
        </Link>
      </Button>
    </section>
  );
}

/* ---------- Histórico ---------- */

function DataBloco({ data }: { data: string }) {
  const { dia, mes } = partesData(data);
  return (
    <span
      aria-hidden
      className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl border border-linha bg-creme leading-none"
    >
      <span className="font-display text-xl font-black tabular-nums">{dia}</span>
      <span className="mt-1 text-xs font-semibold uppercase text-muted-foreground">{mes}</span>
    </span>
  );
}

function TituloGrupo({ children }: { children: string }) {
  return (
    <h3 className="mb-2 font-sans text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h3>
  );
}

/** Miolo de uma linha do histórico: título, tendência e números. */
function LinhaHistorico({
  titulo,
  data,
  percentual,
  acertos,
  total,
  variacao,
  primeiro,
}: {
  titulo: string;
  data: string;
  percentual: number;
  acertos: number;
  total: number;
  variacao?: number;
  primeiro: string;
}) {
  const { dia, mesExtenso } = partesData(data);
  return (
    <>
      <DataBloco data={data} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug">{titulo}</span>
        <span className="sr-only">
          , em {Number(dia)} de {mesExtenso}.{" "}
        </span>
        <span className="mt-1 block">
          {variacao === undefined ? (
            <span className="text-sm text-muted-foreground">{primeiro}</span>
          ) : (
            <Tendencia valor={variacao} />
          )}
        </span>
      </span>
      <span className="shrink-0 text-right tabular-nums">
        <span className="block font-display text-xl font-black">{percentual}%</span>
        <span className="block text-sm text-muted-foreground">
          {acertos} de {total}
        </span>
      </span>
    </>
  );
}

function Historico() {
  const completos = [...historico].reverse();
  const rapidosRecentes = [...historicoRapidos].reverse();
  return (
    <Cartao titulo="Histórico">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="min-w-0">
          <TituloGrupo>Completos · Dia 2</TituloGrupo>
          <ul className="divide-y divide-linha">
            {completos.map((h, i) => {
              const anterior = completos[i + 1];
              return (
                <li key={h.id}>
                  <Link
                    to="/app/resultado/$id"
                    params={{ id: h.id }}
                    className="-mx-2 flex min-h-[4.5rem] items-center gap-3 rounded-xl px-2 py-3 hover:bg-creme/60"
                  >
                    <LinhaHistorico
                      {...h}
                      titulo={h.titulo.replace(" · Dia 2", "")}
                      variacao={anterior ? h.percentual - anterior.percentual : undefined}
                      primeiro="1º completo"
                    />
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="min-w-0">
          <TituloGrupo>Rápidos</TituloGrupo>
          <ul className="divide-y divide-linha">
            {rapidosRecentes.map((r, i) => {
              const anterior = rapidosRecentes[i + 1];
              return (
                <li key={r.id} className="flex min-h-[4.5rem] items-center gap-3 py-3">
                  <LinhaHistorico
                    {...r}
                    variacao={anterior ? r.percentual - anterior.percentual : undefined}
                    primeiro="1º rápido"
                  />
                  {/* Mesmo recuo da seta dos completos, para os números alinharem. */}
                  <span className="w-5 shrink-0" aria-hidden />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <p className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Cada simulado é comparado com o anterior da mesma modalidade.
      </p>
    </Cartao>
  );
}
