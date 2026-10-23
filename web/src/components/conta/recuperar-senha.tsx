import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Info } from "lucide-react";
import { Campo, DesenhoSvg } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEnvio } from "./envio";
import { supabase } from "@/lib/supabase";
import { BotaoEnvio, LayoutConta } from "./layout";
import { focarCampo, regras, useFormulario } from "./validacao";

/** /recuperar-senha · envia o link para criar uma senha nova. */
export function RecuperarSenha() {
  const form = useFormulario({ email: regras.email }, { email: "" });
  const [enviado, setEnviado] = useState(false);
  // Volta ao formulário por "Usar outro e-mail": ele reaparece com um fade e o foco no campo.
  const [voltou, setVoltou] = useState(false);
  const { enviando, enviar } = useEnvio<"link">();
  const confirmacao = useRef<HTMLHeadingElement>(null);

  // Leva o foco (e o leitor de tela) para a confirmação depois do envio.
  useEffect(() => {
    if (enviado) confirmacao.current?.focus();
  }, [enviado]);

  return (
    <LayoutConta
      titulo="Recuperar senha"
      subtitulo="Informe o e-mail da sua conta. Vamos mandar um link para você criar uma senha nova."
    >
      {enviado ? (
        <div role="status" className="anima-surgir rounded-2xl bg-creme p-5 ring-1 ring-linha">
          <span className="grid size-12 place-items-center rounded-xl bg-card text-laranja ring-1 ring-linha">
            <EnvelopeEnviado />
          </span>
          <h2
            ref={confirmacao}
            tabIndex={-1}
            className="mt-4 text-[22px] font-bold focus-visible:outline-none"
          >
            Confira seu e-mail
          </h2>
          <p className="mt-2">Se esse e-mail estiver cadastrado, você vai receber um link.</p>
          <p className="mt-2 break-all font-semibold">{form.valores.email.trim()}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            O link pode levar alguns minutos para chegar. Vale olhar também a caixa de spam.
          </p>
          <Button
            type="button"
            variant="ghost"
            className="-ml-3 mt-3"
            onClick={() => {
              setEnviado(false);
              setVoltou(true);
              focarCampo("email");
            }}
          >
            Usar outro e-mail
          </Button>
        </div>
      ) : (
        <form
          noValidate
          className={cn("space-y-5", voltou && "anima-aparecer")}
          onSubmit={(e) => {
            e.preventDefault();
            const invalido = form.validarTudo();
            if (invalido) focarCampo(invalido);
            else
              enviar("link", async () => {
                const { error } = await supabase.auth.resetPasswordForEmail(
                  form.valores.email.trim(),
                  { redirectTo: `${window.location.origin}/nova-senha` },
                );
                if (error) throw error;
                setEnviado(true);
              });
          }}
        >
          <Campo
            id="email"
            rotulo="E-mail"
            tipo="email"
            autoComplete="email"
            placeholder="nome@email.com"
            required
            {...form.campo("email")}
          />
          <BotaoEnvio type="submit" enviando={enviando === "link"} textoEnviando="Enviando o link…">
            Enviar link
          </BotaoEnvio>
          <p className="flex gap-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            Criou a conta com o Google? Então não há senha para recuperar: volte e toque em
            “Continuar com Google”.
          </p>
        </form>
      )}
      <Button asChild variant="outline" className="mt-6 w-full">
        <Link to="/entrar">
          <ArrowLeft />
          Voltar para entrar
        </Link>
      </Button>
    </LayoutConta>
  );
}

/**
 * Envelope com check (o MailCheck do lucide) que se desenha quando a confirmação aparece:
 * primeiro o envelope, depois a dobra, por último o check.
 */
function EnvelopeEnviado() {
  return (
    <DesenhoSvg
      viewBox="0 0 24 24"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path
        pathLength={1}
        className="traco"
        d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"
      />
      <path
        pathLength={1}
        className="traco"
        style={{ "--atraso": "120ms" } as CSSProperties}
        d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
      />
      <path
        pathLength={1}
        className="traco"
        style={{ "--atraso": "360ms" } as CSSProperties}
        d="m16 19 2 2 4-4"
      />
    </DesenhoSvg>
  );
}
