import { createFileRoute } from "@tanstack/react-router";
import { Prova } from "@/components/prova/prova";
import { paginaHead } from "@/lib/pagina-head";
import { ExigeLogin } from "@/lib/sessao";
export const Route = createFileRoute("/prova/$id")({
  head: () => paginaHead("Simulado"),
  component: Pagina,
});
function Pagina() {
  return (
    <ExigeLogin>
      <Prova id={Route.useParams().id} />
    </ExigeLogin>
  );
}
