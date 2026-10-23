import { createFileRoute } from "@tanstack/react-router";
import { EmBreveAdmin } from "@/components/admin/painel";
import { paginaHead } from "@/lib/pagina-head";

export const Route = createFileRoute("/admin/redacoes")({
  head: () => paginaHead("Redações"),
  component: EmBreveAdmin,
});
