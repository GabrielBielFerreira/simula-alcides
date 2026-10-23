/**
 * Acesso ao banco (Supabase). O gabarito nunca chega ao navegador durante a prova: as questões
 * vêm de `questoes_da_tentativa` e a correção de `entregar_tentativa` / `resultado_da_tentativa`.
 */
import type { AreaId } from "@/data/types";
import { supabase } from "./supabase";

export const AREA_DO_CODIGO: Record<string, AreaId> = {
  LC: "linguagens",
  CH: "humanas",
  CN: "natureza",
  MT: "matematica",
};
const ORDEM_AREA: AreaId[] = ["linguagens", "humanas", "natureza", "matematica"];
export const LETRAS = ["A", "B", "C", "D", "E"] as const;
export type Letra = (typeof LETRAS)[number];

function falhou(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message);
}

export function duracaoPorExtenso(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/* ---------- Catálogo ---------- */

export interface SimuladoReal {
  id: string;
  titulo: string;
  instrucoes: string | null;
  modalidade: string;
  duracaoMin: number;
  duracao: string;
  questoes: number;
  areas: AreaId[];
  tentativaId: string | null;
  status: "em_andamento" | "entregue" | "expirada" | null;
  percentual: number | null;
}

interface LinhaCatalogo {
  id: string;
  titulo: string;
  instrucoes: string | null;
  modalidade: string;
  duracao_min: number;
  total_questoes: number;
  areas: string[] | null;
  tentativa_id: string | null;
  tentativa_status: SimuladoReal["status"];
  percentual: number | null;
}

export async function buscarCatalogo(): Promise<SimuladoReal[]> {
  const { data, error } = await supabase.rpc("catalogo_simulados");
  falhou(error);
  return (data as LinhaCatalogo[]).map((s) => ({
    id: s.id,
    titulo: s.titulo,
    instrucoes: s.instrucoes,
    modalidade: s.total_questoes <= 30 ? "Rápido" : "Completo",
    duracaoMin: s.duracao_min,
    duracao: duracaoPorExtenso(s.duracao_min),
    questoes: s.total_questoes,
    areas: ORDEM_AREA.filter((a) => (s.areas ?? []).some((c) => AREA_DO_CODIGO[c] === a)),
    tentativaId: s.tentativa_id,
    status: s.tentativa_status,
    percentual: s.percentual === null ? null : Number(s.percentual),
  }));
}

/* ---------- Prova ---------- */

export interface QuestaoProva {
  /** Número na prova (1, 2, 3…). */
  id: number;
  versaoId: string;
  area: AreaId;
  texto: string;
  enunciado: string;
  imagem: string | null;
  alternativas: string[];
}

/** Separa o texto-base do comando: o comando é o último parágrafo do enunciado. */
function separarEnunciado(completo: string) {
  const corte = completo.lastIndexOf("\n\n");
  if (corte < 0) return { texto: "", enunciado: completo.trim() };
  return {
    texto: completo.slice(0, corte).trim(),
    enunciado: completo
      .slice(corte + 2)
      .replace(/\n/g, " ")
      .trim(),
  };
}

export interface ProvaCarregada {
  tentativaId: string;
  simulado: SimuladoReal;
  prazo: number;
  questoes: QuestaoProva[];
  respostas: Record<number, number>;
  marcadas: number[];
  entregue: boolean;
}

export async function abrirProva(simuladoId: string): Promise<ProvaCarregada> {
  const catalogo = await buscarCatalogo();
  const simulado = catalogo.find((s) => s.id === simuladoId);
  if (!simulado) throw new Error("Simulado não encontrado.");
  const { data: tentativaId, error } = await supabase.rpc("iniciar_tentativa", {
    p_simulado: simuladoId,
  });
  falhou(error);
  const [qs, tentativa, resps] = await Promise.all([
    supabase.rpc("questoes_da_tentativa", { p_tentativa: tentativaId }),
    supabase.from("tentativas").select("prazo_em, status").eq("id", tentativaId).single(),
    supabase
      .from("respostas")
      .select("questao_versao_id, alternativa, marcada_revisao")
      .eq("tentativa_id", tentativaId),
  ]);
  falhou(qs.error);
  falhou(tentativa.error);
  falhou(resps.error);
  const questoes: QuestaoProva[] = (
    qs.data as {
      ordem: number;
      questao_versao_id: string;
      area: string;
      enunciado: string;
      imagem_path: string | null;
      alternativas: Record<Letra, string>;
    }[]
  ).map((q, i) => ({
    id: i + 1,
    versaoId: q.questao_versao_id,
    area: AREA_DO_CODIGO[q.area],
    ...separarEnunciado(q.enunciado),
    imagem: q.imagem_path,
    alternativas: LETRAS.map((l) => q.alternativas[l]),
  }));
  const porVersao = new Map(questoes.map((q) => [q.versaoId, q.id]));
  const respostas: Record<number, number> = {};
  const marcadas: number[] = [];
  for (const r of resps.data as {
    questao_versao_id: string;
    alternativa: Letra | null;
    marcada_revisao: boolean;
  }[]) {
    const n = porVersao.get(r.questao_versao_id);
    if (!n) continue;
    if (r.alternativa) respostas[n] = LETRAS.indexOf(r.alternativa);
    if (r.marcada_revisao) marcadas.push(n);
  }
  return {
    tentativaId,
    simulado,
    prazo: new Date(tentativa.data.prazo_em).getTime(),
    questoes,
    respostas,
    marcadas,
    entregue: tentativa.data.status !== "em_andamento",
  };
}

export async function salvarResposta(
  tentativaId: string,
  versaoId: string,
  alternativa: number | null,
  marcada: boolean,
) {
  const { error } = await supabase.from("respostas").upsert({
    tentativa_id: tentativaId,
    questao_versao_id: versaoId,
    alternativa: alternativa === null ? null : LETRAS[alternativa],
    marcada_revisao: marcada,
    atualizada_em: new Date().toISOString(),
  });
  falhou(error);
}

export async function entregarProva(tentativaId: string) {
  const { error } = await supabase.rpc("entregar_tentativa", { p_tentativa: tentativaId });
  falhou(error);
}

/* ---------- Resultado ---------- */

export interface Tentativa {
  id: string;
  simuladoId: string;
  titulo: string;
  status: "em_andamento" | "entregue" | "expirada";
  iniciadaEm: string;
  entregueEm: string | null;
  total: number | null;
  acertos: number | null;
  erros: number | null;
  emBranco: number | null;
  percentual: number | null;
}

interface LinhaTentativa {
  id: string;
  simulado_id: string;
  status: Tentativa["status"];
  iniciada_em: string;
  entregue_em: string | null;
  total: number | null;
  acertos: number | null;
  erros: number | null;
  em_branco: number | null;
  percentual: number | null;
  simulado: { titulo: string } | null;
}

const CAMPOS_TENTATIVA =
  "id, simulado_id, status, iniciada_em, entregue_em, total, acertos, erros, em_branco, percentual, simulado:simulados(titulo)";

const paraTentativa = (t: LinhaTentativa): Tentativa => ({
  id: t.id,
  simuladoId: t.simulado_id,
  titulo: t.simulado?.titulo ?? "Simulado",
  status: t.status,
  iniciadaEm: t.iniciada_em,
  entregueEm: t.entregue_em,
  total: t.total,
  acertos: t.acertos,
  erros: t.erros,
  emBranco: t.em_branco,
  percentual: t.percentual === null ? null : Number(t.percentual),
});

export async function minhasTentativas(usuarioId: string): Promise<Tentativa[]> {
  const { data, error } = await supabase
    .from("tentativas")
    .select(CAMPOS_TENTATIVA)
    .eq("estudante_id", usuarioId)
    .order("iniciada_em", { ascending: false });
  falhou(error);
  return (data as unknown as LinhaTentativa[]).map(paraTentativa);
}

export interface QuestaoCorrigida extends QuestaoProva {
  resposta: number | null;
  gabarito: number;
}

export async function buscarResultado(tentativaId: string) {
  const [t, qs] = await Promise.all([
    supabase.from("tentativas").select(CAMPOS_TENTATIVA).eq("id", tentativaId).maybeSingle(),
    supabase.rpc("resultado_da_tentativa", { p_tentativa: tentativaId }),
  ]);
  falhou(t.error);
  falhou(qs.error);
  if (!t.data) return null;
  const questoes: QuestaoCorrigida[] = (
    qs.data as {
      ordem: number;
      area: string;
      enunciado: string;
      imagem_path: string | null;
      alternativas: Record<Letra, string>;
      resposta: Letra | null;
      gabarito: Letra;
    }[]
  ).map((q, i) => ({
    id: i + 1,
    versaoId: String(q.ordem),
    area: AREA_DO_CODIGO[q.area],
    ...separarEnunciado(q.enunciado),
    imagem: q.imagem_path,
    alternativas: LETRAS.map((l) => q.alternativas[l]),
    resposta: q.resposta ? LETRAS.indexOf(q.resposta) : null,
    gabarito: LETRAS.indexOf(q.gabarito),
  }));
  return { tentativa: paraTentativa(t.data as unknown as LinhaTentativa), questoes };
}

/* ---------- Conta ---------- */

export async function buscarPolos() {
  const { data, error } = await supabase
    .from("polos")
    .select("id, nome, bairro")
    .eq("ativo", true)
    .order("ordem");
  falhou(error);
  return data as { id: string; nome: string; bairro: string }[];
}

export async function atualizarMeuPerfil(dados: {
  nome?: string;
  dataNascimento?: string | null;
  vinculo: "rede" | "outro_cursinho" | "independente";
  poloId?: string | null;
  cursinhoExterno?: string | null;
}) {
  const { error } = await supabase.rpc("atualizar_meu_perfil", {
    p_nome: dados.nome ?? null,
    p_data_nascimento: dados.dataNascimento || null,
    p_vinculo: dados.vinculo,
    p_polo: dados.poloId ?? null,
    p_cursinho_externo: dados.cursinhoExterno ?? null,
  });
  falhou(error);
}

/* ---------- Coordenação ---------- */

export interface ResumoPoloReal {
  poloId: string;
  nome: string;
  bairro: string;
  estudantes: number;
  ativos: number;
  provas: number;
  media: number | null;
}

export async function painelPolos(): Promise<ResumoPoloReal[]> {
  const { data, error } = await supabase.rpc("painel_polos");
  falhou(error);
  return (
    data as {
      polo_id: string;
      nome: string;
      bairro: string;
      estudantes: number;
      ativos: number;
      provas_entregues: number;
      media_percentual: number | null;
    }[]
  ).map((p) => ({
    poloId: p.polo_id,
    nome: p.nome,
    bairro: p.bairro,
    estudantes: p.estudantes,
    ativos: p.ativos,
    provas: p.provas_entregues,
    media: p.media_percentual === null ? null : Number(p.media_percentual),
  }));
}

export interface EstudantePainel {
  id: string;
  nome: string;
  poloId: string | null;
  vinculo: string;
  cadastradoEm: string;
  provas: number;
  media: number | null;
  ultimaProva: string | null;
}

export async function painelEstudantes(poloId: string | null): Promise<EstudantePainel[]> {
  const { data, error } = await supabase.rpc("painel_estudantes", { p_polo: poloId });
  falhou(error);
  return (
    data as {
      estudante_id: string;
      nome: string;
      polo_id: string | null;
      vinculo: string;
      cadastrado_em: string;
      provas_entregues: number;
      media_percentual: number | null;
      ultima_prova: string | null;
    }[]
  ).map((e) => ({
    id: e.estudante_id,
    nome: e.nome,
    poloId: e.polo_id,
    vinculo: e.vinculo,
    cadastradoEm: e.cadastrado_em,
    provas: e.provas_entregues,
    media: e.media_percentual === null ? null : Number(e.media_percentual),
    ultimaProva: e.ultima_prova,
  }));
}

export const dataCurta = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Recife",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));

/** Login com Google: sai para o Google e volta para /app (que leva às boas-vindas se preciso). */
export async function entrarComGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/app` },
  });
  if (error) throw error;
  // O navegador sai da página; segura o botão em "enviando" até lá.
  await new Promise(() => {});
}

/** Os polos do protótipo usam apelidos; o banco usa uuid. */
export const POLO_UUID: Record<string, string> = {
  "paulo-freire": "80095e2d-5960-476a-9a6e-1ef0786db733",
  "eduardo-campos": "1981cf1d-c0c4-499a-b2d5-21a922155496",
  "ariano-suassuna": "07e4309a-97d5-4ac9-8be9-3fcf15f46b41",
  "dom-helder": "37c7f6d3-5743-4a63-bdf7-527249dab9e5",
  "miguel-arraes": "8768d8ae-b027-4256-b7df-6d867355f984",
  "leda-alves": "75b66134-970f-4443-9183-a4d04480edf9",
};
export const POLO_APELIDO: Record<string, string> = Object.fromEntries(
  Object.entries(POLO_UUID).map(([a, u]) => [u, a]),
);
