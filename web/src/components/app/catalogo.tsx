import { useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleCheck,
  Clock,
  EyeOff,
  Flag,
  ListChecks,
  Save,
  Scissors,
  WifiOff,
} from "lucide-react";
import {
  catalogo,
  diaPorExtenso,
  diasAte,
  historico,
  horaCurta,
  isoDaAplicacao,
  partesIngresso,
  quandoAcontece,
  type ItemHistorico,
  type Simulado,
} from "@/data/prototipo";
import { AGORA_DEMO } from "@/data/tempo";
import { AreaChip, Selo, BarraProgresso, EstadoVazio, Revelar } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Cartao, Titulo, AvisoTri, NaoEncontrado } from "./shared";
import { AbasDeslizantes, AvisoErro, CheckSelecionado, OpcaoMarcavel } from "./controles";

const POR_AREA = "Por área";
const filtrosModalidade = ["Todos", "Completos", "Rápidos", POR_AREA, "Recuperação"];
const abas = [
  { valor: "oficiais", rotulo: "Oficiais" },
  { valor: "livres", rotulo: "Livres" },
] as const;
type Aba = (typeof abas)[number]["valor"];

/**
 * Na primeira exibição, o grupo entra com `Revelar` (cartões em cascata, ou ao rolar); depois
 * de trocar aba ou filtro, é um bloco comum: quem anima é o fade curto do conteúdo inteiro.
 */
function Grupo({
  cascata,
  como = "div",
  escalonar = false,
  className,
  children,
  ...resto
}: {
  cascata: boolean;
  como?: "div" | "section";
  escalonar?: boolean;
  className?: string;
  children: ReactNode;
  "aria-labelledby"?: string;
}) {
  if (cascata)
    return (
      <Revelar como={como} escalonar={escalonar} className={className} {...resto}>
        {children}
      </Revelar>
    );
  const Tag = como;
  return (
    <Tag className={className} {...resto}>
      {children}
    </Tag>
  );
}

/** Bloco de data: ingresso tracejado (SÁB 31 OUT) para os próximos; compacto para os já feitos. */
function BlocoData({ iso, compacto = false }: { iso: string; compacto?: boolean }) {
  const { semana, dia, mes } = partesIngresso(iso);
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 flex-col items-center justify-center self-start rounded-xl bg-creme leading-none",
        compacto
          ? "size-14 border border-linha"
          : "w-16 gap-1.5 border border-dashed border-borda-controle py-3 text-sm",
      )}
    >
      {!compacto && <span>{semana}</span>}
      <span
        className={cn("font-display font-black tabular-nums", compacto ? "text-xl" : "text-[32px]")}
      >
        {dia}
      </span>
      <span className={cn(compacto && "mt-1 text-xs font-semibold text-muted-foreground")}>
        {mes}
      </span>
    </span>
  );
}

export function CartaoSimulado({ s }: { s: Simulado }) {
  const destaque = s.id === "demo";
  // Botão primário só no destaque e no "Continuar"; os demais em contorno, como em Redação.
  const principal = destaque || Boolean(s.andamento);
  return (
    <article className={cn("cartao p-5", destaque && "border-2 border-marrom shadow-cartao")}>
      <div className="flex gap-4">
        {s.oficial && s.abertura && <BlocoData iso={s.abertura} />}
        <div className="min-w-0 flex-1">
          <Selo tom="creme">{destaque ? "Comece por aqui" : s.modalidade}</Selo>
          <h2 className="mt-3 text-[22px] font-bold">{s.titulo}</h2>
          <div className="my-3 flex flex-wrap gap-2">
            {s.areas.map((a) => (
              <AreaChip key={a} area={a} curto />
            ))}
          </div>
          <p className="text-muted-foreground">
            {s.questoes} questões · {s.duracao}
          </p>
          {s.oficial && <p className="text-muted-foreground">{quandoAcontece(s)}</p>}
          <p className="my-3 flex items-center gap-2 text-sm font-semibold">
            {s.oficial ? (
              <CalendarDays className="size-4" aria-hidden />
            ) : s.andamento ? (
              <Save className="size-4" aria-hidden />
            ) : (
              <Check className="size-4" aria-hidden />
            )}
            {s.oficial && s.abertura
              ? `Abre em ${diasAte(s.abertura)} dias`
              : s.andamento
                ? `Em andamento · ${s.andamento} de ${s.questoes}`
                : "Disponível"}
          </p>
          {s.andamento && <BarraProgresso valor={s.andamento} total={s.questoes} />}
          <Button
            asChild
            variant={principal ? "default" : "outline"}
            className={cn("mt-4", principal && "w-full sm:w-auto")}
          >
            <Link to={s.andamento ? "/prova/$id" : "/app/simulados/$id"} params={{ id: s.id }}>
              {s.oficial ? "Ver instruções" : s.andamento ? "Continuar" : "Começar"}
              <span className="sr-only">: {s.titulo}</span>
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

/** Os treinos por área num cartão só, com um link por área. */
function CartaoPorArea({ simulados }: { simulados: Simulado[] }) {
  const [primeiro] = simulados;
  return (
    <article className="cartao p-5">
      <Selo tom="creme">{POR_AREA}</Selo>
      <h2 className="mt-3 text-[22px] font-bold">Treino por área</h2>
      <p className="mt-2 text-muted-foreground">
        {primeiro.questoes} questões · {primeiro.duracao} · escolha a área
      </p>
      <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
        <Check className="size-4" aria-hidden />
        Disponível
      </p>
      <ul className="mt-2 divide-y divide-linha">
        {simulados.map((s) => (
          <li key={s.id}>
            <Link
              to="/app/simulados/$id"
              params={{ id: s.id }}
              className="-mx-2 flex min-h-14 items-center justify-between gap-3 rounded-xl px-2 hover:bg-creme/60"
            >
              <span className="sr-only">Treino de </span>
              <AreaChip area={s.areas[0]} />
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}

/** Oficial já feito: data, "Concluído · 67%" e link para o resultado. */
function CartaoConcluido({ h }: { h: ItemHistorico }) {
  const iso = isoDaAplicacao(h.data);
  return (
    <article className="cartao grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 p-4 sm:grid-cols-[auto_1fr_auto] md:p-5">
      <BlocoData iso={iso} compacto />
      <div className="min-w-0">
        <h3 className="text-xl font-bold">{h.titulo}</h3>
        <p className="sr-only">Aplicado em {diaPorExtenso(iso)}.</p>
        <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
          <CircleCheck className="size-4" aria-hidden />
          Concluído · {h.percentual}%
        </p>
      </div>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="col-start-2 justify-self-start sm:col-start-3"
      >
        <Link to="/app/resultado/$id" params={{ id: h.id }}>
          Ver resultado
          <span className="sr-only">: {h.titulo}</span>
        </Link>
      </Button>
    </article>
  );
}

export function Catalogo() {
  const [aba, setAba] = useState<Aba>("oficiais");
  const [filtro, setFiltro] = useState("Todos");
  // Depois da 1ª troca de aba ou filtro, o conteúdo só faz um fade curto (sem cascata de novo).
  const [trocou, setTrocou] = useState(false);
  const mostrar = (novaAba: Aba, novoFiltro: string) => {
    setAba(novaAba);
    setFiltro(novoFiltro);
    setTrocou(true);
  };
  const oficiais = aba === "oficiais";
  const itens = catalogo.filter(
    (s) => Boolean(s.oficial) === oficiais && (filtro === "Todos" || s.modalidade === filtro),
  );
  const porArea = itens.filter((s) => s.modalidade === POR_AREA);
  const primeiroPorArea = itens.find((s) => s.modalidade === POR_AREA);
  // Os oficiais de Maria foram todos completos (Dia 2).
  const feitos =
    oficiais && (filtro === "Todos" || filtro === "Completos") ? [...historico].reverse() : [];
  return (
    <>
      <Titulo titulo="Simulados" subtitulo="Um treino de cada vez. Escolha seu próximo passo." />
      <Tabs value={aba} onValueChange={(v) => mostrar(v as Aba, filtro)}>
        <AbasDeslizantes
          opcoes={abas}
          ativa={aba}
          aoEscolher={(v) => mostrar(v, filtro)}
          className="w-full"
        />
      </Tabs>
      <div className="my-5 flex flex-wrap gap-2" role="group" aria-label="Filtrar por modalidade">
        {filtrosModalidade.map((f) => (
          <Button
            key={f}
            variant="outline"
            size="sm"
            className={cn("selecionavel", filtro === f && "selecionado")}
            aria-pressed={filtro === f}
            onClick={() => mostrar(aba, f)}
          >
            {filtro === f && <CheckSelecionado recem={trocou} />}
            {f}
          </Button>
        ))}
      </div>
      <div
        key={trocou ? `${aba}|${filtro}` : "inicio"}
        className={cn(trocou && "anima-aparecer motion-reduce:animate-none")}
      >
        {itens.length ? (
          <Grupo cascata={!trocou} escalonar className="grid items-start gap-6 xl:grid-cols-2">
            {itens.map((s) =>
              s.modalidade !== POR_AREA ? (
                <CartaoSimulado key={s.id} s={s} />
              ) : s === primeiroPorArea ? (
                <CartaoPorArea key={POR_AREA} simulados={porArea} />
              ) : null,
            )}
          </Grupo>
        ) : (
          <EstadoVazio
            titulo="Nenhum simulado oficial desse tipo agora"
            texto="A coordenação do seu polo marca os oficiais. Enquanto isso, que tal um treino livre?"
            acao={<Button onClick={() => mostrar("livres", "Todos")}>Ver livres</Button>}
          />
        )}
        {feitos.length > 0 && (
          <Grupo
            cascata={!trocou}
            como="section"
            aria-labelledby="oficiais-feitos"
            className="mt-10"
          >
            <h2 id="oficiais-feitos" className="text-[22px] font-bold">
              Já feitos
            </h2>
            <p className="mt-1 text-muted-foreground">
              Os oficiais que você concluiu. O resultado de cada um fica aqui.
            </p>
            <ul className="mt-4 grid gap-4 xl:grid-cols-2">
              {feitos.map((h) => (
                <li key={h.id} className="min-w-0">
                  <CartaoConcluido h={h} />
                </li>
              ))}
            </ul>
          </Grupo>
        )}
      </div>
    </>
  );
}

const antesDeComecar = [
  { I: EyeOff, t: "O cronômetro pode ser escondido para você se concentrar." },
  { I: Flag, t: "Marque questões para revisar antes de entregar." },
  { I: Scissors, t: "Risque alternativas que você já descartou." },
  { I: WifiOff, t: "Se a internet cair, as respostas ficam guardadas no aparelho." },
];

export function Instrucoes({ id }: { id: string }) {
  const navigate = useNavigate();
  const caixa = useRef<HTMLInputElement>(null);
  const [leu, setLeu] = useState(false);
  // Quantas vezes tentou começar sem marcar: a mensagem surge de novo a cada tentativa.
  const [tentativas, setTentativas] = useState(0);
  const s = catalogo.find((s) => s.id === id);
  if (!s) return <NaoEncontrado />;
  const fechado =
    s.oficial && s.abertura !== undefined && new Date(s.abertura) > AGORA_DEMO
      ? s.abertura
      : undefined;
  const erroLeu = tentativas > 0 && !leu;

  const comecar = () => {
    if (!leu) {
      setTentativas((n) => n + 1);
      caixa.current?.focus();
      return;
    }
    void navigate({ to: "/prova/$id", params: { id } });
  };

  return (
    <>
      <Button asChild variant="ghost" className="-ml-3 mb-4">
        <Link to="/app/simulados">
          <ArrowLeft aria-hidden />
          Voltar para Simulados
        </Link>
      </Button>
      <Titulo titulo={s.titulo} subtitulo="Prepare seu espaço e faça no seu ritmo." />
      <Selo tom="creme">{s.modalidade}</Selo>
      <Revelar escalonar className="mt-6 space-y-6">
        <Cartao>
          <div className="grid gap-5 sm:grid-cols-2">
            <p className="flex items-center gap-2">
              <ListChecks className="size-5 shrink-0 text-laranja-acao" aria-hidden />
              {s.questoes} questões
            </p>
            <p className="flex items-center gap-2">
              <Clock className="size-5 shrink-0 text-laranja-acao" aria-hidden />
              {s.duracao}
            </p>
            {s.oficial && s.abertura && (
              <p className="flex items-center gap-2 sm:col-span-2">
                <CalendarDays className="size-5 shrink-0 text-laranja-acao" aria-hidden />
                {quandoAcontece(s)}
              </p>
            )}
            <p className="flex items-center gap-2">
              <Save className="size-5 shrink-0 text-laranja-acao" aria-hidden />
              Salvamento automático
            </p>
            <div className="flex flex-wrap gap-2">
              {s.areas.map((a) => (
                <AreaChip key={a} area={a} curto />
              ))}
            </div>
          </div>
        </Cartao>
        <Cartao titulo="Antes de começar">
          <ul className="space-y-4">
            {antesDeComecar.map(({ I, t }) => (
              <li key={t} className="flex gap-3">
                <I className="mt-1 size-5 shrink-0 text-laranja-acao" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-5 font-semibold">
            {s.oficial
              ? "O resultado é liberado após o fechamento."
              : "Seu resultado sai assim que você entregar."}
          </p>
          <AvisoTri />
        </Cartao>
        {fechado ? (
          <div className="flex items-start gap-3 rounded-2xl border-[1.5px] border-linha bg-creme p-5 text-[17px] text-marrom">
            <CalendarDays className="mt-0.5 size-6 shrink-0 text-laranja-acao" aria-hidden />
            <p>
              Abre {diaPorExtenso(fechado)}, às {horaCurta(fechado)}. O botão para começar aparece
              aqui nessa hora.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <OpcaoMarcavel
              refInput={caixa}
              marcado={leu}
              aoMudar={setLeu}
              invalido={erroLeu}
              descricao={erroLeu ? "erro-instrucoes" : undefined}
              className="sm:max-w-md"
            >
              <span className="font-semibold">Li as instruções</span>
            </OpcaoMarcavel>
            {/* Depois da 1ª tentativa, a linha do aviso fica reservada: ao marcar, ele só esmaece
                e o botão "Começar simulado" não sobe bem na hora do toque. */}
            {tentativas > 0 && (
              <AvisoErro id="erro-instrucoes" visivel={erroLeu} tentativa={tentativas}>
                Marque “Li as instruções” para começar.
              </AvisoErro>
            )}
            {/* Em contorno até marcar; ao marcar, vira o botão principal (cor em 140ms). A borda
                fica nos dois estados (transparente no principal) para o botão não mudar de tamanho. */}
            <Button
              variant={leu ? "default" : "outline"}
              className={cn("w-full border-2 sm:w-auto", leu && "border-transparent")}
              onClick={comecar}
            >
              Começar simulado
              <ArrowRight aria-hidden />
            </Button>
          </div>
        )}
      </Revelar>
    </>
  );
}
