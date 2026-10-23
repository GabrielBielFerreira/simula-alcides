import { createFileRoute } from "@tanstack/react-router";
import { Cadastro } from "@/components/conta/cadastro";
import { paginaHead } from "@/lib/pagina-head";

export const Route = createFileRoute("/cadastro")({
  head: () => paginaHead("Criar conta"),
  component: Cadastro,
});
