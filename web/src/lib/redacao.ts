/**
 * Redação no banco: propostas, envio (fotos da folha), histórico e devolutivas. A correção em
 * si roda no servidor (`correcao-ia.ts`).
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
  /** Fotos da folha (caminhos no Storage), quando a redação foi escrita à mão. */
  fotos: string[];
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
  fotos?: string[];
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
      "id, proposta_id, status, enviada_em, created_at, texto, palavras, fotos, proposta:propostas_redacao(titulo), correcoes:correcoes_redacao(nota_total, competencias, trechos, plano, modelo, created_at)",
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
    fotos: r.fotos ?? [],
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
  limite_diario: "Você já enviou 3 redações hoje. Amanhã tem mais! Guarde a sua folha.",
  proposta_inexistente: "Essa proposta não está mais disponível.",
  sem_login: "Sua sessão expirou. Entre de novo para enviar.",
  fotos_invalidas: "Não achamos a foto da folha. Tire a foto de novo.",
  trocas_esgotadas:
    "Você já trocou as fotos desta redação algumas vezes. Envie uma redação nova com uma foto mais nítida.",
  ja_corrigida: "Esta redação já foi corrigida.",
};

const mensagemDeErro = (error: { message: string }) => {
  const chave = Object.keys(ERROS_ENVIO).find((k) => error.message.includes(k));
  return chave
    ? ERROS_ENVIO[chave]
    : "Não deu para enviar agora. Confira a internet e tente de novo.";
};

/** Envia as fotos da folha e cria a redação; devolve o id. Lança com mensagem para a tela. */
export async function enviarRedacaoFoto(propostaId: string, arquivos: File[]): Promise<string> {
  const fotos = await enviarFotos(arquivos);
  const { data, error } = await supabase.rpc("enviar_redacao_foto", {
    p_proposta: propostaId,
    p_fotos: fotos,
  });
  if (error) throw new Error(mensagemDeErro(error));
  return data as string;
}

/** Troca as fotos de uma redação que a IA não conseguiu ler. Lança com mensagem para a tela. */
export async function trocarFotosRedacao(redacaoId: string, arquivos: File[]) {
  const fotos = await enviarFotos(arquivos);
  const { error } = await supabase.rpc("trocar_fotos_redacao", {
    p_redacao: redacaoId,
    p_fotos: fotos,
  });
  if (error) throw new Error(mensagemDeErro(error));
}

export interface FalhaCorrecao {
  mensagem: string;
  /** A IA não conseguiu ler a foto: a tela oferece tirar outra. */
  ilegivel: boolean;
}

/** Pede a correção ao servidor. Devolve null se deu certo ou a falha para mostrar na tela. */
export async function corrigirRedacao(redacaoId: string): Promise<FalhaCorrecao | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { mensagem: MENSAGEM_FALHA.sem_login, ilegivel: false };
  let r: ResultadoCorrecao;
  try {
    r = await pedirCorrecao({ data: { token, redacaoId } });
  } catch (e) {
    console.error(e);
    return { mensagem: MENSAGEM_FALHA.indisponivel, ilegivel: false };
  }
  if (r.ok) return null;
  if (r.motivo === "ilegivel")
    return {
      mensagem: r.aviso
        ? `A IA não conseguiu ler a sua folha: ${r.aviso}`
        : MENSAGEM_FALHA.ilegivel,
      ilegivel: true,
    };
  return { mensagem: MENSAGEM_FALHA[r.motivo], ilegivel: false };
}

/* ---------- Redação escrita à mão (foto da folha) ---------- */

const BUCKET_FOTOS = "redacoes-fotos";

/** Reduz a foto (lado maior até 2000 px, JPEG) para enviar rápido pelo 4G. */
async function reduzirFoto(arquivo: File): Promise<Blob> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const escala = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * escala);
    canvas.height = Math.round(img.naturalHeight * escala);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    if (!blob) throw new Error("sem blob");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Envia as fotos da folha para a pasta do estudante; devolve os caminhos no Storage. */
async function enviarFotos(arquivos: File[]): Promise<string[]> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new Error(ERROS_ENVIO.sem_login);
  const caminhos: string[] = [];
  for (const arquivo of arquivos) {
    let corpo: Blob;
    try {
      corpo = await reduzirFoto(arquivo);
    } catch {
      throw new Error("Não deu para abrir uma das fotos. Tire a foto de novo ou escolha outra.");
    }
    const caminho = `${uid}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from(BUCKET_FOTOS)
      .upload(caminho, corpo, { contentType: "image/jpeg" });
    if (error) {
      console.error(error);
      throw new Error("A foto não subiu. Confira a internet e tente de novo.");
    }
    caminhos.push(caminho);
  }
  return caminhos;
}

/** Links temporários (1 hora) para mostrar as fotos da folha. */
export async function linksDasFotos(fotos: string[]): Promise<string[]> {
  if (!fotos.length) return [];
  const { data, error } = await supabase.storage.from(BUCKET_FOTOS).createSignedUrls(fotos, 3600);
  falhou(error);
  return (data ?? []).map((d) => d.signedUrl).filter((u): u is string => Boolean(u));
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
