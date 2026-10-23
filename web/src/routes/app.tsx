import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app/layout";
import { paginaHead } from "@/lib/pagina-head";
export const Route = createFileRoute("/app")({
  head: () => paginaHead("Área do estudante"),
  component: Pagina,
});
function Pagina() {
  return <AppLayout />;
}
