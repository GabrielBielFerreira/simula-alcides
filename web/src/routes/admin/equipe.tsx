import { createFileRoute } from "@tanstack/react-router";
import { PainelEquipe } from "@/components/admin/equipe";
import { paginaHead } from "@/lib/pagina-head";

export const Route = createFileRoute("/admin/equipe")({
  head: () => paginaHead("Equipe"),
  component: PainelEquipe,
});
