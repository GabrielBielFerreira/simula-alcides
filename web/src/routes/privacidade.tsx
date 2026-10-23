import { createFileRoute } from "@tanstack/react-router";
import { Privacidade } from "@/components/conta/privacidade";
import { paginaHead } from "@/lib/pagina-head";

export const Route = createFileRoute("/privacidade")({
  head: () => paginaHead("Política de privacidade"),
  component: Privacidade,
});
