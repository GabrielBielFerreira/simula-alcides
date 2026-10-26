/**
 * Função de servidor que corrige uma redação já enviada. A chave do Gemini e o segredo de
 * gravação ficam só no servidor (variáveis de ambiente do Vercel); o navegador manda apenas o
 * token da sessão e o id da redação. Redação por foto: o servidor baixa as fotos da folha com a
 * sessão do estudante e o Gemini lê e corrige direto das imagens.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type MotivoFalha =
  | "sem_chave"
  | "chave_invalida"
  | "cota"
  | "indisponivel"
  | "resposta_invalida"
  | "ilegivel"
  | "tentativas_esgotadas"
  | "sem_login"
  | "redacao_inexistente"
  | "erro";

export type ResultadoCorrecao =
  | { ok: true }
  /** `aviso`: na foto ilegível, o que a IA viu de errado na foto. */
  | { ok: false; motivo: MotivoFalha; aviso?: string };

const BUCKET_FOTOS = "redacoes-fotos";

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
    const { corrigirComGemini, corrigirFotoComGemini, ErroIA } = await import("@/server/gemini");
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

    // Redação por foto: o texto ainda está vazio e as fotos estão na pasta do estudante.
    const linha = await banco.from("redacoes").select("fotos").eq("id", data.redacaoId).single();
    if (linha.error) {
      console.error("[redacao] fotos:", linha.error.message);
      return { ok: false, motivo: "erro" };
    }
    const fotos = (linha.data.fotos as string[] | null) ?? [];

    let gravou;
    try {
      if (fotos.length && !dados.texto.trim()) {
        const imagens: { mime: string; base64: string }[] = [];
        for (const caminho of fotos) {
          const baixou = await banco.storage.from(BUCKET_FOTOS).download(caminho);
          if (baixou.error || !baixou.data) {
            console.error("[redacao-foto] download:", caminho, baixou.error?.message);
            return { ok: false, motivo: "erro" };
          }
          const bytes = Buffer.from(await baixou.data.arrayBuffer());
          imagens.push({
            mime: /^image\/(jpeg|png|webp)$/.test(baixou.data.type)
              ? baixou.data.type
              : "image/jpeg",
            base64: bytes.toString("base64"),
          });
        }
        const c = await corrigirFotoComGemini({ tema: dados.tema, textos: dados.textos, imagens });
        gravou = await banco.rpc("registrar_correcao_foto", {
          p_segredo: process.env.CORRECAO_SEGREDO ?? "",
          p_redacao: data.redacaoId,
          p_fotos: fotos,
          p_texto: c.transcricao,
          p_aviso: c.aviso || null,
          p_modelo: c.modelo,
          p_competencias: c.competencias,
          p_trechos: c.trechos,
          p_plano: c.plano,
          p_tokens_entrada: c.tokensEntrada,
          p_tokens_saida: c.tokensSaida,
        });
      } else {
        const c = await corrigirComGemini(dados);
        gravou = await banco.rpc("registrar_correcao_ia", {
          p_segredo: process.env.CORRECAO_SEGREDO ?? "",
          p_redacao: data.redacaoId,
          p_modelo: c.modelo,
          p_competencias: c.competencias,
          p_trechos: c.trechos,
          p_plano: c.plano,
          p_tokens_entrada: c.tokensEntrada,
          p_tokens_saida: c.tokensSaida,
        });
      }
    } catch (e) {
      if (e instanceof ErroIA) return { ok: false, motivo: e.motivo, aviso: e.aviso || undefined };
      console.error("[redacao] correção:", e);
      return { ok: false, motivo: "indisponivel" };
    }

    if (gravou.error) {
      if (gravou.error.message.includes("ja_corrigida")) return { ok: true };
      // As fotos foram trocadas enquanto a IA corrigia: a correção antiga não vale.
      if (gravou.error.message.includes("fotos_trocadas")) return { ok: false, motivo: "erro" };
      console.error("[redacao] registrar correção:", gravou.error.message);
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
  ilegivel:
    "A IA não conseguiu ler a sua folha nessa foto. Tire outra foto: folha inteira, de cima, com boa luz e sem sombra.",
  tentativas_esgotadas:
    "Já tentamos corrigir esta redação algumas vezes sem sucesso. Se ela foi por foto, mande uma foto nova; se não, a coordenação pode revisar.",
  sem_login: "Sua sessão expirou. Entre de novo para pedir a correção.",
  redacao_inexistente: "Não encontramos essa redação na sua conta.",
  erro: "Algo deu errado ao corrigir. Sua redação ficou guardada: tente de novo em alguns minutos.",
};
