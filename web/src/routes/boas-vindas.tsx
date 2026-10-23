import { createFileRoute } from "@tanstack/react-router";
import { BoasVindas } from "@/components/conta/boas-vindas";
import { paginaHead } from "@/lib/pagina-head";
import { ExigeLogin } from "@/lib/sessao";

export const Route = createFileRoute("/boas-vindas")({
  head: () => paginaHead("Boas-vindas"),
  component: Pagina,
});

function Pagina() {
  return (
    <ExigeLogin>
      <BoasVindas />
    </ExigeLogin>
  );
}
