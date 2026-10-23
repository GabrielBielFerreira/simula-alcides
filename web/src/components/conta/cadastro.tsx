import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Campo } from "@/components/ds";
import { SENHA_MINIMA } from "@/data/conta";
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
import { entrarComGoogle } from "@/lib/dados";
import { dataIsoDe, focarCampo, mascaraData, regras, useFormulario } from "./validacao";

/** /cadastro · cria a conta (e-mail ou Google) e segue às boas-vindas. */
export function Cadastro() {
  const navigate = useNavigate();
  const { enviando, enviar } = useEnvio<"google" | "email">();
  const form = useFormulario(
    {
      nome: regras.nome,
      email: regras.email,
      nascimento: regras.nascimento,
      senha: regras.senhaNova,
    },
    { nome: "", email: "", nascimento: "", senha: "" },
  );
  const nascimento = form.campo("nascimento");
  const [aceite, setAceite] = useState(false);
  const [cobrarAceite, setCobrarAceite] = useState(false);
  const erroAceite = cobrarAceite && !aceite;

  return (
    <LayoutConta titulo="Criar conta" subtitulo="É de graça e sempre vai ser. Leva um minuto.">
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
          setCobrarAceite(true);
          if (invalido) return focarCampo(invalido);
          if (!aceite) return focarCampo("aceite");
          enviar("email", async () => {
            const { data, error } = await supabase.auth.signUp({
              email: form.valores.email.trim(),
              password: form.valores.senha,
              options: {
                emailRedirectTo: `${window.location.origin}/boas-vindas`,
                data: {
                  nome: form.valores.nome.trim(),
                  data_nascimento: dataIsoDe(form.valores.nascimento),
                },
              },
            });
            if (error) throw error;
            // Sem sessão: o projeto pede confirmação por e-mail.
            if (!data.session) {
              throw new Error("Enviamos um link para o seu e-mail. Abra-o para ativar a conta.");
            }
            await navigate({ to: "/boas-vindas" });
          });
        }}
      >
        <Campo
          id="nome"
          rotulo="Nome"
          autoComplete="name"
          placeholder="Como você se chama?"
          required
          {...form.campo("nome")}
        />
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
          id="nascimento"
          rotulo="Data de nascimento"
          inputMode="numeric"
          maxLength={10}
          autoComplete="bday"
          placeholder="dd/mm/aaaa"
          dica="Com menos de 18 anos, pedimos o e-mail de um responsável."
          required
          {...nascimento}
          onChange={(v) => nascimento.onChange(mascaraData(v))}
        />
        <Campo
          id="senha"
          rotulo="Senha"
          tipo="password"
          autoComplete="new-password"
          dica={`Mínimo ${SENHA_MINIMA} caracteres.`}
          required
          {...form.campo("senha")}
        />

        <div className="space-y-1.5">
          <label htmlFor="aceite" className="flex min-h-11 cursor-pointer items-start gap-3 py-1">
            <input
              id="aceite"
              type="checkbox"
              checked={aceite}
              onChange={(e) => setAceite(e.target.checked)}
              required
              aria-invalid={erroAceite}
              aria-describedby={erroAceite ? "aceite-erro" : undefined}
              className="mt-0.5 size-6 shrink-0 cursor-pointer accent-laranja-acao"
            />
            <span>
              Li e aceito a{" "}
              <Link
                to="/privacidade"
                target="_blank"
                rel="noopener"
                className="py-3 font-semibold text-laranja-acao underline hover:text-vinho"
              >
                Política de privacidade
                <span className="sr-only"> (abre em nova aba)</span>
              </Link>
            </span>
          </label>
          {erroAceite && (
            <p
              id="aceite-erro"
              className="erro-surge flex items-start gap-1.5 text-sm font-medium text-erro"
            >
              <X className="mt-0.5 size-4 shrink-0" aria-hidden />
              Para criar a conta, é preciso aceitar a Política de privacidade.
            </p>
          )}
        </div>

        <BotaoEnvio
          type="submit"
          enviando={enviando === "email"}
          textoEnviando="Criando sua conta…"
        >
          Criar conta
        </BotaoEnvio>
      </form>
      <TrocaConta pergunta="Já tem conta?">
        <Link to="/entrar" className={classeLinkConta}>
          Entrar
        </Link>
      </TrocaConta>
    </LayoutConta>
  );
}
