import { createFileRoute } from "@tanstack/react-router";
import { PainelPolo } from "@/components/admin/painel";
import { SemAcessoPolo, usePapelCoordenacao } from "@/components/admin/ui";
import { NaoEncontrado } from "@/components/app/shared";
import { paginaHead } from "@/lib/pagina-head";
import { buscarPolo } from "@/data/coordenacao";

export const Route = createFileRoute("/admin/polos/$poloId")({
  head: ({ params }) => paginaHead(buscarPolo(params.poloId)?.nome ?? "Por Compaz"),
  component: Pagina,
});

/**
 * O HTML do servidor já sai com a visão do papel padrão (coordenação central). Se o papel salvo
 * for o do polo, a troca acontece ao ler o papel (no projeto final, ele vem da sessão).
 */
function Pagina() {
  const { poloId } = Route.useParams();
  const { podeVerPolo } = usePapelCoordenacao();
  const polo = buscarPolo(poloId);
  if (!polo) return <NaoEncontrado destino="/admin" />;
  if (!podeVerPolo(polo.id)) return <SemAcessoPolo />;
  return <PainelPolo poloId={polo.id} />;
}
