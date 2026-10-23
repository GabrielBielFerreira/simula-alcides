import { createFileRoute } from "@tanstack/react-router";
import { ResultadoReal } from "@/components/app/real";
import { paginaHead } from "@/lib/pagina-head";
export const Route = createFileRoute("/app/resultado/$id")({
  head: () => paginaHead("Resultado do simulado"),
  component: Pagina,
});
function Pagina() {
  return <ResultadoReal id={Route.useParams().id} />;
}
