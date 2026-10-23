import { AGORA_DEMO } from "./tempo";
/** Idade completa em anos numa data de referência. */
export function idadeEm(dataNascimento: string, hoje: Date = AGORA_DEMO): number {
  const [a = 0, m = 1, d = 1] = dataNascimento.split("-").map(Number);
  let idade = hoje.getFullYear() - a;
  const mes = hoje.getMonth() + 1;
  if (mes < m || (mes === m && hoje.getDate() < d)) idade--;
  return idade;
}

/** Menores de 18 anos precisam do passo de ciência do responsável. */
export function ehMenorDeIdade(dataNascimento: string, hoje: Date = AGORA_DEMO): boolean {
  return idadeEm(dataNascimento, hoje) < 18;
}
