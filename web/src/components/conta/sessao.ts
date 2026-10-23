/**
 * Dados do cadastro guardados no aparelho para as boas-vindas.
 * Só chame estas funções em eventos ou dentro de useEffect (nunca na renderização).
 */

const CHAVE_CADASTRO = "simula-cadastro";

export interface DadosCadastro {
  nome: string;
  /** AAAA-MM-DD */
  dataNascimento: string;
}

export function guardarCadastro(dados: DadosCadastro) {
  try {
    sessionStorage.setItem(CHAVE_CADASTRO, JSON.stringify(dados));
  } catch {
    // Sem armazenamento (aba anônima, por exemplo): as boas-vindas usam os dados da Maria.
  }
}

export function lerCadastro(): DadosCadastro | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE_CADASTRO);
    if (!bruto) return null;
    const dados: unknown = JSON.parse(bruto);
    if (
      dados &&
      typeof dados === "object" &&
      "nome" in dados &&
      "dataNascimento" in dados &&
      typeof dados.nome === "string" &&
      typeof dados.dataNascimento === "string"
    ) {
      return { nome: dados.nome, dataNascimento: dados.dataNascimento };
    }
  } catch {
    // Valor corrompido: segue como se não houvesse cadastro.
  }
  return null;
}
