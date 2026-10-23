import type { CSSProperties } from "react";
import { Preenchimento } from "@/components/ds/movimento";
import { cn } from "@/lib/utils";

/**
 * Barra de uma competência da redação, de 0 a 200 pontos, em 5 níveis de 40.
 * Decorativa: mostre sempre o valor escrito ao lado ("160 de 200").
 * Ao aparecer, os níveis enchem da esquerda para a direita (60ms entre eles), somando-se ao
 * escalonamento da lista em que a barra estiver. Fica num arquivo próprio, com poucas
 * dependências, para a página inicial usar também.
 */
export function BarraCompetencia({ valor, className }: { valor: number; className?: string }) {
  return (
    <div className={cn("flex gap-1", className)} aria-hidden>
      {[1, 2, 3, 4, 5].map((nivel) => (
        <div
          key={nivel}
          className="h-3 flex-1 overflow-hidden rounded-full bg-creme ring-1 ring-inset ring-linha"
        >
          <Preenchimento
            fracao={(valor - (nivel - 1) * 40) / 40}
            className="rounded-full bg-rosa"
            style={{ "--atraso": `${(nivel - 1) * 60}ms` } as CSSProperties}
          />
        </div>
      ))}
    </div>
  );
}
