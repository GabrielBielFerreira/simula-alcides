import { createFileRoute } from "@tanstack/react-router";
import { RedacoesAdmin } from "@/components/admin/redacoes";
import { paginaHead } from "@/lib/pagina-head";

export const Route = createFileRoute("/admin/redacoes")({
  head: () => paginaHead("Redações"),
  component: RedacoesAdmin,
});
