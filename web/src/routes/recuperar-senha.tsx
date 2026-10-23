import { createFileRoute } from "@tanstack/react-router";
import { RecuperarSenha } from "@/components/conta/recuperar-senha";
import { paginaHead } from "@/lib/pagina-head";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => paginaHead("Recuperar senha"),
  component: RecuperarSenha,
});
