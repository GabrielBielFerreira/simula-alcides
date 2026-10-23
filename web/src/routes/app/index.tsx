import { createFileRoute } from "@tanstack/react-router";
import { InicioReal } from "@/components/app/real";
import { paginaHead } from "@/lib/pagina-head";
export const Route = createFileRoute("/app/")({
  head: () => paginaHead("Início"),
  component: Pagina,
});
function Pagina() {
  return <InicioReal />;
}
