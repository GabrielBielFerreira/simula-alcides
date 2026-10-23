import { createFileRoute } from "@tanstack/react-router";
import { RedacaoEmBreve } from "@/components/app/real";
import { paginaHead } from "@/lib/pagina-head";

export const Route = createFileRoute("/app/redacao/")({
  head: () => paginaHead("Redação"),
  component: RedacaoEmBreve,
});
