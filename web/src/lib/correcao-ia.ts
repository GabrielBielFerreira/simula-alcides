/**
 * Função de servidor que corrige uma redação já enviada. A chave do Gemini e o segredo de
 * gravação ficam só no servidor (variáveis de ambiente do Vercel); o navegador manda apenas o
 * token da sessão e o id da redação.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type MotivoFalha =
  | "sem_chave"
  | "chave_invalida"
  | "cota"
  | "indisponivel"
  | "resposta_invalida"
  | "tentativas_esgotadas"
  | "sem_login"
  | "redacao_inexistente"
  | "erro";

export type ResultadoCorrecao = { ok: true } | { ok: false; motivo: MotivoFalha };

const URL_SUPABASE = "https://ujslzmwlkucvhwdyuteo.supabase.co";
const CHAVE_PUBLICA = "sb_publishable_ekcHu1byXq0ZJ9Nom4AF5A_FbY5-8nc";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const pedirCorrecao = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; redacaoId: string }) => {
    if (typeof d?.token !== "string" || !d.token || d.token.length > 4096)
      throw new Error("token inválido");
    if (typeof d?.redacaoId !== "string" || !UUID.test(d.redacaoId))
      throw new Error("redação inválida");
    return d;
  })
  .handler(async ({ data }): Promise<ResultadoCorrecao> => {
    const { corrigirComGemini, ErroIA } = await import("@/server/gemini");
    // Cliente com a sessão do estudante: o banco confere que a redação é dele.
    const banco = createClient(
      process.env.VITE_SUPABASE_URL ?? URL_SUPABASE,
      process.env.VITE_SUPABASE_ANON_KEY ?? CHAVE_PUBLICA,
      {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${data.token}` } },
      },
    );

    const reserva = await banco.rpc("reservar_correcao", { p_redacao: data.redacaoId });
    if (reserva.error) {
      const m = reserva.error.message;
      if (m.includes("ja_corrigida")) return { ok: true };
      if (m.includes("tentativas_esgotadas")) return { ok: false, motivo: "tentativas_esgotadas" };
      if (m.includes("redacao_inexistente")) return { ok: false, motivo: "redacao_inexistente" };
      if (/JWT|jwt|token/.test(m)) return { ok: false, motivo: "sem_login" };
      console.error("[redacao] reservar_correcao:", m);
      return { ok: false, motivo: "erro" };
    }
    const dados = reserva.data as { tema: string; textos: string[]; texto: string };

    let correcao;
    try {
      correcao = await corrigirComGemini(dados);
    } catch (e) {
      if (e instanceof ErroIA) return { ok: false, motivo: e.motivo };
      console.error("[redacao] correção:", e);
      return { ok: false, motivo: "indisponivel" };
    }

    const gravou = await banco.rpc("registrar_correcao_ia", {
      p_segredo: process.env.CORRECAO_SEGREDO ?? "",
      p_redacao: data.redacaoId,
      p_modelo: correcao.modelo,
      p_competencias: correcao.competencias,
      p_trechos: correcao.trechos,
      p_plano: correcao.plano,
      p_tokens_entrada: correcao.tokensEntrada,
      p_tokens_saida: correcao.tokensSaida,
    });
    if (gravou.error) {
      if (gravou.error.message.includes("ja_corrigida")) return { ok: true };
      console.error("[redacao] registrar_correcao_ia:", gravou.error.message);
      return { ok: false, motivo: "erro" };
    }
    return { ok: true };
  });

/** Mensagem para o estudante, conforme o motivo da falha. */
export const MENSAGEM_FALHA: Record<MotivoFalha, string> = {
  sem_chave:
    "A correção por IA ainda está sendo ligada pela equipe. Sua redação ficou guardada e pode ser corrigida depois, por aqui mesmo.",
  chave_invalida:
    "A correção por IA está com um problema de configuração. Sua redação ficou guardada. Avise a coordenação do seu Compaz.",
  cota: "A IA chegou ao limite gratuito de correções por agora. Sua redação ficou guardada: peça a correção de novo mais tarde (o limite renova todo dia).",
  indisponivel:
    "A IA não respondeu desta vez. Sua redação ficou guardada: tente de novo em alguns minutos.",
  resposta_invalida:
    "A IA devolveu uma correção incompleta. Sua redação ficou guardada: tente de novo em alguns minutos.",
  tentativas_esgotadas:
    "Já tentamos corrigir esta redação algumas vezes sem sucesso. Ela ficou guardada e a coordenação pode revisar.",
  sem_login: "Sua sessão expirou. Entre de novo para pedir a correção.",
  redacao_inexistente: "Não encontramos essa redação na sua conta.",
  erro: "Algo deu errado ao corrigir. Sua redação ficou guardada: tente de novo em alguns minutos.",
};
