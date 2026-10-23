import { useEffect, useRef, type CSSProperties } from "react";
import { Clock, Flag, ChevronLeft, ChevronRight, Wifi } from "lucide-react";
import { AreaChip, movimentoReduzidoAgora, quandoEntrarNaTela } from "@/components/ds";
import { cn } from "@/lib/utils";
import type { AreaId } from "@/data/types";

export interface PhoneMockProps {
  numero: number;
  total: number;
  area: AreaId;
  enunciado: string;
  alternativas: string[];
  marcada: number;
  className?: string;
}

const LETRAS = "ABCDE";

/**
 * Celular ilustrativo mostrando a tela de prova, com uma demonstração curta que toca uma vez:
 * a alternativa marcada recebe o toque e o estado "selecionado" do produto, a barra de
 * progresso avança e a resposta aparece salva no aparelho.
 * A demonstração é só CSS (classes `demo-*` em src/styles.css), então toca também sem JS.
 * Se a alternativa estiver abaixo da tela ao carregar, ela espera e toca quando aparece.
 * Com movimento reduzido, o celular já aparece no estado final.
 */
export function PhoneMock({
  numero,
  total,
  area,
  enunciado,
  alternativas,
  marcada,
  className,
}: PhoneMockProps) {
  const celular = useRef<HTMLDivElement>(null);
  const alternativaMarcada = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const el = celular.current;
    const alvo = alternativaMarcada.current;
    if (!el || !alvo || movimentoReduzidoAgora()) return;
    // À vista: a demonstração do CSS já está tocando desde o primeiro desenho.
    if (alvo.getBoundingClientRect().bottom <= window.innerHeight) return;
    el.setAttribute("data-demo", "espera");
    return quandoEntrarNaTela(alvo, () => el.setAttribute("data-demo", "tocando"));
  }, []);

  const progresso = {
    "--antes": Math.max(0, numero - 1) / total,
    "--depois": numero / total,
  } as CSSProperties;

  return (
    <div
      ref={celular}
      className={cn(
        "demo-prova relative mx-auto w-[280px] rounded-[2.5rem] border-[3px] border-marrom bg-grafite p-2.5 shadow-[0_30px_60px_-20px_rgb(69_34_10/0.55)]",
        className,
      )}
      aria-hidden
    >
      <div className="overflow-hidden rounded-[2rem] bg-offwhite">
        <div className="flex items-center justify-between px-5 pt-3 text-[11px] font-semibold text-marrom">
          <span>14:32</span>
          <span className="h-4 w-16 rounded-full bg-grafite" />
          <Wifi className="size-3.5" />
        </div>
        <div className="flex items-center justify-between border-b border-linha px-4 py-2.5">
          <span className="text-xs font-bold text-marrom">
            Questão {numero}
            <span className="font-normal text-muted-foreground">/{total}</span>
          </span>
          <span className="flex items-center gap-1 rounded-full bg-creme px-2 py-0.5 text-xs font-bold text-marrom">
            <Clock className="size-3.5 text-laranja" />
            2:41:08
          </span>
        </div>
        <div className="h-1 overflow-hidden bg-creme">
          <div className="demo-encher h-full">
            <div className="demo-avanco h-full bg-laranja" style={progresso} />
          </div>
        </div>
        <div className="space-y-3 px-4 py-4">
          <AreaChip area={area} className="scale-90 origin-left" />
          <p className="text-[13px] leading-relaxed text-marrom">{enunciado}</p>
          <ul className="space-y-2">
            {alternativas.map((alt, i) => {
              const ehMarcada = i === marcada;
              return (
                <li
                  key={alt}
                  ref={ehMarcada ? alternativaMarcada : undefined}
                  className={cn(
                    "relative isolate flex items-center gap-2.5 rounded-xl border-2 border-linha bg-card px-3 py-2 text-[13px] text-marrom",
                    ehMarcada && "demo-toque",
                  )}
                >
                  {/* O estado "selecionado" chega por cima (só opacidade), sem animar cores. */}
                  {ehMarcada && (
                    <span className="demo-selecao selecionado absolute -inset-[2px] -z-10 rounded-xl" />
                  )}
                  <span className="relative grid size-6 shrink-0 place-items-center rounded-full bg-creme text-[11px] font-bold text-marrom">
                    {LETRAS[i]}
                    {ehMarcada && (
                      <span className="demo-letra absolute inset-0 grid place-items-center rounded-full bg-laranja-acao text-primary-foreground">
                        {LETRAS[i]}
                      </span>
                    )}
                  </span>
                  {alt}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-linha bg-card px-3 py-3">
          <span className="grid size-9 place-items-center rounded-lg border-2 border-marrom text-marrom">
            <ChevronLeft className="size-4" />
          </span>
          <span className="flex items-center gap-1 rounded-lg bg-mostarda/30 px-2.5 py-2 text-[11px] font-bold text-marrom">
            <Flag className="size-3.5" />
            Revisar
          </span>
          <span className="flex items-center gap-1 rounded-lg bg-laranja-acao px-3 py-2 text-[11px] font-bold text-primary-foreground">
            Próxima
            <ChevronRight className="size-3.5" />
          </span>
        </div>
        <p className="flex items-center justify-center gap-1 bg-acerto/10 py-1.5 text-[10px] font-semibold text-acerto">
          <svg
            viewBox="0 0 16 16"
            className="demo-salvo size-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path pathLength={1} className="traco" d="M3 8.5 6.5 12 13 4.5" />
          </svg>
          Respostas salvas no aparelho
        </p>
      </div>
    </div>
  );
}
