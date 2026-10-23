export type AreaId = "linguagens" | "humanas" | "natureza" | "matematica";

export interface Area {
  id: AreaId;
  nome: string;
  nomeCurto: string;
  questoes: number;
}

export interface Polo {
  nomeCurto: string;
  id: string;
  nome: string;
  bairro: string;
}

export interface Faq {
  pergunta: string;
  resposta: string;
}

export interface Passo {
  titulo: string;
  texto: string;
  itens?: string[];
}

export interface Modalidade {
  titulo: string;
  descricao: string;
  emBreve?: boolean;
}

export interface Estudante {
  nome: string;
  email: string;
  dataNascimento: string; // AAAA-MM-DD
}

export type StatusQuestao = "acerto" | "erro" | "branco" | "revisao";

export interface ResultadoArea {
  area: AreaId;
  acertos: number;
  erros: number;
  brancos: number;
}

export interface ResumoPolo {
  poloId: string;
  estudantes: number;
  simuladosFeitos: number;
  percentualAcerto: number;
  areaReforco: AreaId;
}
