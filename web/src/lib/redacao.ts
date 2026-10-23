/**
 * Redação no banco: propostas, envio, histórico e devolutivas. A correção em si roda no
 * servidor (`correcao-ia.ts`).
 */
import type { Devolutiva, TextoMotivador, Trecho, PassoPlano } from "@/data/estudante";
import { supabase } from "./supabase";
import { MENSAGEM_FALHA, pedirCorrecao, type ResultadoCorrecao } from "./correcao-ia";

function falhou(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message);
}

export interface PropostaReal {
  id: string;
  tema: string;
  eixo: string;
  resumo: string;
  textos: TextoMotivador[];
}

export async function buscarPropostas(): Promise<PropostaReal[]> {
  const { data, error } = await supabase
    .from("propostas_redacao")
    .select("id, titulo, eixo, resumo, textos, ordem")
    .eq("ativa", true)
    .order("ordem");
  falhou(error);
  return (data ?? []).map((p) => ({
    id: p.id as string,
    tema: p.titulo as string,
    eixo: (p.eixo as string | null) ?? "Proposta",
    resumo: (p.resumo as string | null) ?? "",
    textos: ((p.textos as TextoMotivador[] | null) ?? []).map((t) => ({
      texto: t.texto,
      fonte: t.fonte ?? "",
    })),
  }));
}

export type StatusRedacao = "rascunho" | "enviada" | "corrigida" | "em_revisao";

export interface RedacaoResumo {
  id: string;
  propostaId: string;
  tema: string;
  status: StatusRedacao;
  enviadaEm: string;
  nota: number | null;
  /** Notas de C1 a C5 (null enquanto não corrigida). */
  competencias: number[] | null;
}

export interface RedacaoCompleta extends RedacaoResumo {
  texto: string;
  palavras: number;
  modelo: string | null;
  devolutiva: Devolutiva | null;
}

interface LinhaCorrecao {
  nota_total: number | null;
  competencias: { nota: number; comentario: string }[];
  trechos?: Trecho[];
  plano?: PassoPlano[];
  modelo?: string | null;
  created_at: string;
}

interface LinhaRedacao {
  id: string;
  proposta_id: string;
  status: StatusRedacao;
  enviada_em: string | null;
  created_at: string;
  texto?: string;
  palavras?: number;
  proposta: { titulo: string } | null;
  correcoes: LinhaCorrecao[];
}

const ultimaCorrecao = (r: LinhaRedacao) =>
  [...(r.correcoes ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

function resumo(r: LinhaRedacao): RedacaoResumo {
  const c = ultimaCorrecao(r);
  return {
    id: r.id,
    propostaId: r.proposta_id,
    tema: r.proposta?.titulo ?? "Redação",
    status: r.status,
    enviadaEm: r.enviada_em ?? r.created_at,
    nota: c?.nota_total ?? null,
    competencias: c ? c.competencias.map((x) => x.nota) : null,
  };
}

const CAMPOS_RESUMO =
  "id, proposta_id, status, enviada_em, created_at, proposta:propostas_redacao(titulo), correcoes:correcoes_redacao(nota_total, competencias, created_at)";

/** Redações de um estudante, da mais recente para a mais antiga (RLS decide quem vê). */
export async function redacoesDoEstudante(estudanteId: string): Promise<RedacaoResumo[]> {
  const { data, error } = await supabase
    .from("redacoes")
    .select(CAMPOS_RESUMO)
    .eq("estudante_id", estudanteId)
    .order("created_at", { ascending: false });
  falhou(error);
  return ((data ?? []) as unknown as LinhaRedacao[]).map(resumo);
}

export async function buscarRedacao(id: string): Promise<RedacaoCompleta | null> {
  const { data, error } = await supabase
    .from("redacoes")
    .select(
      "id, proposta_id, status, enviada_em, created_at, texto, palavras, proposta:propostas_redacao(titulo), correcoes:correcoes_redacao(nota_total, competencias, trechos, plano, modelo, created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  falhou(error);
  if (!data) return null;
  const r = data as unknown as LinhaRedacao;
  const c = ultimaCorrecao(r);
  return {
    ...resumo(r),
    texto: r.texto ?? "",
    palavras: r.palavras ?? 0,
    modelo: c?.modelo ?? null,
    devolutiva: c
      ? {
          competencias: c.competencias.map((x) => x.nota),
          comentarios: c.competencias.map((x) => x.comentario),
          trechos: c.trechos ?? [],
          plano: c.plano ?? [],
        }
      : null,
  };
}

const ERROS_ENVIO: Record<string, string> = {
  limite_diario:
    "Você já enviou 3 redações hoje. Amanhã tem mais! Seu texto continua salvo neste aparelho.",
  texto_curto: "Seu texto está curto demais para a correção. Escreva pelo menos 8 linhas.",
  texto_longo: "Seu texto passou do tamanho máximo. Enxugue um pouco e envie de novo.",
  proposta_inexistente: "Essa proposta não está mais disponível.",
  sem_login: "Sua sessão expirou. Entre de novo para enviar.",
};

/** Envia a redação; devolve o id. Lança com uma mensagem pronta para a tela. */
export async function enviarRedacao(propostaId: string, texto: string): Promise<string> {
  const { data, error } = await supabase.rpc("enviar_redacao", {
    p_proposta: propostaId,
    p_texto: texto,
  });
  if (error) {
    const chave = Object.keys(ERROS_ENVIO).find((k) => error.message.includes(k));
    throw new Error(
      chave ? ERROS_ENVIO[chave] : "Não deu para enviar agora. Confira a internet e tente de novo.",
    );
  }
  return data as string;
}

/** Pede a correção ao servidor. Devolve null se deu certo ou a mensagem de falha. */
export async function corrigirRedacao(redacaoId: string): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return MENSAGEM_FALHA.sem_login;
  let r: ResultadoCorrecao;
  try {
    r = await pedirCorrecao({ data: { token, redacaoId } });
  } catch (e) {
    console.error(e);
    return MENSAGEM_FALHA.indisponivel;
  }
  return r.ok ? null : MENSAGEM_FALHA[r.motivo];
}

/* ---------- Rascunho neste aparelho ---------- */

const chaveRascunho = (propostaId: string) => `simula-redacao-${propostaId}`;

export function lerRascunho(propostaId: string) {
  try {
    return localStorage.getItem(chaveRascunho(propostaId)) ?? "";
  } catch {
    return "";
  }
}

export function salvarRascunhoLocal(propostaId: string, texto: string) {
  try {
    if (texto.trim()) localStorage.setItem(chaveRascunho(propostaId), texto);
    else localStorage.removeItem(chaveRascunho(propostaId));
    return true;
  } catch {
    return false;
  }
}

/* ---------- Coordenação ---------- */

export interface RedacaoPainel extends RedacaoResumo {
  estudanteId: string;
  estudante: string;
  polo: string | null;
}

/** Redações mais recentes que a coordenação pode ver (o RLS limita ao polo do coordenador). */
export async function redacoesRecentes(limite = 200): Promise<RedacaoPainel[]> {
  const { data, error } = await supabase
    .from("redacoes")
    .select(`${CAMPOS_RESUMO}, estudante_id, estudante:perfis(nome, polo:polos(nome))`)
    .order("created_at", { ascending: false })
    .limit(limite);
  falhou(error);
  return (
    (data ?? []) as unknown as (LinhaRedacao & {
      estudante_id: string;
      estudante: { nome: string; polo: { nome: string } | null } | null;
    })[]
  ).map((r) => ({
    ...resumo(r),
    estudanteId: r.estudante_id,
    estudante: r.estudante?.nome ?? "Estudante",
    polo: r.estudante?.polo?.nome ?? null,
  }));
}
