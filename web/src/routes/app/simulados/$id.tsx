import { createFileRoute } from "@tanstack/react-router";
import { InstrucoesReal } from "@/components/app/real";
import { paginaHead } from "@/lib/pagina-head";
export const Route = createFileRoute("/app/simulados/$id")({
  head: () => paginaHead("Instruções do simulado"),
  component: Pagina,
});
function Pagina() {
  return <InstrucoesReal id={Route.useParams().id} />;
}
