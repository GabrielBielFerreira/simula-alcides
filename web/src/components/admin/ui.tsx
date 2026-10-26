/**
 * Peças reutilizáveis da área da coordenação.
 * Use junto com Cartao, AvisoTri, Tendencia e Evolucao de `@/components/app/shared`
 * e com AreaChip, EstadoVazio e Selo de `@/components/ds`.
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, FlaskConical, HeartHandshake, MapPin, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EstadoVazio, NumeroAnimado, Preenchimento, areaVisual } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { AvisoTri } from "@/components/app/shared";
import { useSessao } from "@/lib/sessao";
import { POLO_APELIDO } from "@/lib/dados";
import { POLO_DA_COORDENACAO, buscarPolo, type StatusAluno } from "@/data/coordenacao";
import type { AreaId } from "@/data/types";

/* ---------- Papel da coordenação ---------- */

/**
 * Papel atual dentro de /admin. "polo" = Coordenação do Compaz Paulo Freire, que só vê o
 * próprio polo (sem Visão geral da Rede, sem comparar polos, sem externos).
 * `pronto` fica false até o papel ser lido do sessionStorage (no servidor e no 1º render).
 */
export function usePapelCoordenacao() {
  const { perfil, pronto } = useSessao();
  const ehPolo = perfil?.papel === "coord_polo";
  const meuPolo = (perfil?.polo_id && POLO_APELIDO[perfil.polo_id]) || POLO_DA_COORDENACAO;
  return {
    papel: ehPolo ? ("polo" as const) : ("central" as const),
    ehPolo,
    pronto,
    /** Polo acompanhado pelo papel de polo; null na coordenação central. */
    poloId: ehPolo ? meuPolo : null,
    /** Polo que abre no "Por Compaz". */
    poloInicial: meuPolo,
    podeVerPolo: (poloId: string) => !ehPolo || poloId === meuPolo,
  };
}

/** Estado vazio para quando a coordenação do polo tenta abrir dados de outro polo. */
export function SemAcessoPolo() {
  const { poloInicial } = usePapelCoordenacao();
  const polo = buscarPolo(poloInicial);
  return (
    <EstadoVazio
      icon={MapPin}
      titulo={`Você acompanha o ${polo?.nome ?? "Compaz Paulo Freire"}`}
      texto="Com o papel de coordenação do polo, você vê os estudantes, simulados e redações do seu Compaz."
      acao={
        <Button asChild>
          <Link to="/admin/polos/$poloId" params={{ poloId: poloInicial }}>
            Ir para o {polo?.nomeCurto ?? "Paulo Freire"}
          </Link>
        </Button>
      }
    />
  );
}

/* ---------- Selo "Dados de demonstração" ---------- */

export function SeloDemonstracao({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-mostarda px-3 py-1 text-sm font-bold text-marrom",
        className,
      )}
    >
      <FlaskConical className="size-4" aria-hidden />
      Dados de demonstração
    </span>
  );
}

/* ---------- Cabeçalho de página ---------- */

/** Cabeçalho das telas da coordenação: sobretítulo, título Plus Jakarta Sans 800 e ações à direita. */
export function CabecalhoAdmin({
  sobretitulo,
  titulo,
  subtitulo,
  acoes,
  className,
}: {
  sobretitulo?: string;
  /** Texto do título (ou um <span> com ele, para animar só o texto). */
  titulo: ReactNode;
  /** Linha abaixo do título (texto ou, por exemplo, bairro com MapPin). */
  subtitulo?: ReactNode;
  /** Botões, pílulas ou select alinhados à direita no desktop (abaixo do título no celular). */
  acoes?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {sobretitulo && (
          <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-laranja-acao">
            <span className="h-1 w-6 rounded-full bg-laranja" aria-hidden />
            {sobretitulo}
          </p>
        )}
        <h1 className="titulo-pagina text-marrom">{titulo}</h1>
        {subtitulo && <div className="mt-2 text-[17px] text-muted-foreground">{subtitulo}</div>}
      </div>
      {acoes && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
          {acoes}
        </div>
      )}
    </header>
  );
}

/* ---------- StatCard ---------- */

/** Número (ou texto "52%") que conta; outros textos ("36 de 42") ficam como estão. */
function ValorIndicador({ valor }: { valor: number | string }) {
  if (typeof valor === "number") return <NumeroAnimado valor={valor} />;
  const percentual = /^(\d+)%$/.exec(valor);
  if (percentual) return <NumeroAnimado valor={Number(percentual[1])} sufixo="%" />;
  return valor;
}

/** Cartão de indicador: rótulo, número grande, detalhe e, se for % de acertos, o aviso TRI. */
export function StatCard({
  rotulo,
  valor,
  sufixo,
  detalhe,
  avisoTri = false,
  icone: Icone,
  children,
  className,
}: {
  rotulo: string;
  /** Número (formatado em pt-BR automaticamente) ou texto pronto, como "36 de 42" ou "52%". */
  valor: number | string;
  /** Texto menor ao lado do número, como "de 240". */
  sufixo?: string;
  detalhe?: ReactNode;
  avisoTri?: boolean;
  icone?: LucideIcon;
  /** Conteúdo extra abaixo do detalhe (por exemplo, uma barra com rótulos). */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("cartao flex min-w-0 flex-col p-5 md:p-6", className)}>
      <h2 className="flex items-center gap-2 font-sans text-sm font-semibold leading-snug text-muted-foreground">
        {Icone && <Icone className="size-4 shrink-0 text-laranja" aria-hidden />}
        {rotulo}
      </h2>
      <p className="mt-2 font-display text-[32px] font-black leading-none tabular-nums text-marrom lg:text-[40px]">
        <ValorIndicador valor={valor} />
        {sufixo && (
          <span className="ml-1.5 font-sans text-base font-semibold text-muted-foreground">
            {sufixo}
          </span>
        )}
      </p>
      {detalhe && <p className="mt-2 text-sm text-muted-foreground">{detalhe}</p>}
      {children && <div className="mt-4">{children}</div>}
      {avisoTri && <AvisoTri />}
    </section>
  );
}

/* ---------- Barra horizontal ---------- */

/**
 * Barra HTML com rótulo e valor sempre escritos (a barra em si é decorativa).
 * Cor: `area` usa a cor da área (Humanas ganha contorno marrom/40); `neutra` usa marrom/20
 * (comparação entre polos); senão `cor` (padrão laranja-ação, a cor do polo).
 */
export function BarraHorizontal({
  rotulo,
  valor,
  total = 100,
  valorTexto,
  area,
  neutra = false,
  cor = "bg-laranja-acao",
  emLinha = false,
  className,
}: {
  rotulo: ReactNode;
  valor: number;
  total?: number;
  /** Texto do valor; padrão é o percentual ("56%"). Ex.: "33 de 42". */
  valorTexto?: string;
  area?: AreaId;
  neutra?: boolean;
  /** Classe de fundo do preenchimento, como "bg-vinho". */
  cor?: string;
  /** true: rótulo, barra e valor numa linha só (listas compactas). */
  emLinha?: boolean;
  className?: string;
}) {
  const percentual = total ? Math.min(100, Math.max(0, (valor / total) * 100)) : 0;
  const texto = valorTexto ?? <NumeroAnimado valor={Math.round(percentual)} sufixo="%" />;
  const preenchimento = area ? areaVisual[area].bg : neutra ? "bg-marrom/20" : cor;
  const barra = (
    <div
      className="h-3 min-w-0 overflow-hidden rounded-full bg-creme ring-1 ring-linha"
      aria-hidden
    >
      <Preenchimento
        fracao={percentual / 100}
        className={cn(
          "rounded-full",
          preenchimento,
          (area === "humanas" || neutra) && "ring-1 ring-inset ring-marrom/40",
        )}
      />
    </div>
  );
  if (emLinha)
    return (
      <div
        className={cn(
          "grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm",
          className,
        )}
      >
        <span className="min-w-0 truncate font-semibold text-marrom">{rotulo}</span>
        {barra}
        <span className="text-right font-semibold tabular-nums text-marrom">{texto}</span>
      </div>
    );
  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 font-semibold text-marrom">{rotulo}</span>
        <span className="shrink-0 font-semibold tabular-nums text-marrom">{texto}</span>
      </div>
      {barra}
    </div>
  );
}

/* ---------- Pílula de status do estudante ---------- */

const estilosStatus: Record<StatusAluno, { icone?: LucideIcon; classe: string }> = {
  Ativo: { classe: "text-marrom" },
  "Sem acessar há 14+ dias": { icone: Clock, classe: "bg-mostarda/25 text-marrom" },
  "Precisa de atenção": { icone: HeartHandshake, classe: "bg-rosa/10 text-rosa" },
};

/** Status sempre com texto: Ativo (ponto verde), Sem acessar (Clock), Precisa de atenção (HeartHandshake). */
export function PilulaStatus({ status, className }: { status: StatusAluno; className?: string }) {
  const { icone: Icone, classe } = estilosStatus[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold",
        classe,
        className,
      )}
    >
      {Icone ? (
        <Icone className="size-4 shrink-0" aria-hidden />
      ) : (
        <span className="size-2.5 shrink-0 rounded-full bg-acerto" aria-hidden />
      )}
      {status}
    </span>
  );
}

/* ---------- Avatar com iniciais ---------- */

const tamanhosAvatar = {
  sm: "size-9 text-sm",
  md: "size-11 text-base",
  lg: "size-16 font-display text-2xl font-black",
};

/** Círculo com iniciais. Decorativo: mostre sempre o nome ao lado. */
export function Avatar({
  iniciais,
  tamanho = "md",
  sobreEscuro = false,
  className,
}: {
  iniciais: string;
  tamanho?: keyof typeof tamanhosAvatar;
  /** Para a sidebar vinho: fundo amarelo e letras vinho. */
  sobreEscuro?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold",
        sobreEscuro ? "bg-amarelo text-vinho" : "bg-creme text-marrom ring-1 ring-linha",
        tamanhosAvatar[tamanho],
        className,
      )}
    >
      {iniciais}
    </span>
  );
}
