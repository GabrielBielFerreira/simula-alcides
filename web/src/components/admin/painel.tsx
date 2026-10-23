/**
 * Acompanhamento da coordenação com os dados reais do banco: resumo da Rede (por Compaz) e
 * a lista de estudantes de cada polo.
 */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ClipboardCheck, MapPin, Search, Users } from "lucide-react";
import { Carregando, EstadoVazio } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { formato } from "@/components/app/shared";
import { buscarPolo } from "@/data/coordenacao";
import { POLO_APELIDO, POLO_UUID, dataCurta, painelEstudantes, painelPolos } from "@/lib/dados";
import { CabecalhoAdmin, StatCard } from "./ui";

const media = (v: number | null) => (v === null ? "—" : `${formato(v)}%`);

function Erro({ erro }: { erro: unknown }) {
  return (
    <EstadoVazio
      titulo="Não foi possível carregar"
      texto={erro instanceof Error ? erro.message : "Tente de novo em instantes."}
      acao={<Button onClick={() => window.location.reload()}>Tentar de novo</Button>}
    />
  );
}

/** /admin · coordenação central: a Rede inteira. */
export function PainelRede() {
  const polos = useQuery({ queryKey: ["painel-polos"], queryFn: painelPolos });
  const estudantes = useQuery({
    queryKey: ["painel-estudantes", null],
    queryFn: () => painelEstudantes(null),
  });
  if (polos.error || estudantes.error) return <Erro erro={polos.error ?? estudantes.error} />;
  if (!polos.data || !estudantes.data) return <Carregando texto="Carregando a Rede…" />;

  const todos = estudantes.data;
  const fora = todos.filter((e) => !e.poloId);
  const provas = todos.reduce((n, e) => n + e.provas, 0);
  const comMedia = todos.filter((e) => e.media !== null);
  const mediaGeral = comMedia.length
    ? Math.round((comMedia.reduce((n, e) => n + (e.media ?? 0), 0) / comMedia.length) * 10) / 10
    : null;

  return (
    <>
      <CabecalhoAdmin
        sobretitulo="Rede Alcides Nascimento"
        titulo="Visão geral"
        subtitulo="Estudantes cadastrados e simulados entregues no Simula Alcides."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard rotulo="Estudantes cadastrados" valor={todos.length} icone={Users} />
        <StatCard rotulo="Simulados entregues" valor={provas} icone={ClipboardCheck} />
        <StatCard
          rotulo="Média de acertos"
          valor={media(mediaGeral)}
          detalhe="Média dos estudantes que já entregaram"
        />
      </div>

      <h2 className="mb-4 mt-10 text-2xl font-bold">Por Compaz</h2>
      <ul className="grid gap-3 md:grid-cols-2">
        {polos.data.map((p) => {
          const apelido = POLO_APELIDO[p.poloId];
          return (
            <li key={p.poloId}>
              <Link
                to="/admin/polos/$poloId"
                params={{ poloId: apelido }}
                className="cartao flex items-center gap-4 p-5 transition-colors hover:bg-creme/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.nome}</p>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-3.5" aria-hidden />
                    {p.bairro}
                  </p>
                  <p className="mt-2 text-sm">
                    {formato(p.estudantes)} estudantes · {formato(p.provas)} simulados entregues ·
                    média {media(p.media)}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>

      <h2 className="mb-2 mt-10 text-2xl font-bold">Fora da Rede</h2>
      <p className="text-muted-foreground">
        {formato(fora.length)} estudantes de outros cursinhos ou estudando por conta própria.
      </p>
    </>
  );
}

/** /admin/polos/$poloId · estudantes de um Compaz. */
export function PainelPolo({ poloId }: { poloId: string }) {
  const polo = buscarPolo(poloId);
  const uuid = POLO_UUID[poloId];
  const [busca, setBusca] = useState("");
  const consulta = useQuery({
    queryKey: ["painel-estudantes", uuid],
    queryFn: () => painelEstudantes(uuid),
  });
  const lista = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return (consulta.data ?? []).filter((e) => e.nome.toLocaleLowerCase("pt-BR").includes(termo));
  }, [consulta.data, busca]);

  return (
    <>
      <CabecalhoAdmin
        sobretitulo="Por Compaz"
        titulo={polo?.nome ?? "Polo"}
        subtitulo={polo?.bairro}
      />
      {consulta.error ? (
        <Erro erro={consulta.error} />
      ) : !consulta.data ? (
        <Carregando texto="Carregando estudantes…" />
      ) : consulta.data.length === 0 ? (
        <EstadoVazio
          icon={Users}
          titulo="Nenhum estudante ainda"
          texto="Quando estudantes deste Compaz criarem a conta, eles aparecem aqui."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard rotulo="Estudantes" valor={consulta.data.length} icone={Users} />
            <StatCard
              rotulo="Já fizeram simulado"
              valor={consulta.data.filter((e) => e.provas > 0).length}
              sufixo={`de ${consulta.data.length}`}
            />
            <StatCard
              rotulo="Simulados entregues"
              valor={consulta.data.reduce((n, e) => n + e.provas, 0)}
              icone={ClipboardCheck}
            />
          </div>
          <label className="relative mt-8 block max-w-md">
            <span className="sr-only">Buscar estudante</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pelo nome"
              className="min-h-12 w-full rounded-xl border border-borda-controle bg-card pl-10 pr-3"
            />
          </label>
          <ul className="cartao mt-4 divide-y divide-linha">
            {lista.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4">
                <p className="min-w-0 flex-1 font-semibold">{e.nome}</p>
                <p className="text-sm text-muted-foreground">
                  {e.provas === 0
                    ? `Cadastro em ${dataCurta(e.cadastradoEm)} · ainda sem simulado`
                    : `${e.provas} ${e.provas === 1 ? "simulado" : "simulados"} · média ${media(e.media)}${
                        e.ultimaProva ? ` · último em ${dataCurta(e.ultimaProva)}` : ""
                      }`}
                </p>
              </li>
            ))}
            {lista.length === 0 && (
              <li className="p-4 text-muted-foreground">Ninguém com esse nome.</li>
            )}
          </ul>
        </>
      )}
    </>
  );
}

/** Telas da coordenação que ainda não estão ligadas ao banco. */
export function EmBreveAdmin() {
  return (
    <EstadoVazio
      titulo="Em breve"
      texto="Esta parte da coordenação ainda está sendo preparada."
      acao={
        <Button asChild>
          <Link to="/admin">Voltar para a visão geral</Link>
        </Button>
      }
    />
  );
}
