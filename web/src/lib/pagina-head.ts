/**
 * Cabeçalho (<title> e metas) de cada rota. Módulo sem dependências: as rotas importam daqui
 * para o trecho de rota não puxar componentes (nem o Recharts) junto.
 */
export function paginaHead(
  titulo: string,
  descricao = `${titulo} no Simula Alcides. Simulados gratuitos da Rede de Cursinhos Populares Alcides Nascimento.`,
) {
  return {
    meta: [
      { title: `${titulo} · Simula Alcides` },
      { name: "description", content: descricao },
      { property: "og:title", content: `${titulo} · Simula Alcides` },
      { property: "og:description", content: descricao },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}
