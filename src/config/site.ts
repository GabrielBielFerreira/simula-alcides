// Valores padrão. Na Etapa 1 o nome e o subtítulo passam a vir da tabela
// `configuracoes`, editável pela administração sem mexer no código.
export const site = {
  nome: "Simula Alcides",
  subtitulo: "Seu futuro começa com a próxima questão.",
  rede: "Rede de Cursinhos Populares Alcides Nascimento",
  descricao:
    "Simulados do ENEM gratuitos, com acompanhamento da sua evolução, para estudantes da Rede Alcides Nascimento e de qualquer cursinho.",
};

// Lista exibida na página inicial enquanto o banco não está conectado.
// A fonte oficial é a tabela `polos` (supabase/seed.sql).
export const polosIniciais = [
  { nome: "Compaz Paulo Freire", bairro: "Ibura" },
  { nome: "Compaz Governador Eduardo Campos", bairro: "Alto Santa Terezinha" },
  { nome: "Compaz Escritor Ariano Suassuna", bairro: "Cordeiro" },
  { nome: "Compaz Dom Helder Câmara", bairro: "Coque" },
  { nome: "Compaz Miguel Arraes", bairro: "Caxangá" },
  { nome: "Compaz Lêda Alves", bairro: "Pina" },
];
