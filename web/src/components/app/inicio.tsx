import type { CSSProperties, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Footprints,
  Layers,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  catalogo,
  conquistas,
  estudanteLogada,
  historico,
  metas,
  quandoAcontece,
} from "@/data/prototipo";
import { partesData } from "@/data/estudante";
import { polos } from "@/data/mock";
import { AGORA_DEMO } from "@/data/tempo";
import { Button } from "@/components/ui/button";
import { BarraProgresso, NumeroAnimado, Revelar, useRevelar } from "@/components/ds";
import { Titulo, Cartao, AvisoTri, Contagens } from "./shared";

const iconeConquista: Record<string, LucideIcon> = {
  primeiro: Footprints,
  completos: Layers,
  semanas: CalendarCheck,
};

export function Inicio() {
  const primeiroNome = estudanteLogada.nome.split(" ")[0];
  const polo = polos.find((p) => p.id === estudanteLogada.poloId);
  const proximo = catalogo.find((s) => s.oficial) ?? catalogo[0];
  const emAndamento = catalogo.find((s) => s.andamento);
  const sugestao = catalogo.find((s) => s.modalidade === "Recuperação");
  const primeiro = historico[0];
  const ultimo = historico[historico.length - 1];
  const diferenca = proximo.abertura
    ? new Date(proximo.abertura).getTime() - AGORA_DEMO.getTime()
    : 0;
  const contagem = [
    { n: Math.floor(diferenca / 86400000), t: "dias" },
    { n: Math.floor(diferenca / 3600000) % 24, t: "horas" },
    { n: Math.floor(diferenca / 60000) % 60, t: "minutos" },
  ];
  // Saudação e cartões em cascata, na ordem de leitura (--i × 50ms). No celular a coluna da
  // direita vem depois e entra ao rolar, sem atraso; no desktop ela entra junto, intercalada.
  return (
    <>
      <Revelar>
        <Titulo
          titulo={`Boa noite, ${primeiroNome}.`}
          subtitulo="Cada questão de hoje é um passo a mais."
        />
      </Revelar>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Revelar
            como="section"
            className="casario-claro rounded-2xl bg-vinho p-5 text-creme [--i:1] md:p-6"
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="size-5 text-amarelo" aria-hidden />
              Próximo simulado oficial do seu polo
            </p>
            <h2 className="mt-4 text-[26px] font-black text-offwhite">{proximo.titulo}</h2>
            <p className="mt-3">
              {quandoAcontece(proximo)}
              {polo && ` · ${polo.nome}`}
            </p>
            <div className="my-5 flex gap-3">
              {contagem.map((x) => (
                <div key={x.t} className="w-16 text-center">
                  <p className="font-display text-[32px] font-black tabular-nums text-amarelo">
                    {x.n.toString().padStart(2, "0")}
                  </p>
                  <p className="text-xs">{x.t}</p>
                </div>
              ))}
            </div>
            <Button asChild variant="secondary" className="w-full">
              <Link to="/app/simulados/$id" params={{ id: proximo.id }}>
                Ver instruções
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </Revelar>
          {emAndamento?.andamento && (
            <Revelar className="[--i:2]">
              <Cartao titulo="Continuar de onde parou">
                <p className="font-semibold">{emAndamento.titulo}</p>
                <p className="mb-3 text-sm text-muted-foreground">Salvo no aparelho há 2 dias</p>
                <BarraProgresso
                  valor={emAndamento.andamento}
                  total={emAndamento.questoes}
                  rotulo={`${emAndamento.andamento} de ${emAndamento.questoes} questões`}
                />
                <Button asChild className="mt-4 w-full">
                  <Link to="/prova/$id" params={{ id: emAndamento.id }}>
                    Continuar
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </Cartao>
            </Revelar>
          )}
          <Revelar className="[--i:3]">
            <Cartao titulo="Seu último resultado">
              <p className="text-muted-foreground">{ultimo.titulo}</p>
              <p className="mt-3 font-display text-4xl font-black text-laranja tabular-nums">
                {ultimo.acertos} de {ultimo.total}
              </p>
              <p className="mt-2 text-xl font-semibold">
                <NumeroAnimado valor={ultimo.percentual} sufixo="%" /> de acertos
              </p>
              <AvisoTri />
              <div className="my-5">
                <Contagens acertos={ultimo.acertos} erros={ultimo.erros} brancos={ultimo.brancos} />
              </div>
              <Trajetoria>
                <MiniEvolucao />
                {/* Entra depois que a linha chega aos 67%. */}
                <p
                  className="depois-do-traco mt-4 flex items-start gap-1.5 font-semibold text-acerto"
                  style={{ "--depois": "320ms" } as CSSProperties}
                >
                  <TrendingUp className="mt-0.5 size-5 shrink-0" aria-hidden />+
                  {ultimo.percentual - primeiro.percentual} pontos percentuais desde{" "}
                  {partesData(primeiro.data).mesExtenso}
                </p>
              </Trajetoria>
              <p className="text-sm text-muted-foreground">Simulados completos · Dia 2</p>
              <Button asChild variant="link" className="mt-3 px-0">
                <Link to="/app/resultado/$id" params={{ id: ultimo.id }}>
                  Ver resultado
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </Cartao>
          </Revelar>
        </div>
        <div className="min-w-0 space-y-6">
          {sugestao && (
            <Revelar className="lg:[--i:2]">
              <Cartao titulo="Sugestão para hoje">
                <p className="mb-4">
                  Treino de {sugestao.questoes} questões: {sugestao.titulo}
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/app/simulados/$id" params={{ id: sugestao.id }}>
                    Treinar
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </Cartao>
            </Revelar>
          )}
          <Revelar className="lg:[--i:3]">
            <Cartao titulo="Meta da semana">
              <div className="space-y-5">
                {metas.map((m) => (
                  <div key={m.titulo}>
                    <p className="mb-2 font-semibold">{m.titulo}</p>
                    <BarraProgresso
                      valor={m.valor}
                      total={m.total}
                      rotulo={`${m.valor} de ${m.total}`}
                    />
                  </div>
                ))}
              </div>
            </Cartao>
          </Revelar>
          <Revelar className="lg:[--i:4]">
            <Cartao titulo="Suas conquistas">
              {/* Pop sóbrio (96% → 100%), um a um, logo depois do cartão. */}
              <Revelar como="ul" escalonar efeito="surgir" atraso={200} className="space-y-3">
                {conquistas.feitas.map((c) => {
                  const Icone = iconeConquista[c.id];
                  return (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 rounded-xl border-2 border-rosa bg-rosa/8 p-3 text-rosa"
                    >
                      <Icone className="size-6 shrink-0" aria-hidden />
                      <p className="leading-snug">
                        <span className="mr-1.5 font-display text-2xl font-black tabular-nums">
                          {c.numero}
                        </span>
                        <span className="font-semibold">{c.rotulo}</span>
                      </p>
                    </li>
                  );
                })}
                <li className="flex items-center gap-3 rounded-xl border-2 border-dashed border-borda-controle p-3 text-muted-foreground">
                  <Layers className="size-6 shrink-0" aria-hidden />
                  <p className="leading-snug">
                    <span className="mr-1.5 font-display text-2xl font-black tabular-nums">
                      {conquistas.proxima.numero}
                    </span>
                    <span className="font-semibold">{conquistas.proxima.rotulo}</span>
                    <span className="block text-sm">Falta {conquistas.proxima.falta}</span>
                  </p>
                </li>
              </Revelar>
            </Cartao>
          </Revelar>
        </div>
      </div>
    </>
  );
}

/** Bloco que se desenha ao aparecer: a linha do minigráfico e o que entra depois dela. */
function Trajetoria({ children }: { children: ReactNode }) {
  const ref = useRevelar<HTMLDivElement>();
  return (
    <div ref={ref} className="desenho-svg">
      {children}
    </div>
  );
}

/**
 * Instante (ms) em que a linha, com a curva de saída em 360ms, chega a cada ponto: ela corre
 * no começo e desacelera no fim, então os pontos do meio aparecem cedo e o último por volta de 200ms.
 */
const chegadaDoTraco = [0, 30, 70, 200];

/** Minigráfico dos completos (Dia 2): os pontos sem eixo, na escala de 0 a 100%. */
function MiniEvolucao() {
  const largura = 160;
  const altura = 56;
  const margem = 6;
  const pontos = historico.map((h, i) => ({
    x: margem + (i * (largura - 2 * margem)) / (historico.length - 1),
    y: altura - margem - (h.percentual / 100) * (altura - 2 * margem),
  }));
  const primeiro = historico[0];
  const ultimo = historico[historico.length - 1];
  const descricao = `Evolução nos simulados completos: ${historico
    .map((h) => `${h.percentual}% em ${partesData(h.data).mesExtenso}`)
    .join(", ")}.`;
  return (
    <div className="flex items-center gap-3">
      <p className="w-12 shrink-0 text-right leading-tight" aria-hidden>
        <span className="block font-display text-xl font-black tabular-nums">
          {primeiro.percentual}%
        </span>
        <span className="text-sm text-muted-foreground">{primeiro.mes}</span>
      </p>
      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        className="h-14 w-40 shrink-0"
        role="img"
        aria-label={descricao}
      >
        <line
          x1={0}
          x2={largura}
          y1={altura - margem}
          y2={altura - margem}
          stroke="var(--linha)"
          strokeWidth={1}
        />
        <path
          d={`M${pontos.map((p) => `${p.x},${p.y}`).join("L")}`}
          pathLength={1}
          className="traco"
          fill="none"
          stroke="var(--laranja-acao)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pontos.map((p, i) => {
          const final = i === pontos.length - 1;
          return (
            <circle
              key={historico[i].id}
              className="ponto-pop"
              style={{ "--depois": `${chegadaDoTraco[i] ?? 200}ms` } as CSSProperties}
              cx={p.x}
              cy={p.y}
              r={final ? 5 : 4}
              fill={final ? "var(--laranja-acao)" : "var(--card)"}
              stroke="var(--laranja-acao)"
              strokeWidth={2}
            />
          );
        })}
      </svg>
      <p
        className="depois-do-traco w-12 shrink-0 leading-tight"
        style={{ "--depois": "200ms" } as CSSProperties}
        aria-hidden
      >
        <span className="block font-display text-xl font-black tabular-nums text-laranja">
          {ultimo.percentual}%
        </span>
        <span className="text-sm text-muted-foreground">{ultimo.mes}</span>
      </p>
    </div>
  );
}
