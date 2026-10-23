import { createFileRoute } from "@tanstack/react-router";
import { RedacaoInicio } from "@/components/app/redacao";
import { paginaHead } from "@/lib/pagina-head";

export const Route = createFileRoute("/app/redacao/")({
  head: () => paginaHead("Redação"),
  component: RedacaoInicio,
});
