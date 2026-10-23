/**
 * Equipe da coordenação: quem pode abrir o painel. Só administradores leem e mudam (o banco
 * confere o papel em cada função).
 */
import type { PapelPerfil } from "./sessao";
import { supabase } from "./supabase";

export interface PessoaEquipe {
  id: string;
  nome: string;
  email: string | null;
  papel: PapelPerfil;
  poloId: string | null;
  poloNome: string | null;
}

interface LinhaPessoa {
  id: string;
  nome: string;
  email: string | null;
  papel: PapelPerfil;
  polo_id?: string | null;
  polo_nome: string | null;
}

const paraPessoa = (p: LinhaPessoa): PessoaEquipe => ({
  id: p.id,
  nome: p.nome,
  email: p.email,
  papel: p.papel,
  poloId: p.polo_id ?? null,
  poloNome: p.polo_nome,
});

export async function buscarEquipe(): Promise<PessoaEquipe[]> {
  const { data, error } = await supabase.rpc("equipe_coordenacao");
  if (error) throw new Error(error.message);
  return (data as LinhaPessoa[]).map(paraPessoa);
}

export async function buscarPessoas(termo: string): Promise<PessoaEquipe[]> {
  const { data, error } = await supabase.rpc("buscar_pessoas", { p_termo: termo });
  if (error) throw new Error(error.message);
  return (data as LinhaPessoa[]).map(paraPessoa);
}

export async function definirPapel(pessoaId: string, papel: "estudante" | "coord_polo" | "admin") {
  const { error } = await supabase.rpc("definir_papel", { p_pessoa: pessoaId, p_papel: papel });
  if (error) throw new Error(error.message);
}

export const NOME_PAPEL: Record<PapelPerfil, string> = {
  admin: "Administração da Rede",
  coord_polo: "Coordenação do Compaz",
  professor: "Professor",
  estudante: "Estudante",
};
