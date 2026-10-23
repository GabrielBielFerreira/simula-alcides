import { useNavigate } from "@tanstack/react-router";
import { Campo } from "@/components/ds";
import { SENHA_MINIMA } from "@/data/conta";
import { supabase } from "@/lib/supabase";
import { useSessao } from "@/lib/sessao";
import { BotaoEnvio, LayoutConta } from "./layout";
import { useEnvio } from "./envio";
import { focarCampo, regras, useFormulario } from "./validacao";

/** /nova-senha · chega aqui pelo link do e-mail de recuperação, já com a sessão aberta. */
export function NovaSenha() {
  const navigate = useNavigate();
  const { pronto, usuario } = useSessao();
  const { enviando, enviar } = useEnvio<"senha">();
  const form = useFormulario({ senha: regras.senhaNova }, { senha: "" });

  return (
    <LayoutConta titulo="Nova senha" subtitulo="Escolha a senha que você vai usar daqui em diante.">
      {pronto && !usuario ? (
        <p className="rounded-2xl bg-creme p-5">
          Este link expirou ou já foi usado. Peça um novo em “Esqueci minha senha”.
        </p>
      ) : (
        <form
          noValidate
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            const invalido = form.validarTudo();
            if (invalido) return focarCampo(invalido);
            enviar("senha", async () => {
              const { error } = await supabase.auth.updateUser({ password: form.valores.senha });
              if (error) throw error;
              await navigate({ to: "/app" });
            });
          }}
        >
          <Campo
            id="senha"
            rotulo="Nova senha"
            tipo="password"
            autoComplete="new-password"
            dica={`Mínimo ${SENHA_MINIMA} caracteres.`}
            required
            {...form.campo("senha")}
          />
          <BotaoEnvio type="submit" enviando={enviando === "senha"} textoEnviando="Salvando…">
            Salvar e entrar
          </BotaoEnvio>
        </form>
      )}
    </LayoutConta>
  );
}
