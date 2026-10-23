import { createFileRoute } from "@tanstack/react-router";
import { NovaSenha } from "@/components/conta/nova-senha";
import { paginaHead } from "@/lib/pagina-head";

export const Route = createFileRoute("/nova-senha")({
  head: () => paginaHead("Nova senha"),
  component: NovaSenha,
});
