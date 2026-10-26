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

export type ResultadoLeitura =
  { ok: true; texto: string; duvidas: number; aviso: string } | { ok: false; mensagem: string };

const BUCKET_FOTOS = "redacoes-fotos";
const LEITURA_FALHOU =
  "A IA não conseguiu ler a foto agora. Tente de novo em alguns minutos ou digite o texto.";

/** Lê a redação manuscrita das fotos já enviadas ao Storage (pasta do próprio estudante). */
export const lerFotoRedacao = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; fotos: string[] }) => {
    if (typeof d?.token !== "string" || !d.token || d.token.length > 4096)
      throw new Error("token inválido");
    if (
      !Array.isArray(d?.fotos) ||
      d.fotos.length < 1 ||
      d.fotos.length > 3 ||
      d.fotos.some((f) => typeof f !== "string" || !/^[0-9a-f-]{36}\/[\w.-]{1,80}$/i.test(f))
    )
      throw new Error("fotos inválidas");
    return d;
  })
  .handler(async ({ data }): Promise<ResultadoLeitura> => {
    const { transcreverComGemini, ErroIA } = await import("@/server/gemini");
    const banco = createClient(
      process.env.VITE_SUPABASE_URL ?? URL_SUPABASE,
      process.env.VITE_SUPABASE_ANON_KEY ?? CHAVE_PUBLICA,
      {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${data.token}` } },
      },
    );

    const reserva = await banco.rpc("reservar_transcricao", { p_fotos: data.fotos.length });
    if (reserva.error) {
      const m = reserva.error.message;
      if (m.includes("limite_transcricao"))
        return {
          ok: false,
          mensagem:
            "Você já usou a leitura de fotos várias vezes hoje. Digite o texto ou tente amanhã.",
        };
      if (/sem_login|JWT|jwt|token/.test(m))
        return { ok: false, mensagem: MENSAGEM_FALHA.sem_login };
      console.error("[redacao-foto] reservar_transcricao:", m);
      return { ok: false, mensagem: LEITURA_FALHOU };
    }
    const dono = String(reserva.data);
    if (data.fotos.some((f) => !f.startsWith(`${dono}/`)))
      return { ok: false, mensagem: "Essas fotos não são da sua conta." };

    const imagens: { mime: string; base64: string }[] = [];
    for (const caminho of data.fotos) {
      const baixou = await banco.storage.from(BUCKET_FOTOS).download(caminho);
      if (baixou.error || !baixou.data) {
        console.error("[redacao-foto] download:", baixou.error?.message);
        return { ok: false, mensagem: "Não achamos a foto enviada. Tire a foto de novo." };
      }
      const bytes = Buffer.from(await baixou.data.arrayBuffer());
      imagens.push({ mime: baixou.data.type || "image/jpeg", base64: bytes.toString("base64") });
    }

    try {
      const t = await transcreverComGemini(imagens);
      if (!t.legivel)
        return {
          ok: false,
          mensagem:
            t.aviso ||
            "Não conseguimos ler a redação nessa foto. Tente com mais luz, a folha inteira e sem tremer.",
        };
      return { ok: true, texto: t.texto, duvidas: t.duvidas, aviso: t.aviso };
    } catch (e) {
      if (e instanceof ErroIA) {
        if (e.motivo === "cota")
          return {
            ok: false,
            mensagem:
              "A IA chegou ao limite gratuito por agora. Tente de novo mais tarde ou digite o texto.",
          };
        return { ok: false, mensagem: LEITURA_FALHOU };
      }
      console.error("[redacao-foto] leitura:", e);
      return { ok: false, mensagem: LEITURA_FALHOU };
    }
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
