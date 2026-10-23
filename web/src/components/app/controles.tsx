/**
 * Controles do estudante com o movimento do produto: abas com indicador que desliza, o marcador
 * do "selecionado" único (borda 2px laranja-ação, fundo a 8%, círculo com letra ou Check), a
 * opção marcável e o aviso de erro que guarda o próprio espaço. Usados no app, na prova e nas
 * boas-vindas, para o "selecionado" se comportar igual em todo lugar.
 */
import { useState, type ReactNode, type Ref } from "react";
import { Check, X, type LucideProps } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * Check do "selecionado". Dá um pop curto (140ms) só quando a escolha acabou de acontecer
 * (`recem`): nunca ao montar de novo, ao voltar de passo ou ao rever algo já escolhido.
 */
export function CheckSelecionado({
  recem = false,
  className,
  ...props
}: LucideProps & { recem?: boolean }) {
  return (
    <Check
      aria-hidden
      className={cn("size-4", recem && "anima-pop duracao-micro", className)}
      {...props}
    />
  );
}

/**
 * Círculo do "selecionado": com a letra (ou vazio) quando não marcado; preenchido em
 * laranja-ação com o Check quando marcado. Cor e borda trocam em 140ms nos dois sentidos.
 */
export function MarcadorSelecionado({
  marcado,
  recem = false,
  letra,
  className,
}: {
  marcado: boolean;
  /** A escolha acabou de acontecer: o Check dá o pop. */
  recem?: boolean;
  /** Letra da alternativa (prova); sem ela, o círculo fica vazio até marcar. */
  letra?: string;
  /** Tamanho, como "size-7" ou "size-9". */
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "selecionavel grid shrink-0 place-items-center rounded-full border-2",
        marcado
          ? "border-laranja-acao bg-laranja-acao text-primary-foreground"
          : letra
            ? "border-transparent bg-creme text-foreground"
            : "border-borda-controle bg-card",
        className,
      )}
    >
      {marcado ? <CheckSelecionado recem={recem} strokeWidth={3} /> : letra}
    </span>
  );
}

/**
 * Aviso de erro que guarda o próprio espaço. Quando a pessoa corrige (marca a opção), ele some
 * num fade de 140ms, mas a linha continua lá: nada abaixo (opções, botão) pula na hora do toque.
 * Quem usa tira o aviso de vez ao trocar de tela ou de passo. A cada nova tentativa
 * (`tentativa`), ele surge de novo, para o toque em "Continuar" sempre ter resposta.
 */
export function AvisoErro({
  id,
  visivel,
  tentativa,
  className,
  children,
}: {
  id: string;
  visivel: boolean;
  tentativa: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden={visivel ? undefined : true}
      className={cn("transition-opacity", !visivel && "opacity-0", className)}
    >
      <p
        key={tentativa}
        id={id}
        className="erro-surge flex items-center gap-1.5 text-sm font-medium text-erro"
      >
        <X className="size-4 shrink-0" aria-hidden />
        {children}
      </p>
    </div>
  );
}

/**
 * Abas de mesma largura com um indicador branco que desliza até a ativa (só transform, 220ms).
 * Vai dentro de <Tabs value onValueChange>, que continua cuidando do teclado e do ARIA.
 * No clique ou toque, a aba é escolhida sem `.focus()` por script (o Radix faria isso e o Chrome
 * mostraria o anel de foco de teclado em quem só tocou); pelo teclado, nada muda.
 */
export function AbasDeslizantes<T extends string>({
  opcoes,
  ativa,
  aoEscolher,
  rotulo,
  className,
}: {
  opcoes: readonly { valor: T; rotulo: string }[];
  ativa: T;
  /** O mesmo que o onValueChange do <Tabs>. */
  aoEscolher: (valor: T) => void;
  /** aria-label da lista de abas. */
  rotulo?: string;
  className?: string;
}) {
  const indice = Math.max(
    0,
    opcoes.findIndex((o) => o.valor === ativa),
  );
  return (
    <TabsList
      aria-label={rotulo}
      className={cn("relative grid h-auto auto-cols-fr grid-flow-col", className)}
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-lg bg-card shadow-suave transition-transform duration-220 ease-entra-sai"
        style={{
          width: `calc((100% - 0.5rem) / ${opcoes.length})`,
          transform: `translateX(${indice * 100}%)`,
        }}
      />
      {opcoes.map((o) => (
        <TabsTrigger
          key={o.valor}
          value={o.valor}
          onMouseDown={(e) => {
            if (e.button !== 0 || e.ctrlKey) return;
            e.preventDefault();
            aoEscolher(o.valor);
          }}
          className="relative min-h-11 px-4 transition-colors data-[state=active]:bg-transparent data-[state=active]:shadow-none md:px-5"
        >
          {o.rotulo}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}

/**
 * Caixa de marcar em forma de opção tocável. O input nativo fica invisível, mas é ele que
 * recebe foco, teclado e leitor de tela; o Check dá o pop só no momento em que a pessoa marca.
 */
export function OpcaoMarcavel({
  marcado,
  aoMudar,
  invalido = false,
  descricao,
  refInput,
  className,
  children,
}: {
  marcado: boolean;
  aoMudar: (marcado: boolean) => void;
  /** Borda de erro enquanto não marcada (ex.: "Marque para começar"). */
  invalido?: boolean;
  /** Id do texto que descreve o erro ou a dica. */
  descricao?: string;
  refInput?: Ref<HTMLInputElement>;
  className?: string;
  children: ReactNode;
}) {
  // Marcou agora (e não chegou já marcada ao montar): só então o Check dá o pop.
  const [recem, setRecem] = useState(false);
  return (
    <label
      className={cn(
        "selecionavel flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-laranja-acao",
        marcado
          ? "selecionado"
          : invalido
            ? "border-erro bg-card"
            : "border-borda-controle bg-card hover:bg-creme/60",
        className,
      )}
    >
      <input
        ref={refInput}
        type="checkbox"
        className="sr-only"
        checked={marcado}
        onChange={(e) => {
          setRecem(e.target.checked);
          aoMudar(e.target.checked);
        }}
        aria-invalid={invalido && !marcado ? true : undefined}
        aria-describedby={descricao}
      />
      <MarcadorSelecionado marcado={marcado} recem={recem} className="size-7" />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}
