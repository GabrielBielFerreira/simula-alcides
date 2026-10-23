import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Loader2,
  PenLine,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { propostas, redacoesMaria } from "@/data/prototipo";
import {
  checklistRevisao,
  competenciasCurtas,
  contarRedacao,
  dataPorExtenso,
  datasRedacoes,
  detalhesPropostas,
  devolutivas,
  estruturaRedacao,
  instrucaoProposta,
  mensagensCorrecao,
  propostaSugerida,
  regrasProposta,
  regrasRedacao,
  textosRedacao,
  type TextoMotivador,
} from "@/data/estudante";
import { EstadoVazio, Preenchimento } from "@/components/ds";
import { Cartao, Titulo } from "./shared";
import { OpcaoMarcavel } from "./controles";
import { Devolutiva, EtapasRedacao, SeloPrevia } from "./redacao-pecas";

type Proposta = (typeof propostas)[number];
type RedacaoMaria = (typeof redacoesMaria)[number];

/** /app/redacao/$id · editor (ids de propostas) ou devolutiva (ids das redações de Maria). */
export function RedacaoDetalhe({ id }: { id: string }) {
  const proposta = propostas.find((p) => p.id === id);
  const redacao = redacoesMaria.find((r) => r.id === id);
  return (
    <>
      <Button asChild variant="ghost" className="mb-4 -ml-3">
        <Link to="/app/redacao">
          <ArrowLeft />
          Voltar para Redação
        </Link>
      </Button>
      {redacao ? (
        <DevolutivaMaria redacao={redacao} />
      ) : proposta ? (
        <EditorRedacao key={proposta.id} proposta={proposta} />
      ) : (
        <EstadoVazio
          titulo="Não encontramos isso por aqui"
          texto="Essa proposta ou redação não está mais disponível. Que tal escolher um tema?"
          acao={
            <Button asChild>
              <Link to="/app/redacao">Ver propostas</Link>
            </Button>
          }
        />
      )}
    </>
  );
}

/* ---------- Devolutiva das redações de Maria (julho e setembro) ---------- */

function DevolutivaMaria({ redacao }: { redacao: RedacaoMaria }) {
  const indice = redacoesMaria.indexOf(redacao);
  const anterior = indice > 0 ? redacoesMaria[indice - 1] : undefined;
  const seguinte = redacoesMaria[indice + 1];
  const data = dataPorExtenso(datasRedacoes[redacao.id]);
  return (
    <>
      <Titulo sobretitulo={`Devolutiva · ${redacao.mes} de 2026`} titulo={redacao.tema} />
      <div className="-mt-2 mb-6">
        <SeloPrevia />
      </div>
      <EtapasRedacao atual={4} />
      <Devolutiva
        dados={devolutivas[redacao.id as "julho" | "setembro"]}
        texto={textosRedacao[redacao.id]}
        anterior={
          anterior && {
            rotulo: anterior.mes,
            curto: anterior.mes.slice(0, 3),
            competencias: anterior.competencias,
          }
        }
        atual={{ rotulo: redacao.mes, curto: redacao.mes.slice(0, 3) }}
        enviadaEm={data}
        acaoSemAnterior={
          seguinte && (
            <Button asChild variant="outline">
              <Link to="/app/redacao/$id" params={{ id: seguinte.id }}>
                Ver a devolutiva de {seguinte.mes}
                <ArrowRight />
              </Link>
            </Button>
          )
        }
        acao={
          <Button asChild className="w-full sm:w-auto">
            <Link to="/app/redacao/$id" params={{ id: propostaSugerida.id }}>
              <PenLine />
              Escrever a próxima redação
            </Link>
          </Button>
        }
      />
    </>
  );
}

/* ---------- Editor: Proposta → Escrever → Revisar → Corrigindo → Devolutiva ---------- */

const Etapa = { Proposta: 0, Escrever: 1, Revisar: 2, Corrigindo: 3, Devolutiva: 4 } as const;
type Etapa = (typeof Etapa)[keyof typeof Etapa];

type Aviso = "curto" | "longo" | null;
/** Avançar entra pela direita; voltar, pela esquerda. null: a 1ª etapa, que entra com a página. */
type Direcao = "frente" | "tras" | null;

function EditorRedacao({ proposta }: { proposta: Proposta }) {
  const detalhe = detalhesPropostas[proposta.id];
  const chave = `simula-redacao-${proposta.id}`;
  const [etapa, setEtapa] = useState<Etapa>(Etapa.Proposta);
  const [texto, setTexto] = useState("");
  const [temRascunho, setTemRascunho] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);
  // Cada tentativa de envio fora do limite faz o aviso surgir de novo.
  const [tentativasEnvio, setTentativasEnvio] = useState(0);
  const [direcao, setDirecao] = useState<Direcao>(null);
  // Competências já avaliadas na etapa "Corrigindo" (de 0 a 5).
  const [avaliadas, setAvaliadas] = useState(0);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const etapasRef = useRef<HTMLDivElement>(null);
  const etapaAnterior = useRef(etapa);
  const { linhas, palavras } = contarRedacao(texto);
  const ultimaRedacao = redacoesMaria[redacoesMaria.length - 1];

  // Rascunho salvo neste aparelho (só no cliente).
  useEffect(() => {
    try {
      const salvo = sessionStorage.getItem(chave);
      if (salvo) {
        setTexto(salvo);
        setTemRascunho(true);
      }
    } catch {
      // Sem acesso ao armazenamento (ex.: aba anônima): começa sem rascunho.
    }
  }, [chave]);

  // A cada troca de etapa: volta ao topo (ou às etapas) e leva o foco ao título da etapa.
  useEffect(() => {
    if (etapaAnterior.current === etapa) return;
    etapaAnterior.current = etapa;
    // Em "Corrigindo" e na devolutiva, a tela começa nas etapas: no celular, o progresso e a
    // nota ficam à vista logo de cara (o cabeçalho da proposta já foi visto).
    if (etapa === Etapa.Corrigindo || etapa === Etapa.Devolutiva)
      etapasRef.current?.scrollIntoView({ block: "start" });
    else window.scrollTo({ top: 0 });
    tituloRef.current?.focus({ preventScroll: true });
  }, [etapa]);

  // "Corrigindo" simulado: marca as 5 competências uma a uma e, no fim, abre a devolutiva.
  useEffect(() => {
    if (etapa !== Etapa.Corrigindo) return;
    setAvaliadas(0);
    const total = competenciasCurtas.length;
    const passo = regrasRedacao.duracaoCorrecao / (total + 1);
    const intervalo = setInterval(() => setAvaliadas((n) => Math.min(n + 1, total)), passo);
    const fim = setTimeout(() => {
      setDirecao("frente");
      setEtapa(Etapa.Devolutiva);
    }, regrasRedacao.duracaoCorrecao);
    return () => {
      clearInterval(intervalo);
      clearTimeout(fim);
    };
  }, [etapa]);

  function irPara(nova: Etapa) {
    setDirecao(nova > etapa ? "frente" : "tras");
    setEtapa(nova);
  }

  function salvarRascunho() {
    try {
      sessionStorage.setItem(chave, texto);
    } catch {
      toast.error("Não deu para salvar neste aparelho", {
        description: "O navegador bloqueou o armazenamento. Copie seu texto para não perder.",
      });
      return;
    }
    setTemRascunho(true);
    toast.success("Rascunho salvo", { description: "Ele fica guardado neste aparelho." });
  }

  function enviarParaCorrecao() {
    const problema: Aviso =
      linhas < regrasRedacao.minLinhas
        ? "curto"
        : linhas > regrasRedacao.maxLinhas
          ? "longo"
          : null;
    setAviso(problema);
    if (problema) return setTentativasEnvio((n) => n + 1);
    irPara(Etapa.Revisar);
  }

  function confirmarEnvio() {
    try {
      sessionStorage.removeItem(chave);
    } catch {
      // Sem armazenamento, não há rascunho para apagar.
    }
    irPara(Etapa.Corrigindo);
  }

  const tituloEtapa = (rotulo: string) => (
    <h2 ref={tituloRef} tabIndex={-1} className="text-[22px] font-bold focus:outline-none">
      {rotulo}
    </h2>
  );

  return (
    <>
      <Titulo sobretitulo={`Proposta de redação · ${detalhe.eixo}`} titulo={proposta.tema} />
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
              <Cartao titulo="Textos motivadores">
                <TextosMotivadores textos={detalhe.textos} />
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
              <Button className="w-full" size="lg" onClick={() => irPara(Etapa.Escrever)}>
                <PenLine />
                {temRascunho ? "Continuar rascunho" : "Começar a escrever"}
              </Button>
            </div>
          </div>
        )}

        {etapa === Etapa.Escrever && (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0 space-y-5">
              {tituloEtapa("Escreva sua redação")}
              <section className="cartao p-5 md:p-6" aria-label="Tema e textos motivadores">
                <p className="text-sm font-semibold text-muted-foreground">Tema</p>
                <p className="mt-1 font-display text-xl font-bold leading-snug">{proposta.tema}</p>
                <Recolhivel titulo={`Textos motivadores (${detalhe.textos.length})`}>
                  <TextosMotivadores textos={detalhe.textos} />
                </Recolhivel>
                {/* No celular e no notebook pequeno, a estrutura fica recolhida aqui; no desktop, ao lado. */}
                <Recolhivel titulo="Estrutura sugerida" className="xl:hidden">
                  <EstruturaSugerida />
                </Recolhivel>
              </section>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4">
                  <label htmlFor="texto-redacao" className="font-semibold">
                    Sua redação
                  </label>
                  <Button
                    variant="link"
                    className="min-h-11 px-0 text-sm"
                    onClick={() => {
                      // Como na folha do ENEM: parágrafos em linhas seguidas, sem linha em branco.
                      setTexto(textosRedacao[proposta.id].replace(/\n+/g, "\n"));
                      setAviso(null);
                    }}
                  >
                    Preencher com texto de exemplo
                  </Button>
                </div>
                <FolhaRedacao
                  valor={texto}
                  aoMudar={(v) => {
                    setTexto(v);
                    if (aviso) setAviso(null);
                  }}
                  invalido={aviso !== null}
                />
                <Contador linhas={linhas} palavras={palavras} />
                <div aria-live="polite">
                  {aviso && (
                    <p
                      key={tentativasEnvio}
                      className="anima-surgir motion-reduce:animate-none mt-3 flex origin-top items-start gap-2 rounded-xl bg-mostarda/25 px-4 py-3 text-marrom"
                    >
                      <AlertCircle className="mt-1 size-5 shrink-0" aria-hidden />
                      {aviso === "curto"
                        ? `Escreva pelo menos ${regrasRedacao.minLinhas} linhas para enviar. No ENEM, textos com até ${regrasRedacao.minLinhas - 1} linhas recebem nota zero.`
                        : `Seu texto passou de ${regrasRedacao.maxLinhas} linhas. No ENEM, o que passa da última linha não é lido. Que tal enxugar um parágrafo?`}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={salvarRascunho}>
                  <Save />
                  Salvar rascunho
                </Button>
                <Button onClick={enviarParaCorrecao}>
                  <Send />
                  Enviar para correção
                </Button>
              </div>
            </div>

            <Cartao
              titulo="Estrutura sugerida"
              className="hidden xl:sticky xl:top-6 xl:mt-12 xl:block"
            >
              <EstruturaSugerida />
            </Cartao>
          </div>
        )}

        {etapa === Etapa.Revisar && (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <Cartao>
              {tituloEtapa("Revise antes de enviar")}
              <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                {linhas} de {regrasRedacao.maxLinhas} linhas · {palavras} palavras
              </p>
              <div className="mt-5 space-y-4 text-[17px] leading-[1.8]">
                {texto
                  .split("\n")
                  .filter((p) => p.trim())
                  .map((p, i) => (
                    <p key={i} className="indent-8">
                      {p}
                    </p>
                  ))}
              </div>
            </Cartao>
            <div className="space-y-6 xl:sticky xl:top-6">
              <Cartao titulo="Confira">
                <ChecklistRevisao />
              </Cartao>
              <div className="space-y-3">
                <Button className="w-full" onClick={confirmarEnvio}>
                  <Send />
                  Confirmar envio
                </Button>
                <Button variant="outline" className="w-full" onClick={() => irPara(Etapa.Escrever)}>
                  <ArrowLeft />
                  Voltar e editar
                </Button>
                <p className="text-sm text-muted-foreground">
                  Depois de enviar, o texto não muda mais. A devolutiva chega em instantes.
                </p>
              </div>
            </div>
          </div>
        )}

        {etapa === Etapa.Corrigindo && <Corrigindo titulo={tituloEtapa} avaliadas={avaliadas} />}

        {etapa === Etapa.Devolutiva && (
          <>
            <div className="mb-6">
              {tituloEtapa("Sua devolutiva está pronta")}
              <p className="mt-2 text-muted-foreground">
                Veja o que já funciona no seu texto e o que dá para melhorar na próxima.
              </p>
            </div>
            <Devolutiva
              exemplo
              dados={devolutivas.exemplo}
              texto={texto}
              anterior={{
                rotulo: ultimaRedacao.mes,
                curto: ultimaRedacao.mes.slice(0, 3),
                competencias: ultimaRedacao.competencias,
              }}
              atual={{ rotulo: "agora", curto: "agora" }}
              acao={
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link to="/app/redacao">
                    Ver minhas redações
                    <ArrowRight />
                  </Link>
                </Button>
              }
            />
          </>
        )}
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
        A IA está lendo seu texto e estimando cada uma das {total} competências do ENEM.
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

/** Bloco recolhível dentro do cartão do tema (textos motivadores, estrutura). */
function Recolhivel({
  titulo,
  children,
  className,
}: {
  titulo: string;
  children: ReactNode;
  className?: string;
}) {
  // O conteúdo monta de novo a cada abertura, para o fade curto tocar sempre.
  const [aberturas, setAberturas] = useState(0);
  return (
    <details
      className={cn("group mt-4 border-t border-linha pt-2", className)}
      onToggle={(e) => {
        if (e.currentTarget.open) setAberturas((n) => n + 1);
      }}
    >
      <summary className="-mx-2 flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-2 font-semibold hover:bg-creme/60 [&::-webkit-details-marker]:hidden">
        {titulo}
        <ChevronDown
          className="size-5 shrink-0 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div key={aberturas} className="anima-aparecer motion-reduce:animate-none mt-3">
        {children}
      </div>
    </details>
  );
}

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
  const romanos = ["I", "II", "III", "IV"];
  return (
    <ol className="space-y-4">
      {textos.map((t, i) => (
        <li key={t.fonte} className="rounded-xl bg-creme p-4 md:p-5">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Texto {romanos[i]}
          </p>
          <p className="mt-2">{t.texto}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t.fonte}</p>
        </li>
      ))}
    </ol>
  );
}

/** Área de texto com pauta, como a folha de redação. */
function FolhaRedacao({
  valor,
  aoMudar,
  invalido,
}: {
  valor: string;
  aoMudar: (v: string) => void;
  invalido: boolean;
}) {
  const altura = 32; // altura de cada linha da pauta, em px
  return (
    <textarea
      id="texto-redacao"
      value={valor}
      onChange={(e) => aoMudar(e.target.value)}
      aria-describedby="contador-redacao"
      aria-invalid={invalido}
      rows={14}
      spellCheck
      lang="pt-BR"
      placeholder="Comece pela introdução: apresente o tema e a sua tese."
      className={cn(
        "block min-h-[28rem] w-full resize-y rounded-2xl border-2 bg-card px-4 py-2 text-[17px] text-marrom placeholder:text-muted-foreground/80 focus-visible:outline-3 focus-visible:outline-laranja-acao md:px-6",
        invalido ? "border-mostarda" : "border-borda-controle",
      )}
      style={{
        lineHeight: `${altura}px`,
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${altura - 1}px, var(--linha) ${altura - 1}px, var(--linha) ${altura}px)`,
        backgroundPosition: "0 8px",
        backgroundAttachment: "local",
      }}
    />
  );
}

function Contador({ linhas, palavras }: { linhas: number; palavras: number }) {
  const { maxLinhas, minLinhas } = regrasRedacao;
  const passou = linhas > maxLinhas;
  return (
    <div id="contador-redacao" className="mt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        {/* Números com largura reservada (alinhados à direita): o texto ao lado não pula. */}
        <p className="tabular-nums">
          <span className="font-semibold">
            <span className="inline-block min-w-[2ch] text-right">{linhas}</span> de {maxLinhas}{" "}
            linhas
          </span>
          <span className="text-muted-foreground">
            {" "}
            · <span className="inline-block min-w-[3ch] text-right">{palavras}</span> palavras
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          Mínimo de {minLinhas} linhas · contagem aproximada
        </p>
      </div>
      {/* A barra desliza até o novo valor (transform); a marca do mínimo fica por cima. */}
      <div className="relative mt-2" aria-hidden>
        <div className="h-2 overflow-hidden rounded-full bg-creme ring-1 ring-linha">
          <Preenchimento
            fracao={linhas / maxLinhas}
            className={cn("rounded-full", passou ? "bg-mostarda" : "bg-rosa")}
          />
        </div>
        <span
          className="absolute -top-1 h-4 w-0.5 rounded-full bg-marrom/40"
          style={{ left: `${(minLinhas / maxLinhas) * 100}%` }}
        />
      </div>
    </div>
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
