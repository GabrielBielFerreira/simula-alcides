import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/layout";
import { paginaHead } from "@/lib/pagina-head";

export const Route = createFileRoute("/admin")({
  head: () => paginaHead("Coordenação"),
  component: AdminLayout,
});
