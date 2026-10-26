/**
 * Acompanhamento da coordenação com os dados reais do banco: resumo da Rede (por Compaz), a
 * lista de estudantes (da Rede ou de um polo) e a ficha de cada estudante.
 */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  Hourglass,
  Mail,
  MapPin,
  MessageCircle,
  Search,
  Users,
} from "lucide-react";
import { AreaChip, Carregando, EstadoVazio } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { formato } from "@/components/app/shared";
import { mascaraTelefone } from "@/components/conta/validacao";
import { buscarPolo } from "@/data/coordenacao";
import { areas } from "@/data/mock";
import type { AreaId } from "@/data/types";
import {
  ORDEM_AREA,
  POLO_APELIDO,
  POLO_UUID,
  dataCurta,
  fichaEstudante,
  painelEstudantes,
  painelPolos,
  type EstudantePainel,
  type FichaEstudante,
  type TentativaFicha,
} from "@/lib/dados";
import { iniciaisDe } from "@/lib/sessao";
import { Avatar, CabecalhoAdmin, StatCard } from "./ui";
import { RedacoesDaFicha } from "./redacoes";

const media = (v: number | null) => (v === null ? "—" : `${formato(v)}%`);
const nomeArea = (a: AreaId) => areas.find((x) => x.id === a)?.nome ?? a;
const pct = (acertos: number, total: number) =>
  total ? Math.round((acertos * 1000) / total) / 10 : 0;

function Erro({ erro }: { erro: unknown }) {
  return (
    <EstadoVazio
      titulo="Não foi possível carregar"
      texto={erro instanceof Error ? erro.message : "Tente de novo em instantes."}
      acao={<Button onClick={() => window.location.reload()}>Tentar de novo</Button>}
    />
  );
}

/** "Compaz Dom Helder Câmara", "Outro cursinho: X" ou "Estuda por conta própria". */
function ondeEstuda(e: Pick<EstudantePainel, "vinculo" | "poloNome" | "cursinhoExterno">) {
  if (e.vinculo === "rede") return e.poloNome ?? "Rede Alcides Nascimento";
  if (e.vinculo === "outro_cursinho")
    return e.cursinhoExterno ? `Outro cursinho: ${e.cursinhoExterno}` : "Outro cursinho";
  return "Estuda por conta própria";
}

function resumoEstudante(e: EstudantePainel) {
  const partes: string[] = [];
  if (e.provas > 0)
    partes.push(
      `${e.provas} ${e.provas === 1 ? "simulado entregue" : "simulados entregues"} · média ${media(e.media)}`,
    );
  if (e.emAndamento > 0) partes.push(`${e.emAndamento} em andamento`);
  if (!partes.length) partes.push("Ainda sem simulado");
  return partes.join(" · ");
}

/** Link do WhatsApp (wa.me) a partir dos dígitos salvos no perfil. */
const linkWhatsApp = (tel: string) => `https://wa.me/${tel.length <= 11 ? `55${tel}` : tel}`;

/* ---------- Lista de estudantes ---------- */

function LinhaEstudante({ e, mostrarPolo }: { e: EstudantePainel; mostrarPolo: boolean }) {
  return (
    <li>
      <Link
        to="/admin/estudantes/$id"
        params={{ id: e.id }}
        className="flex min-h-16 items-center gap-3 p-4 transition-colors hover:bg-creme/60"
      >
        <Avatar iniciais={iniciaisDe(e.nome)} tamanho="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{e.nome}</p>
          <p className="text-sm text-muted-foreground">
            {mostrarPolo && <>{ondeEstuda(e)} · </>}
            {resumoEstudante(e)}
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

/** Planilha (CSV) com nome, contato e desempenho, para abrir no Excel ou Google Planilhas. */
function baixarPlanilha(lista: EstudantePainel[], nomeArquivo: string) {
  const celula = (v: string | number | null) => {
    const t = v === null ? "" : String(v);
    return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const linhas = [
    [
      "Nome",
      "WhatsApp",
      "E-mail",
      "Onde estuda",
      "Cadastro",
      "Simulados entregues",
      "Em andamento",
      "Média de acertos (%)",
    ],
    ...lista.map((e) => [
      e.nome,
      e.telefone ? mascaraTelefone(e.telefone) : "",
      e.email ?? "",
      ondeEstuda(e),
      dataCurta(e.cadastradoEm),
      e.provas,
      e.emAndamento,
      e.media === null ? "" : formato(e.media),
    ]),
  ];
  // BOM + ponto e vírgula: o Excel em português abre com acentos e colunas certas.
  const csv = "﻿" + linhas.map((l) => l.map(celula).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

function ListaEstudantes({
  estudantes,
  mostrarPolo,
  nomeArquivo,
}: {
  estudantes: EstudantePainel[];
  mostrarPolo: boolean;
  nomeArquivo: string;
}) {
  const [busca, setBusca] = useState("");
  const lista = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return estudantes;
    const digitos = termo.replace(/\D/g, "");
    return estudantes.filter(
      (e) =>
        e.nome.toLocaleLowerCase("pt-BR").includes(termo) ||
        (e.email ?? "").toLocaleLowerCase("pt-BR").includes(termo) ||
        (digitos.length >= 4 && (e.telefone ?? "").includes(digitos)),
    );
  }, [estudantes, busca]);
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block min-w-0 flex-1 basis-64 sm:max-w-md">
          <span className="sr-only">Buscar estudante</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail ou WhatsApp"
            className="min-h-12 w-full rounded-xl border border-borda-controle bg-card pl-10 pr-3"
          />
        </label>
        <Button variant="outline" onClick={() => baixarPlanilha(lista, nomeArquivo)}>
          <Download aria-hidden />
          Baixar planilha
        </Button>
      </div>
      <ul className="cartao mt-4 divide-y divide-linha">
        {lista.map((e) => (
          <LinhaEstudante key={e.id} e={e} mostrarPolo={mostrarPolo} />
        ))}
        {lista.length === 0 && <li className="p-4 text-muted-foreground">Ninguém encontrado.</li>}
      </ul>
    </>
  );
}

/* ---------- Visão geral ---------- */

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
  const fora = todos.filter((e) => e.vinculo !== "rede");
  const provas = todos.reduce((n, e) => n + e.provas, 0);
  const andamento = todos.reduce((n, e) => n + e.emAndamento, 0);
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
        <StatCard
          rotulo="Estudantes cadastrados"
          valor={todos.length}
          icone={Users}
          detalhe="Contas de coordenação não entram na conta"
        />
        <StatCard
          rotulo="Simulados entregues"
          valor={provas}
          icone={ClipboardCheck}
          detalhe={andamento ? `Mais ${formato(andamento)} em andamento agora` : undefined}
        />
        <StatCard
          rotulo="Média de acertos"
          valor={media(mediaGeral)}
          detalhe="Média dos estudantes que já entregaram"
        />
      </div>

      <div className="mb-4 mt-10 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-bold">Últimos cadastros</h2>
        <Button asChild variant="outline">
          <Link to="/admin/estudantes">
            Ver todos os estudantes
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      </div>
      {todos.length === 0 ? (
        <EstadoVazio
          icon={Users}
          titulo="Nenhum estudante ainda"
          texto="Quando estudantes criarem a conta, eles aparecem aqui."
        />
      ) : (
        <ul className="cartao divide-y divide-linha">
          {todos.slice(0, 5).map((e) => (
            <LinhaEstudante key={e.id} e={e} mostrarPolo />
          ))}
        </ul>
      )}

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
                    {formato(p.estudantes)} {p.estudantes === 1 ? "estudante" : "estudantes"} ·{" "}
                    {formato(p.provas)} simulados entregues · média {media(p.media)}
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
        {formato(fora.length)} {fora.length === 1 ? "estudante" : "estudantes"} de outros cursinhos
        ou estudando por conta própria.
      </p>
    </>
  );
}

/* ---------- Estudantes ---------- */

/** /admin/estudantes · todos os estudantes que a pessoa pode ver (a Rede ou o seu polo). */
export function PainelEstudantes() {
  const consulta = useQuery({
    queryKey: ["painel-estudantes", null],
    queryFn: () => painelEstudantes(null),
  });
  return (
    <>
      <CabecalhoAdmin
        sobretitulo="Coordenação"
        titulo="Estudantes"
        subtitulo="Toque num nome para ver o contato e o desempenho por área."
      />
      {consulta.error ? (
        <Erro erro={consulta.error} />
      ) : !consulta.data ? (
        <Carregando texto="Carregando estudantes…" />
      ) : consulta.data.length === 0 ? (
        <EstadoVazio
          icon={Users}
          titulo="Nenhum estudante ainda"
          texto="Quando estudantes criarem a conta, eles aparecem aqui."
        />
      ) : (
        <>
          <p className="mb-4 text-muted-foreground">
            {formato(consulta.data.length)}{" "}
            {consulta.data.length === 1 ? "estudante cadastrado" : "estudantes cadastrados"}, do
            mais recente para o mais antigo.
          </p>
          <ListaEstudantes
            estudantes={consulta.data}
            mostrarPolo
            nomeArquivo="estudantes-simula-alcides.csv"
          />
        </>
      )}
    </>
  );
}

/** /admin/polos/$poloId · estudantes de um Compaz. */
export function PainelPolo({ poloId }: { poloId: string }) {
  const polo = buscarPolo(poloId);
  const uuid = POLO_UUID[poloId];
  const consulta = useQuery({
    queryKey: ["painel-estudantes", uuid],
    queryFn: () => painelEstudantes(uuid),
  });

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
          <div className="mt-8">
            <ListaEstudantes
              estudantes={consulta.data}
              mostrarPolo={false}
              nomeArquivo={`estudantes-${poloId}.csv`}
            />
          </div>
        </>
      )}
    </>
  );
}

/* ---------- Ficha do estudante ---------- */

function idade(nascimento: string) {
  const [a, m, d] = nascimento.split("-").map(Number);
  const hoje = new Date();
  let anos = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) anos -= 1;
  return anos;
}

const horaCurta = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Recife",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

/** Acertos por área somando todos os simulados entregues. */
function somaPorArea(tentativas: TentativaFicha[]) {
  const soma = new Map<AreaId, { acertos: number; total: number }>();
  for (const t of tentativas)
    for (const v of t.porArea ?? []) {
      const s = soma.get(v.area) ?? { acertos: 0, total: 0 };
      s.acertos += v.acertos;
      s.total += v.total;
      soma.set(v.area, s);
    }
  return ORDEM_AREA.flatMap((a) => {
    const v = soma.get(a);
    return v ? [{ area: a, ...v }] : [];
  });
}

function BarraArea({ area, acertos, total }: { area: AreaId; acertos: number; total: number }) {
  const p = pct(acertos, total);
  return (
    <li className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AreaChip area={area} />
        <span className="font-semibold tabular-nums">
          {acertos} de {total} · {formato(p)}%
        </span>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full bg-creme"
        role="img"
        aria-label={`${nomeArea(area)}: ${formato(p)}% de acertos`}
      >
        <div className="h-full rounded-full bg-laranja" style={{ width: `${p}%` }} />
      </div>
    </li>
  );
}

function CartaoTentativa({ t }: { t: TentativaFicha }) {
  const aberta = t.status === "em_andamento";
  const tempoAcabou = aberta && new Date(t.prazoEm).getTime() < Date.now();
  return (
    <li className="cartao p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{t.simulado}</p>
          <p className="text-sm text-muted-foreground">
            {aberta
              ? tempoAcabou
                ? `Começou em ${horaCurta(t.iniciadaEm)} e não entregou (o tempo acabou)`
                : `Fazendo agora · ${t.respondidas} de ${t.questoes} respondidas · prazo até ${horaCurta(t.prazoEm)}`
              : `Entregue em ${horaCurta(t.entregueEm ?? t.iniciadaEm)} · ${t.acertos ?? 0} de ${t.total ?? 0} certas · ${t.emBranco ?? 0} em branco`}
          </p>
        </div>
        {aberta ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mostarda px-3 py-1 text-sm font-bold text-marrom">
            <Hourglass className="size-4" aria-hidden />
            {tempoAcabou ? "Não terminou" : "Em andamento"}
          </span>
        ) : (
          <span className="font-display text-3xl font-black tabular-nums">
            {formato(t.percentual ?? 0)}%
          </span>
        )}
      </div>
      {t.porArea && t.porArea.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {t.porArea.map((v) => (
            <li
              key={v.area}
              className="rounded-full border border-linha bg-creme/60 px-3 py-1 text-sm tabular-nums"
            >
              <span className="font-semibold">{areas.find((a) => a.id === v.area)?.nomeCurto}</span>{" "}
              {v.acertos}/{v.total}
            </li>
          ))}
        </ul>
      )}
      {!aberta && (
        <Button asChild variant="ghost" className="-ml-3 mt-2">
          <Link to="/app/resultado/$id" params={{ id: t.id }}>
            Ver correção questão por questão
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      )}
    </li>
  );
}

function ConteudoFicha({ f }: { f: FichaEstudante }) {
  const entregues = f.tentativas.filter((t) => t.status !== "em_andamento");
  const abertas = f.tentativas.length - entregues.length;
  const mediaGeral = entregues.length
    ? Math.round((entregues.reduce((n, t) => n + (t.percentual ?? 0), 0) / entregues.length) * 10) /
      10
    : null;
  const porArea = somaPorArea(entregues);
  const fraca =
    porArea.length > 1
      ? porArea.reduce((a, b) => (pct(b.acertos, b.total) < pct(a.acertos, a.total) ? b : a))
      : null;

  return (
    <>
      <Button asChild variant="ghost" className="-ml-3 mb-4">
        <Link to="/admin/estudantes">
          <ArrowLeft aria-hidden />
          Todos os estudantes
        </Link>
      </Button>
      <CabecalhoAdmin
        sobretitulo={ondeEstuda({
          vinculo: f.vinculo,
          poloNome: f.polo,
          cursinhoExterno: f.cursinhoExterno,
        })}
        titulo={f.nome}
        subtitulo={`Cadastro em ${dataCurta(f.cadastradoEm)}${
          f.dataNascimento ? ` · ${idade(f.dataNascimento)} anos` : ""
        }`}
      />

      <section className="cartao p-5 md:p-6">
        <h2 className="mb-3 text-xl font-bold">Contato</h2>
        <div className="flex flex-wrap gap-2">
          {f.telefone ? (
            <Button asChild>
              <a href={linkWhatsApp(f.telefone)} target="_blank" rel="noreferrer">
                <MessageCircle aria-hidden />
                WhatsApp {mascaraTelefone(f.telefone)}
              </a>
            </Button>
          ) : (
            <p className="text-muted-foreground">WhatsApp ainda não informado.</p>
          )}
          {f.email && (
            <Button asChild variant="outline" className="max-w-full">
              <a href={`mailto:${f.email}`}>
                <Mail aria-hidden />
                <span className="truncate">{f.email}</span>
              </a>
            </Button>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard rotulo="Simulados entregues" valor={entregues.length} icone={ClipboardCheck} />
        <StatCard
          rotulo="Média de acertos"
          valor={media(mediaGeral)}
          avisoTri={entregues.length > 0}
        />
        <StatCard rotulo="Em andamento" valor={abertas} icone={Hourglass} />
      </div>

      <section className="cartao mt-6 p-5 md:p-6">
        <h2 className="text-xl font-bold">Desempenho por área</h2>
        {porArea.length === 0 ? (
          <p className="mt-2 text-muted-foreground">
            Aparece aqui quando o estudante entregar o primeiro simulado.
          </p>
        ) : (
          <>
            <p className="mt-1 text-muted-foreground">
              Soma de todos os simulados entregues.
              {fraca && ` A área que mais precisa de reforço é ${nomeArea(fraca.area)}.`}
            </p>
            <ul className="mt-5 space-y-5">
              {porArea.map((v) => (
                <BarraArea key={v.area} {...v} />
              ))}
            </ul>
          </>
        )}
      </section>

      <h2 className="mb-4 mt-10 text-2xl font-bold">Simulados</h2>
      {f.tentativas.length === 0 ? (
        <EstadoVazio
          icon={ClipboardCheck}
          titulo="Ainda sem simulado"
          texto="Quando o estudante começar um simulado, ele aparece aqui."
        />
      ) : (
        <ul className="space-y-3">
          {f.tentativas.map((t) => (
            <CartaoTentativa key={t.id} t={t} />
          ))}
        </ul>
      )}

      <h2 className="mb-4 mt-10 text-2xl font-bold">Redações</h2>
      <RedacoesDaFicha estudanteId={f.id} />
    </>
  );
}

/** /admin/estudantes/$id · contato e desempenho de um estudante. */
export function FichaEstudanteAdmin({ id }: { id: string }) {
  const { data, error } = useQuery({
    queryKey: ["ficha-estudante", id],
    queryFn: () => fichaEstudante(id),
  });
  if (error) return <Erro erro={error} />;
  if (data === undefined) return <Carregando texto="Carregando a ficha…" />;
  if (data === null)
    return (
      <EstadoVazio
        icon={Users}
        titulo="Estudante não encontrado"
        texto="A conta pode ter sido apagada, ou ela é de um Compaz que você não acompanha."
        acao={
          <Button asChild>
            <Link to="/admin/estudantes">Ver estudantes</Link>
          </Button>
        }
      />
    );
  return <ConteudoFicha f={data} />;
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
