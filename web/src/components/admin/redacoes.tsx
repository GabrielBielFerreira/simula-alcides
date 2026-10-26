/**
 * Redações na coordenação: o bloco da ficha do estudante (notas por competência e devolutiva
 * da IA) e a lista geral em /admin/redacoes.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { FotosDaFolha } from "@/components/app/redacao-foto";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Clock, PenLine } from "lucide-react";
import { Carregando, EstadoVazio } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { BarraCompetencia } from "@/components/app/barra-competencia";
import { competenciasCurtas } from "@/data/estudante";
import {
  buscarRedacao,
  redacoesDoEstudante,
  redacoesRecentes,
  type RedacaoResumo,
} from "@/lib/redacao";
import { CabecalhoAdmin, StatCard } from "./ui";

const dataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Recife",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

function Nota({ r }: { r: RedacaoResumo }) {
  if (r.nota !== null)
    return (
      <span className="shrink-0 text-right">
        <span className="block font-display text-3xl font-black tabular-nums">{r.nota}</span>
        <span className="block text-sm text-muted-foreground">estimada</span>
      </span>
    );
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-mostarda px-3 py-1 text-sm font-bold text-marrom">
      <Clock className="size-4" aria-hidden />
      Sem correção
    </span>
  );
}

/** Devolutiva da IA de uma redação, carregada só quando a coordenação abre o cartão. */
function DetalheRedacao({ id }: { id: string }) {
  const { data, error } = useQuery({ queryKey: ["redacao", id], queryFn: () => buscarRedacao(id) });
  if (error) return <p className="mt-4 text-muted-foreground">Não foi possível carregar.</p>;
  if (!data) return <Carregando texto="Carregando a redação…" />;
  const d = data.devolutiva;
  return (
    <div className="mt-4 space-y-5 border-t border-linha pt-4">
      {d && (
        <ol className="space-y-4">
          {d.competencias.map((v, i) => (
            <li key={i}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold">
                  C{i + 1} · {competenciasCurtas[i]}
                </p>
                <p className="shrink-0 tabular-nums">
                  <span className="font-bold">{v}</span>
                  <span className="text-sm text-muted-foreground"> de 200</span>
                </p>
              </div>
              <BarraCompetencia valor={v} className="mt-2" />
              <p className="mt-2 text-sm text-muted-foreground">{d.comentarios[i]}</p>
            </li>
          ))}
        </ol>
      )}
      {d && d.plano.length > 0 && (
        <div>
          <p className="font-semibold">Plano de melhoria sugerido</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {d.plano.map((p, i) => (
              <li key={i}>
                <span className="font-semibold">{p.titulo}.</span> {p.texto}
              </li>
            ))}
          </ol>
        </div>
      )}
      <div>
        <p className="font-semibold">Texto do estudante</p>
        <p className="text-sm text-muted-foreground tabular-nums">{data.palavras} palavras</p>
        <div className="mt-2 space-y-3 rounded-xl bg-creme/60 p-4 leading-relaxed">
          {data.texto
            .split("\n")
            .filter((p) => p.trim())
            .map((p, i) => (
              <p key={i} className="indent-6">
                {p}
              </p>
            ))}
        </div>
      </div>
      <FotosDaFolha fotos={data.fotos} />
      {data.modelo && (
        <p className="text-sm text-muted-foreground">
          Nota estimada pela IA ({data.modelo}). Não é a nota oficial do ENEM.
        </p>
      )}
    </div>
  );
}

function CartaoRedacao({ r }: { r: RedacaoResumo }) {
  const [aberto, setAberto] = useState(false);
  return (
    <li className="cartao p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold leading-snug">{r.tema}</p>
          <p className="text-sm text-muted-foreground">Enviada em {dataHora(r.enviadaEm)}</p>
        </div>
        <Nota r={r} />
      </div>
      {r.competencias && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {r.competencias.map((v, i) => (
            <li
              key={i}
              className="rounded-full border border-linha bg-creme/60 px-3 py-1 text-sm tabular-nums"
            >
              <span className="font-semibold">C{i + 1}</span> {v}
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="link"
        className="mt-2 min-h-11 px-0"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
      >
        {aberto ? "Esconder devolutiva e texto" : "Ver devolutiva e texto"}
        <ChevronDown className={aberto ? "rotate-180" : undefined} />
      </Button>
      {aberto && <DetalheRedacao id={r.id} />}
    </li>
  );
}

/** Bloco "Redações" da ficha do estudante. */
export function RedacoesDaFicha({ estudanteId }: { estudanteId: string }) {
  const { data, error } = useQuery({
    queryKey: ["redacoes-estudante", estudanteId],
    queryFn: () => redacoesDoEstudante(estudanteId),
  });
  if (error) return <p className="text-muted-foreground">Não foi possível carregar as redações.</p>;
  if (!data) return <Carregando texto="Carregando as redações…" />;
  if (!data.length)
    return (
      <EstadoVazio
        icon={PenLine}
        titulo="Ainda sem redação"
        texto="Quando o estudante enviar uma redação, a nota estimada e a devolutiva aparecem aqui."
      />
    );
  return (
    <ul className="space-y-3">
      {data.map((r) => (
        <CartaoRedacao key={r.id} r={r} />
      ))}
    </ul>
  );
}

/** /admin/redacoes · as redações mais recentes da Rede (ou do polo do coordenador). */
export function RedacoesAdmin() {
  const { data, error } = useQuery({
    queryKey: ["redacoes-recentes"],
    queryFn: () => redacoesRecentes(),
  });
  if (error)
    return (
      <EstadoVazio
        titulo="Não foi possível carregar"
        texto={error instanceof Error ? error.message : "Tente de novo em instantes."}
        acao={<Button onClick={() => window.location.reload()}>Tentar de novo</Button>}
      />
    );
  if (!data) return <Carregando texto="Carregando as redações…" />;
  const corrigidas = data.filter((r) => r.nota !== null);
  const media = corrigidas.length
    ? Math.round(corrigidas.reduce((s, r) => s + (r.nota ?? 0), 0) / corrigidas.length)
    : null;
  const pendentes = data.length - corrigidas.length;
  return (
    <>
      <CabecalhoAdmin
        sobretitulo="Coordenação"
        titulo="Redações"
        subtitulo="Redações enviadas pelos estudantes, com a nota estimada pela IA."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard rotulo="Redações enviadas" valor={data.length} icone={PenLine} />
        <StatCard rotulo="Nota média estimada" valor={media === null ? "—" : String(media)} />
        <StatCard rotulo="Sem correção" valor={pendentes} icone={Clock} />
      </div>
      {data.length === 0 ? (
        <div className="mt-8">
          <EstadoVazio
            icon={PenLine}
            titulo="Nenhuma redação ainda"
            texto="Quando os estudantes enviarem redações, elas aparecem aqui."
          />
        </div>
      ) : (
        <ul className="cartao mt-8 divide-y divide-linha">
          {data.map((r) => (
            <li key={r.id}>
              <Link
                to="/admin/estudantes/$id"
                params={{ id: r.estudanteId }}
                className="flex min-h-16 items-center gap-4 px-5 py-4 hover:bg-creme/60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{r.estudante}</span>
                  <span className="block text-sm text-muted-foreground">
                    {r.polo ?? "Fora da Rede"} · {dataHora(r.enviadaEm)}
                  </span>
                  <span className="mt-0.5 block text-sm leading-snug">{r.tema}</span>
                </span>
                <Nota r={r} />
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
