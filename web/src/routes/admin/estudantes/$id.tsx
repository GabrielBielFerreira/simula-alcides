import { createFileRoute } from "@tanstack/react-router";
import { FichaEstudanteAdmin } from "@/components/admin/painel";
import { paginaHead } from "@/lib/pagina-head";

export const Route = createFileRoute("/admin/estudantes/$id")({
  head: () => paginaHead("Ficha do estudante"),
  component: Pagina,
});

function Pagina() {
  const { id } = Route.useParams();
  return <FichaEstudanteAdmin id={id} />;
}
