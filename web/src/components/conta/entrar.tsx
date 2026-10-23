import { Link, useNavigate } from "@tanstack/react-router";
import { Campo } from "@/components/ds";
import { cn } from "@/lib/utils";
import {
  BotaoEnvio,
  ContinuarComGoogle,
  DivisorOu,
  LayoutConta,
  TrocaConta,
  classeLinkConta,
} from "./layout";
import { useEnvio } from "./envio";
import { supabase } from "@/lib/supabase";
import { useVaiParaAppSeLogado } from "@/lib/sessao";
import { entrarComGoogle } from "@/lib/dados";
import { focarCampo, regras, useFormulario } from "./validacao";

/** /entrar · login por e-mail e senha ou com Google. */
export function Entrar() {
  const navigate = useNavigate();
  useVaiParaAppSeLogado();
  const { enviando, enviar } = useEnvio<"google" | "email">();
  const form = useFormulario(
    { email: regras.email, senha: regras.senha },
    { email: "", senha: "" },
  );
  const entrarComEmail = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: form.valores.email.trim(),
      password: form.valores.senha,
    });
    if (error) throw error;
    await navigate({ to: "/app" });
  };

  return (
    <LayoutConta titulo="Entrar" subtitulo="Que bom te ver de novo.">
      <ContinuarComGoogle
        enviando={enviando === "google"}
        onClick={() => enviar("google", entrarComGoogle)}
      />
      <DivisorOu />
      <form
        noValidate
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          const invalido = form.validarTudo();
          if (invalido) focarCampo(invalido);
          else enviar("email", entrarComEmail);
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
        <Campo
          id="senha"
          rotulo="Senha"
          tipo="password"
          autoComplete="current-password"
          required
          {...form.campo("senha")}
        >
          <Link to="/recuperar-senha" className={cn(classeLinkConta, "text-sm")}>
            Esqueci minha senha
          </Link>
        </Campo>
        <BotaoEnvio type="submit" enviando={enviando === "email"} textoEnviando="Entrando…">
          Entrar
        </BotaoEnvio>
      </form>
      <TrocaConta pergunta="Ainda não tem conta?">
        <Link to="/cadastro" className={classeLinkConta}>
          Criar conta
        </Link>
      </TrocaConta>
    </LayoutConta>
  );
}
