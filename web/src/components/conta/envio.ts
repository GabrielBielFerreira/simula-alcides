import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** Tempo do envio simulado: o bastante para ver o retorno, curto para não atrapalhar. */
const ESPERA_ENVIO = 600;

/**
 * Envio simulado (login, cadastro, link de senha, Google). O botão tocado mostra na hora que
 * está trabalhando e, depois de um instante, a tela segue. No projeto real, a espera é a
 * resposta do servidor. Um segundo toque durante o envio é ignorado.
 * `seguir` que navega devolve a promessa da navegação: o botão continua "enviando" até a tela
 * trocar (a saída da tela mostra o estado coerente, sem voltar a "Criar conta" por um instante)
 * e só volta ao normal se a tela não mudar. `seguir` que só muda o estado (sem promessa) volta
 * junto, no mesmo desenho.
 */
export function useEnvioSimulado<Acao extends string>() {
  const [enviando, setEnviando] = useState<Acao | null>(null);
  const relogio = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(relogio.current), []);

  const enviar = (acao: Acao, seguir: () => void | Promise<unknown>) => {
    if (enviando) return;
    setEnviando(acao);
    relogio.current = setTimeout(() => {
      const navegacao = seguir();
      // Saiu da tela: o componente desmonta e nada acontece. Ficou (falhou ou foi barrada): volta.
      if (!navegacao) return setEnviando(null);
      void navegacao.catch(() => {}).finally(() => setEnviando(null));
    }, ESPERA_ENVIO);
  };
  return { enviando, enviar };
}

/** Mensagens do Supabase Auth traduzidas para quem está do outro lado. */
export function mensagemDeErro(erro: unknown) {
  const msg = erro instanceof Error ? erro.message : String(erro);
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/already registered|already been registered/i.test(msg))
    return "Este e-mail já tem conta. Use “Entrar”.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail pelo link que enviamos.";
  if (/rate limit|too many/i.test(msg))
    return "Muitas tentativas. Espere um minuto e tente de novo.";
  if (/password/i.test(msg) && /least|short|weak/i.test(msg))
    return "Escolha uma senha mais forte (mínimo 8 caracteres).";
  if (/fetch|network/i.test(msg)) return "Sem conexão. Verifique a internet e tente de novo.";
  return msg || "Não deu certo. Tente de novo.";
}

/**
 * Envio de verdade: o botão tocado mostra que está trabalhando até a ação terminar.
 * Se der erro, avisa com um toast e libera o botão. Um segundo toque durante o envio é ignorado.
 */
export function useEnvio<Acao extends string>() {
  const [enviando, setEnviando] = useState<Acao | null>(null);
  const ativo = useRef(true);
  useEffect(() => () => void (ativo.current = false), []);

  const enviar = (acao: Acao, fazer: () => Promise<unknown>) => {
    if (enviando) return;
    setEnviando(acao);
    void fazer()
      .catch((e) => toast.error(mensagemDeErro(e)))
      .finally(() => ativo.current && setEnviando(null));
  };
  return { enviando, enviar };
}
