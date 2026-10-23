import { createFileRoute } from "@tanstack/react-router";
import { PainelEstudantes } from "@/components/admin/painel";
import { paginaHead } from "@/lib/pagina-head";

export const Route = createFileRoute("/admin/estudantes/")({
  head: () => paginaHead("Estudantes"),
  component: PainelEstudantes,
});
