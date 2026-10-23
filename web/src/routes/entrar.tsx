import { createFileRoute } from "@tanstack/react-router";
import { Entrar } from "@/components/conta/entrar";
import { paginaHead } from "@/lib/pagina-head";

export const Route = createFileRoute("/entrar")({
  head: () => paginaHead("Entrar"),
  component: Entrar,
});
