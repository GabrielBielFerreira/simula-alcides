import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { GoogleG } from "@/components/site/chrome";
import { cn } from "@/lib/utils";

const NOME_REDE = "Rede de Cursinhos Populares Alcides Nascimento";

/**
 * Moldura de /entrar, /cadastro e /recuperar-senha.
 * Celular: coluna única com o logo vertical no topo. Desktop: painel vinho fixo à esquerda
 * (o único bloco de cor da tela) e o formulário num cartão à direita.
 * Movimento: o cartão entra suave; na troca entre estas telas, o painel vinho (desktop) e o
 * logo (celular) ficam parados e só o cartão troca. Erros surgem deslizando (`.form-conta`).
 */
export function LayoutConta({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* O fundo vinho acompanha a altura da página; o conteúdo fica parado ao rolar. */}
      <aside className="hidden bg-vinho text-creme [view-transition-name:conta-painel] lg:block">
        <div className="casario-claro sticky top-0 flex h-dvh flex-col px-12 pb-20 pt-12 xl:px-16">
          <Link
            to="/"
            aria-label="Simula Alcides, página inicial"
            className="self-start rounded-md focus-visible:outline-amarelo"
          >
            <img
              src="/brand/rcp-horizontal-fundo-escuro.png"
              alt={NOME_REDE}
              width={1200}
              height={377}
              className="h-auto w-[240px]"
            />
          </Link>
          <div className="my-auto max-w-[480px] py-10">
            <p className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-amarelo">
              <span className="h-1 w-6 rounded-full bg-amarelo" aria-hidden />
              Simula Alcides
            </p>
            <p className="font-display text-[44px] font-black leading-[1.08] text-offwhite xl:text-[52px]">
              Seu futuro começa com a <span className="text-amarelo">próxima questão.</span>
            </p>
            <p className="mt-6 max-w-[400px] text-lg text-creme/90">
              Simulados do ENEM gratuitos, pensados para o celular, com acompanhamento da sua
              evolução.
            </p>
          </div>
          <p className="max-w-[420px] text-sm text-creme/80">
            Uma iniciativa da {NOME_REDE}. Realização: Sonhos da Periferia.
          </p>
        </div>
      </aside>

      <main className="flex min-h-dvh flex-col items-center px-4 pb-8 pt-6 lg:justify-center lg:px-12 lg:py-12">
        <Link
          to="/"
          aria-label="Simula Alcides, página inicial"
          className="mb-6 rounded-md [view-transition-name:conta-logo] lg:hidden"
        >
          <img
            src="/brand/rcp-vertical.png"
            alt={NOME_REDE}
            width={800}
            height={1017}
            className="h-[140px] w-auto"
          />
        </Link>
        <div className="form-conta anima-subir duracao-media w-full max-w-[440px] lg:cartao lg:max-w-[480px] lg:p-10">
          <h1 className="titulo-pagina">{titulo}</h1>
          {subtitulo && <p className="mt-2 text-muted-foreground">{subtitulo}</p>}
          <div className="mt-7">{children}</div>
        </div>
        <p className="mt-auto max-w-[440px] pt-10 text-center text-sm text-muted-foreground lg:hidden">
          Simula Alcides · uma iniciativa da {NOME_REDE}
        </p>
      </main>
    </div>
  );
}

/**
 * Botão de envio com o estado "trabalhando": ícone girando e texto no gerúndio, no mesmo
 * tamanho (nada pula). Continua com a cor cheia (não parece desabilitado) e com o foco.
 */
export function BotaoEnvio({
  enviando,
  textoEnviando,
  className,
  children,
  onClick,
  ...props
}: ButtonProps & { enviando: boolean; textoEnviando: string }) {
  return (
    <Button
      size="lg"
      className={cn("w-full", enviando && "cursor-progress", className)}
      aria-disabled={enviando || undefined}
      onClick={(e) => {
        if (enviando) return e.preventDefault();
        onClick?.(e);
      }}
      {...props}
    >
      {enviando ? (
        <span
          key="enviando"
          className="anima-aparecer duracao-micro inline-flex items-center gap-2"
        >
          <Loader2 className="animate-spin" aria-hidden />
          {textoEnviando}
        </span>
      ) : (
        children
      )}
    </Button>
  );
}

/** "Continuar com Google": vem sempre antes do formulário de e-mail. */
export function ContinuarComGoogle({
  onClick,
  enviando = false,
}: {
  onClick: () => void;
  enviando?: boolean;
}) {
  return (
    <BotaoEnvio
      type="button"
      variant="google"
      enviando={enviando}
      textoEnviando="Abrindo o Google…"
      onClick={onClick}
    >
      <GoogleG />
      Continuar com Google
    </BotaoEnvio>
  );
}

/** Divisor "ou" entre o Google e o formulário. */
export function DivisorOu() {
  return (
    <div className="my-6 flex items-center gap-4 text-sm font-semibold text-muted-foreground">
      <span className="h-px flex-1 bg-linha" aria-hidden />
      ou
      <span className="h-px flex-1 bg-linha" aria-hidden />
    </div>
  );
}

/** Linha de rodapé do cartão ("Ainda não tem conta? Criar conta"). */
export function TrocaConta({ pergunta, children }: { pergunta: string; children: ReactNode }) {
  return (
    <p className="mt-6 flex flex-wrap items-center justify-center gap-x-1.5 border-t border-linha pt-4 text-center">
      {pergunta}
      {children}
    </p>
  );
}

/** Link de texto com área de toque de 44px. */
export const classeLinkConta =
  "inline-flex min-h-11 items-center font-semibold text-laranja-acao underline hover:text-vinho";
