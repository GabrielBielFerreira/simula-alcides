import { createFileRoute } from "@tanstack/react-router";
import { RedacaoDetalhe } from "@/components/app/redacao-detalhe";
import { paginaHead } from "@/lib/pagina-head";

export const Route = createFileRoute("/app/redacao/$id")({
  head: () => paginaHead("Redação"),
  component: Pagina,
});

function Pagina() {
  return <RedacaoDetalhe id={Route.useParams().id} />;
}
