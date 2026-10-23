import { createFileRoute } from "@tanstack/react-router";
import { CatalogoReal } from "@/components/app/real";
import { paginaHead } from "@/lib/pagina-head";
export const Route = createFileRoute("/app/simulados/")({
  head: () => paginaHead("Simulados"),
  component: Pagina,
});
function Pagina() {
  return <CatalogoReal />;
}
