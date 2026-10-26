import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Camera,
  Clock,
  Loader2,
  PenLine,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  checklistRevisao,
  competenciasCurtas,
  estruturaRedacao,
  instrucaoProposta,
  mensagensCorrecao,
  regrasProposta,
  regrasRedacao,
  type TextoMotivador,
} from "@/data/estudante";
import { Carregando, EstadoVazio, Preenchimento } from "@/components/ds";
import {
  buscarRedacao,
  corrigirRedacao,
  enviadasHoje,
  enviarRedacaoFoto,
  trocarFotosRedacao,
  type FalhaCorrecao,
  type PropostaReal,
  type RedacaoCompleta,
} from "@/lib/redacao";
import { Cartao, Titulo } from "./shared";
import { OpcaoMarcavel } from "./controles";
import { Devolutiva, EtapasRedacao, SeloPrevia } from "./redacao-pecas";
import { EscolherFotos, FotosDaFolha, useLiberarPrevias, type FotoEscolhida } from "./redacao-foto";
import { useMinhasRedacoes, usePropostas } from "./redacao";

/** Falha da correção logo depois do envio, para a tela da redação mostrar sem perguntar de novo. */
const falhasRecentes = new Map<string, FalhaCorrecao>();

const dataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Recife",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

/** /app/redacao/$id · editor (id de proposta) ou redação enviada (id de redação). */
export function RedacaoDetalhe({ id }: { id: string }) {
  const propostas = usePropostas();
  // Um erro ao recarregar em segundo plano (ex.: voltando da câmera) não derruba o editor.
  if (propostas.error && !propostas.data)
    return (
      <EstadoVazio
        titulo="Não foi possível carregar"
        texto="Verifique a internet e tente de novo."
        acao={<Button onClick={() => window.location.reload()}>Tentar de novo</Button>}
      />
    );
  if (!propostas.data) return <Carregando texto="Carregando…" />;
  const proposta = propostas.data.find((p) => p.id === id);
  return (
    <>
      <Button asChild variant="ghost" className="mb-4 -ml-3">
        <Link to="/app/redacao">
          <ArrowLeft />
          Voltar para Redação
        </Link>
      </Button>
      {proposta ? (
        <EditorRedacao key={proposta.id} proposta={proposta} />
      ) : (
        <RedacaoEnviada key={id} id={id} propostas={propostas.data} />
      )}
    </>
  );
}

/* ---------- Redação enviada: devolutiva ou aguardando correção ---------- */

function RedacaoEnviada({ id, propostas }: { id: string; propostas: PropostaReal[] }) {
  const q = useQuery({ queryKey: ["redacao", id], queryFn: () => buscarRedacao(id) });
  const minhas = useMinhasRedacoes();
  if (q.error)
    return (
      <EstadoVazio
        titulo="Não foi possível carregar"
        texto="Verifique a internet e tente de novo."
        acao={<Button onClick={() => window.location.reload()}>Tentar de novo</Button>}
      />
    );
  if (q.data === undefined) return <Carregando texto="Carregando sua redação…" />;
  const r = q.data;
  if (!r)
    return (
      <EstadoVazio
        titulo="Não encontramos isso por aqui"
        texto="Essa proposta ou redação não está mais disponível. Que tal escolher um tema?"
        acao={
          <Button asChild>
            <Link to="/app/redacao">Ver propostas</Link>
          </Button>
        }
      />
    );

  if (!r.devolutiva) return <AguardandoCorrecao redacao={r} />;

  // Evolução: a redação corrigida anterior a esta, de qualquer tema.
  const lista = minhas.data ?? [];
  const anterior = lista
    .slice(lista.findIndex((x) => x.id === r.id) + 1)
    .find((x) => x.competencias);
  const sugerida =
    propostas.find((p) => !lista.some((x) => x.propostaId === p.id)) ??
    propostas.find((p) => p.id !== r.propostaId);
  const curto = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Recife",
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(iso));
  return (
    <>
      <Titulo sobretitulo={`Devolutiva · ${dataHora(r.enviadaEm)}`} titulo={r.tema} />
      <div className="-mt-2 mb-6">
        <SeloPrevia />
      </div>
      <EtapasRedacao atual={4} />
      <Devolutiva
        dados={r.devolutiva}
        texto={r.texto}
        fotos={r.fotos}
        avisoLeitura={r.avisoLeitura}
        anterior={
          anterior?.competencias
            ? {
                rotulo: `a redação de ${curto(anterior.enviadaEm)}`,
                curto: curto(anterior.enviadaEm),
                competencias: anterior.competencias,
              }
            : undefined
        }
        atual={{ rotulo: "esta", curto: "agora" }}
        enviadaEm={dataHora(r.enviadaEm)}
        acaoSemAnterior={
          sugerida && (
            <Button asChild variant="outline">
              <Link to="/app/redacao/$id" params={{ id: sugerida.id }}>
                Escrever outra redação
                <ArrowRight />
              </Link>
            </Button>
          )
        }
        acao={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <Link to="/app/redacao/$id" params={{ id: r.propostaId }}>
                <PenLine />
                Reescrever este tema
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/app/redacao">Ver minhas redações</Link>
            </Button>
          </div>
        }
      />
    </>
  );
}

/** Redação enviada sem correção (a IA falhou, ficou sem cota ou não leu a foto): permite pedir de novo. */
function AguardandoCorrecao({ redacao }: { redacao: RedacaoCompleta }) {
  const cliente = useQueryClient();
  const [falha, setFalha] = useState<FalhaCorrecao | null>(
    () => falhasRecentes.get(redacao.id) ?? null,
  );
  const [corrigindo, setCorrigindo] = useState(false);
  const [novas, setNovas] = useState<FotoEscolhida[]>([]);
  const [trocando, setTrocando] = useState(false);
  // Trocar a foto fica sempre à mão nas redações por foto (mesmo depois de recarregar a página).
  const [mostrarTroca, setMostrarTroca] = useState(false);
  useLiberarPrevias(novas);
  const avaliadas = useAvancoCorrecao(corrigindo);
  const porFoto = redacao.fotos.length > 0;

  async function pedir() {
    setCorrigindo(true);
    setFalha(null);
    const erro = await corrigirRedacao(redacao.id);
    if (erro) falhasRecentes.set(redacao.id, erro);
    else falhasRecentes.delete(redacao.id);
    setCorrigindo(false);
    if (erro) return setFalha(erro);
    toast.success("Sua devolutiva está pronta");
    await Promise.all([
      cliente.invalidateQueries({ queryKey: ["redacao", redacao.id] }),
      cliente.invalidateQueries({ queryKey: ["minhas-redacoes"] }),
    ]);
  }

  async function trocarEPedir() {
    setTrocando(true);
    try {
      await trocarFotosRedacao(
        redacao.id,
        novas.map((f) => f.arquivo),
      );
    } catch (e) {
      setTrocando(false);
      const mensagem = e instanceof Error ? e.message : "A foto não subiu. Tente de novo.";
      // Sem mais trocas (ou já corrigida): some o seletor de fotos e fica só a mensagem.
      const fim = /algumas vezes|já foi corrigida/.test(mensagem);
      if (fim) setMostrarTroca(false);
      return setFalha({ mensagem, ilegivel: !fim });
    }
    novas.forEach((f) => URL.revokeObjectURL(f.previa));
    setNovas([]);
    setMostrarTroca(false);
    void cliente.invalidateQueries({ queryKey: ["redacao", redacao.id] });
    await pedir();
    setTrocando(false);
  }

  return (
    <>
      <Titulo sobretitulo={`Enviada em ${dataHora(redacao.enviadaEm)}`} titulo={redacao.tema} />
      <EtapasRedacao atual={3} />
      {corrigindo ? (
        <Corrigindo
          titulo={(t) => <h2 className="text-[22px] font-bold">{t}</h2>}
          avaliadas={avaliadas}
        />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Cartao>
            {porFoto ? (
              <FotosDaFolha fotos={redacao.fotos} titulo="Sua folha" />
            ) : (
              <>
                <h2 className="text-[22px] font-bold">Seu texto</h2>
                <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                  {redacao.palavras} palavras
                </p>
                <div className="mt-5 space-y-4 text-[17px] leading-[1.8]">
                  {redacao.texto
                    .split("\n")
                    .filter((p) => p.trim())
                    .map((p, i) => (
                      <p key={i} className="indent-8">
                        {p}
                      </p>
                    ))}
                </div>
              </>
            )}
          </Cartao>
          <div className="space-y-4 xl:sticky xl:top-6">
            <Cartao>
              <p className="flex items-center gap-2 font-semibold">
                {falha?.ilegivel ? (
                  <Camera className="size-5 text-rosa" aria-hidden />
                ) : (
                  <Clock className="size-5 text-rosa" aria-hidden />
                )}
                {falha?.ilegivel ? "Precisamos de outra foto" : "Aguardando correção"}
              </p>
              <p className="mt-2 text-muted-foreground" aria-live="polite">
                {falha?.mensagem ??
                  "Sua redação está guardada. Toque abaixo para pedir a correção da IA."}
              </p>
              {porFoto && (falha?.ilegivel || mostrarTroca) ? (
                <div className="mt-4 space-y-4">
                  <EscolherFotos fotos={novas} aoMudar={setNovas} desativado={trocando} />
                  {mostrarTroca && !falha?.ilegivel && !trocando && (
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        novas.forEach((f) => URL.revokeObjectURL(f.previa));
                        setNovas([]);
                        setMostrarTroca(false);
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                  {novas.length > 0 && (
                    <Button className="w-full" onClick={trocarEPedir} disabled={trocando}>
                      {trocando ? <Loader2 className="animate-spin" /> : <Send />}
                      {trocando ? "Enviando a foto…" : "Enviar nova foto"}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <Button className="w-full" onClick={pedir}>
                    <RefreshCw />
                    Pedir correção
                  </Button>
                  {porFoto && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setMostrarTroca(true)}
                    >
                      <Camera />
                      Trocar a foto
                    </Button>
                  )}
                </div>
              )}
            </Cartao>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Enquanto a IA corrige (de 10 a 60 segundos), as competências vão sendo marcadas sem chegar
 * à última: a quinta só fecha quando a devolutiva chega.
 */
function useAvancoCorrecao(ativo: boolean) {
  const [avaliadas, setAvaliadas] = useState(0);
  useEffect(() => {
    if (!ativo) return;
    setAvaliadas(0);
    const limite = competenciasCurtas.length - 1;
    const intervalo = setInterval(() => setAvaliadas((n) => Math.min(n + 1, limite)), 5000);
    return () => clearInterval(intervalo);
  }, [ativo]);
  return avaliadas;
}

/* ---------- Envio: Proposta → Foto → Revisar → Corrigindo → Devolutiva ---------- */

const Etapa = { Proposta: 0, Foto: 1, Revisar: 2, Corrigindo: 3 } as const;
type Etapa = (typeof Etapa)[keyof typeof Etapa];

/** Avançar entra pela direita; voltar, pela esquerda. null: a 1ª etapa, que entra com a página. */
type Direcao = "frente" | "tras" | null;

/** Dicas para a IA conseguir ler a letra. */
const dicasFoto = [
  "A folha inteira aparece na foto, sem cortar as bordas.",
  "Celular de cima, reto sobre a folha.",
  "Boa luz, sem sombra da mão ou do celular.",
  "Caneta escura e letra legível. Usou o verso? Mande 2 fotos.",
];

function EditorRedacao({ proposta }: { proposta: PropostaReal }) {
  const navigate = useNavigate();
  const cliente = useQueryClient();
  const [etapa, setEtapa] = useState<Etapa>(Etapa.Proposta);
  const [fotos, setFotos] = useState<FotoEscolhida[]>([]);
  const [direcao, setDirecao] = useState<Direcao>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const minhas = useMinhasRedacoes();
  useLiberarPrevias(fotos);
  const avaliadas = useAvancoCorrecao(etapa === Etapa.Corrigindo);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const etapasRef = useRef<HTMLDivElement>(null);
  const etapaAnterior = useRef(etapa);

  // A cada troca de etapa: volta ao topo (ou às etapas) e leva o foco ao título da etapa.
  useEffect(() => {
    if (etapaAnterior.current === etapa) return;
    etapaAnterior.current = etapa;
    if (etapa === Etapa.Corrigindo) etapasRef.current?.scrollIntoView({ block: "start" });
    else window.scrollTo({ top: 0 });
    tituloRef.current?.focus({ preventScroll: true });
  }, [etapa]);

  function irPara(nova: Etapa) {
    setDirecao(nova > etapa ? "frente" : "tras");
    setEtapa(nova);
  }

  /** Confere o limite do dia antes de subir fotos que não poderiam ser enviadas. */
  const chegouAoLimite = () =>
    (minhas.data ? enviadasHoje(minhas.data) : 0) >= regrasRedacao.porDia;
  const AVISO_LIMITE = `Você já enviou ${regrasRedacao.porDia} redações hoje. Amanhã tem mais! Guarde a sua folha e mande a foto amanhã.`;

  async function confirmarEnvio() {
    setErroEnvio(null);
    if (chegouAoLimite()) return setErroEnvio(AVISO_LIMITE);
    setEnviando(true);
    let id: string;
    try {
      id = await enviarRedacaoFoto(
        proposta.id,
        fotos.map((f) => f.arquivo),
      );
    } catch (e) {
      setEnviando(false);
      setErroEnvio(e instanceof Error ? e.message : "Não deu para enviar agora.");
      return;
    }
    irPara(Etapa.Corrigindo);
    const falha = await corrigirRedacao(id);
    if (falha) falhasRecentes.set(id, falha);
    await cliente.invalidateQueries({ queryKey: ["minhas-redacoes"] });
    void navigate({ to: "/app/redacao/$id", params: { id }, replace: true });
  }

  const tituloEtapa = (rotulo: string) => (
    <h2 ref={tituloRef} tabIndex={-1} className="text-[22px] font-bold focus:outline-none">
      {rotulo}
    </h2>
  );

  return (
    <>
      <Titulo sobretitulo={`Proposta de redação · ${proposta.eixo}`} titulo={proposta.tema} />
      <div className="-mt-2 mb-6">
        <SeloPrevia />
      </div>
      <div ref={etapasRef} className="scroll-mt-4">
        <EtapasRedacao atual={etapa} />
      </div>

      {/* Cada etapa monta de novo (key) e entra pelo lado do movimento: avançar pela direita,
          voltar pela esquerda. O foco vai para o título da etapa. */}
      <div
        key={etapa}
        className={cn(
          direcao === "frente" && "anima-da-direita motion-reduce:animate-none",
          direcao === "tras" && "anima-da-esquerda motion-reduce:animate-none",
        )}
      >
        {etapa === Etapa.Proposta && (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0 space-y-6">
              <Cartao>
                {tituloEtapa("Leia a proposta")}
                <p className="mt-3">{instrucaoProposta}</p>
                <div className="mt-4 rounded-xl bg-creme px-4 py-3">
                  <p className="text-sm font-semibold text-muted-foreground">Tema</p>
                  <p className="mt-0.5 font-display text-xl font-bold leading-snug">
                    {proposta.tema}
                  </p>
                </div>
              </Cartao>
              {proposta.textos.length > 0 && (
                <Cartao titulo="Textos motivadores">
                  <TextosMotivadores textos={proposta.textos} />
                </Cartao>
              )}
              <Cartao titulo="Estrutura sugerida">
                <EstruturaSugerida />
              </Cartao>
            </div>
            <div className="space-y-6 xl:sticky xl:top-6">
              <Cartao titulo="Regras da folha">
                <ul className="space-y-3">
                  {regrasProposta.map((r) => (
                    <li key={r} className="flex gap-3">
                      <Check className="mt-1 size-5 shrink-0 text-laranja-acao" aria-hidden />
                      {r}
                    </li>
                  ))}
                </ul>
              </Cartao>
              <div className="space-y-3">
                <p className="flex items-start gap-2 text-muted-foreground">
                  <PenLine className="mt-1 size-5 shrink-0" aria-hidden />
                  Escreva à mão, numa folha pautada. Quando terminar, volte aqui e tire a foto.
                </p>
                <Button className="w-full" size="lg" onClick={() => irPara(Etapa.Foto)}>
                  <Camera />
                  Já escrevi: enviar a foto
                </Button>
                {chegouAoLimite() && (
                  <p className="flex items-start gap-2 rounded-xl bg-mostarda/25 px-4 py-3 text-marrom">
                    <AlertCircle className="mt-1 size-5 shrink-0" aria-hidden />
                    {AVISO_LIMITE}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {etapa === Etapa.Foto && (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <Cartao>
              {tituloEtapa("Tire a foto da sua redação")}
              <p className="mt-1 mb-5 text-muted-foreground">
                A IA lê a sua letra direto da foto e corrige pelas 5 competências do ENEM.
              </p>
              <EscolherFotos fotos={fotos} aoMudar={setFotos} />
              <p className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                Não escreva seu nome na folha: a foto é lida por uma IA do Google (Gemini) e fica
                guardada só para você e a coordenação do seu Compaz.
              </p>
            </Cartao>
            <div className="space-y-6 xl:sticky xl:top-6">
              <Cartao titulo="Para a IA ler bem">
                <ul className="space-y-3">
                  {dicasFoto.map((d) => (
                    <li key={d} className="flex gap-3">
                      <Check className="mt-1 size-5 shrink-0 text-laranja-acao" aria-hidden />
                      {d}
                    </li>
                  ))}
                </ul>
              </Cartao>
              <div className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => irPara(Etapa.Revisar)}
                  disabled={fotos.length === 0}
                >
                  Continuar
                  <ArrowRight />
                </Button>
                <Button variant="outline" className="w-full" onClick={() => irPara(Etapa.Proposta)}>
                  <ArrowLeft />
                  Ver a proposta de novo
                </Button>
              </div>
            </div>
          </div>
        )}

        {etapa === Etapa.Revisar && (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <Cartao>
              {tituloEtapa("Confira antes de enviar")}
              <p className="mt-1 mb-5 text-muted-foreground">
                Dá para ler tudo na foto? Se não, volte e tire outra.
              </p>
              <EscolherFotos fotos={fotos} aoMudar={setFotos} desativado />
            </Cartao>
            <div className="space-y-6 xl:sticky xl:top-6">
              <Cartao titulo="Confira">
                <ChecklistRevisao />
              </Cartao>
              <div className="space-y-3">
                <Button
                  className="w-full"
                  onClick={confirmarEnvio}
                  disabled={enviando || fotos.length === 0}
                >
                  {enviando ? <Loader2 className="animate-spin" /> : <Send />}
                  {enviando ? "Enviando a foto…" : "Enviar para correção"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => irPara(Etapa.Foto)}
                  disabled={enviando}
                >
                  <ArrowLeft />
                  Trocar a foto
                </Button>
                <div aria-live="polite">
                  {erroEnvio && (
                    <p className="flex items-start gap-2 rounded-xl bg-mostarda/25 px-4 py-3 text-marrom">
                      <AlertCircle className="mt-1 size-5 shrink-0" aria-hidden />
                      {erroEnvio}
                    </p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  A devolutiva costuma chegar em menos de um minuto. Você pode enviar até{" "}
                  {regrasRedacao.porDia} redações por dia.
                </p>
              </div>
            </div>
          </div>
        )}

        {etapa === Etapa.Corrigindo && <Corrigindo titulo={tituloEtapa} avaliadas={avaliadas} />}
      </div>
    </>
  );
}

/**
 * Carregamento com significado: as 5 competências são marcadas uma a uma (o Check entra com um
 * pop), a barra avança a cada uma e, no fim, a devolutiva é montada. O leitor de tela ouve o
 * título ao chegar (foco) e um aviso quando as 5 estão avaliadas.
 */
function Corrigindo({
  titulo,
  avaliadas,
}: {
  titulo: (rotulo: string) => ReactNode;
  avaliadas: number;
}) {
  const total = competenciasCurtas.length;
  const pronta = avaliadas >= total;
  return (
    <section
      className="cartao mx-auto max-w-xl px-5 py-6 text-center sm:px-6 sm:py-10 md:px-10"
      aria-busy="true"
    >
      {/* Ícone só onde sobra altura: no celular, a lista de competências vem primeiro. */}
      <span className="mx-auto mb-5 hidden size-16 place-items-center rounded-2xl bg-rosa/10 text-rosa sm:grid">
        <Sparkles className="size-8" aria-hidden />
      </span>
      {titulo("Corrigindo sua redação")}
      <p className="mt-2 text-muted-foreground">
        A IA está lendo sua redação e estimando cada uma das {total} competências do ENEM.
      </p>
      <div className="mt-6 text-left">
        <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
          <span className="font-semibold">
            {pronta ? mensagensCorrecao.preparando : mensagensCorrecao.avaliando}
          </span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {avaliadas} de {total}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Competências avaliadas"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={avaliadas}
          aria-valuetext={`${avaliadas} de ${total} competências avaliadas`}
          className="h-2 overflow-hidden rounded-full bg-creme ring-1 ring-linha"
        >
          <Preenchimento fracao={avaliadas / total} className="rounded-full bg-rosa" />
        </div>
      </div>
      <ol className="mt-5 space-y-1 text-left">
        {competenciasCurtas.map((nome, i) => {
          const feita = i < avaliadas;
          const agora = i === avaliadas;
          return (
            <li
              key={nome}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-xl px-3 transition-colors",
                agora
                  ? "bg-rosa/8 font-semibold text-marrom"
                  : feita
                    ? "text-marrom"
                    : "text-muted-foreground",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors",
                  feita
                    ? "border-rosa bg-rosa text-offwhite"
                    : agora
                      ? "border-rosa text-rosa"
                      : "border-borda-controle",
                )}
              >
                {feita ? (
                  <Check className="anima-pop motion-reduce:animate-none size-4" strokeWidth={3} />
                ) : agora ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
              </span>
              <span>
                <span aria-hidden>C{i + 1} · </span>
                <span className="sr-only">Competência {i + 1}: </span>
                {nome}
                <span className="sr-only">
                  {feita ? ", avaliada" : agora ? ", em avaliação" : ", na fila"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">
        {pronta ? `As ${total} competências foram avaliadas. ${mensagensCorrecao.preparando}.` : ""}
      </p>
    </section>
  );
}

/* ---------- Peças do editor ---------- */

function EstruturaSugerida() {
  return (
    <ol className="space-y-4">
      {estruturaRedacao.map((e, i) => (
        <li key={e.parte} className="flex gap-3">
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-full bg-creme text-sm font-bold ring-1 ring-linha"
          >
            {i + 1}
          </span>
          <span>
            <span className="block font-semibold">{e.parte}</span>
            <span className="block text-muted-foreground">{e.dica}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function TextosMotivadores({ textos }: { textos: TextoMotivador[] }) {
  const romanos = ["I", "II", "III", "IV", "V", "VI"];
  return (
    <ol className="space-y-4">
      {textos.map((t, i) => (
        <li key={i} className="rounded-xl bg-creme p-4 md:p-5">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Texto {romanos[i]}
          </p>
          <p className="mt-2">{t.texto}</p>
          {t.fonte && <p className="mt-2 text-sm text-muted-foreground">{t.fonte}</p>}
        </li>
      ))}
    </ol>
  );
}

function ChecklistRevisao() {
  const [marcados, setMarcados] = useState<number[]>([]);
  return (
    <ul className="space-y-2">
      {checklistRevisao.map((item, i) => (
        <li key={item}>
          <OpcaoMarcavel
            marcado={marcados.includes(i)}
            aoMudar={(marcado) =>
              setMarcados((m) => (marcado ? [...m, i] : m.filter((x) => x !== i)))
            }
            className="items-start p-3"
          >
            {item}
          </OpcaoMarcavel>
        </li>
      ))}
    </ul>
  );
}
