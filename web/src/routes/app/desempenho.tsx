import { createFileRoute } from "@tanstack/react-router";
import { DesempenhoReal } from "@/components/app/real";
import { paginaHead } from "@/lib/pagina-head";

export const Route = createFileRoute("/app/desempenho")({
  head: () => paginaHead("Desempenho"),
  component: DesempenhoReal,
});
