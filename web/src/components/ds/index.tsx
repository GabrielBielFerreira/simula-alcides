import { useState, type ReactNode } from "react";
import {
  BookOpen,
  Calculator,
  FlaskConical,
  Landmark,
  Check,
  X,
  Minus,
  Flag,
  Eye,
  EyeOff,
  Loader2,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AreaId, StatusQuestao } from "@/data/types";
import { areas } from "@/data/mock";
import { NumeroAnimado, Preenchimento } from "./movimento";

export * from "./movimento";

/* ---------- Áreas do ENEM ---------- */
export const areaVisual: Record<
  AreaId,
  { icon: LucideIcon; bg: string; text: string; border: string; soft: string }
> = {
  linguagens: {
    icon: BookOpen,
    bg: "bg-area-linguagens",
    text: "text-offwhite",
    border: "border-area-linguagens",
    soft: "bg-area-linguagens/10",
  },
  humanas: {
    icon: Landmark,
    bg: "bg-area-humanas",
    text: "text-grafite",
    border: "border-area-humanas",
    soft: "bg-area-humanas/15",
  },
  natureza: {
    icon: FlaskConical,
    bg: "bg-area-natureza",
    text: "text-offwhite",
    border: "border-area-natureza",
    soft: "bg-area-natureza/10",
  },
  matematica: {
    icon: Calculator,
    bg: "bg-area-matematica",
    text: "text-grafite",
    border: "border-area-matematica",
    soft: "bg-area-matematica/10",
  },
};

export function AreaChip({
  area,
  curto,
  className,
}: {
  area: AreaId;
  curto?: boolean;
  className?: string;
}) {
  const v = areaVisual[area];
  const a = areas.find((x) => x.id === area);
  const Icon = v.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border-2 bg-card py-1 pl-1 pr-3 text-sm font-semibold text-marrom",
        v.border,
        className,
      )}
    >
      <span className={cn("grid size-7 place-items-center rounded-full", v.bg, v.text)}>
        <Icon className="size-4" aria-hidden />
      </span>
      {curto ? a?.nomeCurto : a?.nome}
    </span>
  );
}

/* ---------- Status ---------- */
const statusMap: Record<StatusQuestao, { label: string; icon: LucideIcon; cls: string }> = {
  acerto: { label: "Acerto", icon: Check, cls: "bg-acerto/10 text-acerto border-acerto/40" },
  erro: { label: "Erro", icon: X, cls: "bg-erro/10 text-erro border-erro/40" },
  branco: {
    label: "Em branco",
    icon: Minus,
    cls: "bg-branco-q/10 text-branco-q-texto border-branco-q/40",
  },
  revisao: {
    label: "Marcada para revisão",
    icon: Flag,
    cls: "bg-mostarda/25 text-marrom border-mostarda",
  },
};

export function StatusBadge({ status }: { status: StatusQuestao }) {
  const s = statusMap[status];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold",
        s.cls,
      )}
    >
      <Icon className="size-4" aria-hidden /> {s.label}
    </span>
  );
}

export function Selo({
  children,
  tom = "mostarda",
}: {
  children: ReactNode;
  tom?: "mostarda" | "rosa" | "creme";
}) {
  const cls = {
    mostarda: "bg-mostarda text-marrom",
    rosa: "bg-rosa text-offwhite",
    creme: "bg-creme text-vinho border border-linha",
  }[tom];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold",
        cls,
      )}
    >
      {children}
    </span>
  );
}

/* ---------- Progresso ---------- */
export function BarraProgresso({
  valor,
  total = 100,
  rotulo,
  cor = "bg-laranja",
  contar = true,
}: {
  valor: number;
  total?: number;
  rotulo?: string;
  cor?: string;
  /** false: o % já aparece no valor final e só a barra anima (quando há vários juntos). */
  contar?: boolean;
}) {
  const pct = Math.round((valor / total) * 100);
  return (
    <div>
      {rotulo && (
        <div className="mb-1.5 flex justify-between text-sm text-muted-foreground">
          <span>{rotulo}</span>
          {contar ? (
            <NumeroAnimado valor={pct} sufixo="%" className="font-semibold text-marrom" />
          ) : (
            <span className="font-semibold text-marrom tabular-nums">{pct}%</span>
          )}
        </div>
      )}
      <div
        className="h-3 overflow-hidden rounded-full bg-creme ring-1 ring-linha"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={rotulo}
      >
        <Preenchimento fracao={pct / 100} className={cn("rounded-full", cor)} />
      </div>
    </div>
  );
}

/* ---------- Campo de formulário ---------- */
export function Campo({
  id,
  rotulo,
  tipo = "text",
  erro,
  dica,
  placeholder,
  value,
  onChange,
  onBlur,
  required,
  autoComplete,
  inputMode,
  maxLength,
  children,
}: {
  id: string;
  rotulo: string;
  tipo?: string;
  erro?: string;
  dica?: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  onBlur?: () => void;
  required?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "email" | "tel";
  maxLength?: number;
  children?: ReactNode;
}) {
  const [visivel, setVisivel] = useState(false);
  const desc = erro ? `${id}-erro` : dica ? `${id}-dica` : undefined;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="font-semibold text-marrom">
          {rotulo}
        </label>
        {children}
      </div>
      <div className="relative">
        <input
          id={id}
          type={tipo === "password" && visivel ? "text" : tipo}
          onBlur={onBlur}
          required={required}
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          onChange={(e) => onChange?.(e.target.value)}
          aria-invalid={!!erro}
          aria-describedby={desc}
          className={cn(
            "min-h-12 w-full rounded-xl border-2 bg-card px-4 pr-14 text-[17px] text-marrom placeholder:text-muted-foreground/70 focus-visible:outline-3 focus-visible:outline-laranja-acao",
            erro ? "border-erro" : "border-borda-controle hover:border-muted-foreground/50",
          )}
        />
        {tipo === "password" && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1"
            aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setVisivel(!visivel)}
          >
            {visivel ? <EyeOff /> : <Eye />}
          </Button>
        )}
      </div>
      {erro ? (
        <p id={`${id}-erro`} className="flex items-center gap-1.5 text-sm font-medium text-erro">
          <X className="size-4" aria-hidden />
          {erro}
        </p>
      ) : dica ? (
        <p id={`${id}-dica`} className="text-sm text-muted-foreground">
          {dica}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- Estados ---------- */
export function EstadoVazio({
  titulo,
  texto,
  acao,
  icon: Icon = Inbox,
}: {
  titulo: string;
  texto: string;
  acao?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-linha bg-creme/50 px-6 py-10 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-card text-laranja ring-1 ring-linha">
        <Icon className="size-7" aria-hidden />
      </span>
      <h3 className="text-xl font-bold">{titulo}</h3>
      <p className="mt-1 max-w-sm text-muted-foreground">{texto}</p>
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    // Aparece com 150ms de atraso: carregamentos rápidos nem chegam a mostrar o esqueleto.
    <div className="anima-aparecer space-y-4 [--atraso:150ms]" aria-busy="true">
      <p className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-laranja" aria-hidden />
        {texto}
      </p>
      {[0, 1].map((i) => (
        <div key={i} className="cartao space-y-3 p-5">
          <div className="esqueleto h-4 w-1/3 rounded bg-creme" />
          <div className="esqueleto h-3 w-full rounded bg-creme" />
          <div className="esqueleto h-3 w-4/5 rounded bg-creme" />
        </div>
      ))}
    </div>
  );
}

export function TituloSecao({
  sobretitulo,
  titulo,
  texto,
  claro,
}: {
  sobretitulo?: string;
  titulo: string;
  texto?: string;
  claro?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      {sobretitulo && (
        <p
          className={cn(
            "mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em]",
            claro ? "text-amarelo" : "text-laranja-acao",
          )}
        >
          <span
            className={cn("h-1 w-6 rounded-full", claro ? "bg-amarelo" : "bg-laranja")}
            aria-hidden
          />
          {sobretitulo}
        </p>
      )}
      <h2
        className={cn(
          "text-3xl font-black md:text-[2.75rem]",
          claro ? "text-offwhite" : "text-marrom",
        )}
      >
        {titulo}
      </h2>
      {texto && (
        <p className={cn("mt-4 text-lg", claro ? "text-creme" : "text-muted-foreground")}>
          {texto}
        </p>
      )}
    </div>
  );
}

/* Livros empilhados: ilustração plana inspirada no logo */
export function LivrosEmpilhados({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden>
      <g stroke="var(--marrom)" strokeWidth="2.5" strokeLinejoin="round">
        <rect x="14" y="8" width="88" height="22" rx="5" fill="var(--mostarda)" />
        <rect x="6" y="34" width="100" height="24" rx="5" fill="var(--grafite)" />
        <rect x="10" y="62" width="104" height="24" rx="5" fill="var(--laranja)" />
      </g>
      <g stroke="var(--creme)" strokeWidth="2" strokeLinecap="round">
        <path d="M70 16h24M70 22h24M66 42h32M66 48h32M74 70h32M74 76h32" />
      </g>
    </svg>
  );
}
