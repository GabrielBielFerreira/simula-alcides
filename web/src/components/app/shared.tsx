import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { Link, linkOptions, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { Info, Check, X, Minus, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PropsGraficoEvolucao } from "./grafico-evolucao";
import {
  DURACAO,
  EstadoVazio,
  NumeroAnimado,
  Preenchimento,
  quandoEntrarNaTela,
  useMovimentoReduzido,
} from "@/components/ds";
// As rotas importam de "@/lib/pagina-head" (sem dependências); aqui fica por compatibilidade.
export { paginaHead } from "@/lib/pagina-head";
export const formato = (v: number) => v.toLocaleString("pt-BR");
export function Titulo({
  titulo,
  subtitulo,
  sobretitulo,
}: {
  titulo: string;
  subtitulo?: string;
  sobretitulo?: string;
}) {
  return (
    <header className="mb-6">
      {sobretitulo && (
        <p className="mb-2 text-sm font-bold uppercase text-laranja-acao">{sobretitulo}</p>
      )}
      <h1 className="titulo-pagina">{titulo}</h1>
      {subtitulo && <p className="mt-3 text-muted-foreground">{subtitulo}</p>}
    </header>
  );
}
export function Cartao({
  titulo,
  children,
  className = "",
}: {
  titulo?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`cartao min-w-0 p-5 md:p-6 ${className}`}>
      {titulo && <h2 className="mb-4 text-[22px] font-bold">{titulo}</h2>}
      {children}
    </section>
  );
}
export function AvisoTri() {
  return (
    <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      Percentual de acertos. Não é a nota TRI oficial do ENEM.
    </p>
  );
}
export function Contagens({
  acertos,
  erros,
  brancos,
}: {
  acertos: number;
  erros: number;
  brancos: number;
}) {
  return (
    // escalonar-filhos: os três números contam um depois do outro (50ms).
    <div className="escalonar-filhos grid grid-cols-3 gap-2">
      {[
        { n: acertos, t: "Acertos", I: Check, c: "text-acerto bg-acerto/10" },
        { n: erros, t: "Erros", I: X, c: "text-erro bg-erro/10" },
        { n: brancos, t: "Em branco", I: Minus, c: "text-branco-q-texto bg-branco-q/10" },
      ].map(({ n, t, I, c }) => (
        <div key={t} className={`rounded-xl p-3 text-center ${c}`}>
          <I className="mx-auto size-5" aria-hidden />
          <p className="font-display text-3xl font-black tabular-nums">
            <NumeroAnimado valor={n} />
          </p>
          <p className="text-sm font-semibold">{t}</p>
        </div>
      ))}
    </div>
  );
}
export function BarraResultado({
  acertos,
  erros,
  brancos,
}: {
  acertos: number;
  erros: number;
  brancos: number;
}) {
  const total = acertos + erros + brancos;
  const fracao = (n: number) => (total ? n / total : 0);
  // Camadas empilhadas, cada uma até o fim do seu trecho: em branco (fundo), erros, acertos (frente).
  // Enchem juntas da esquerda e deslizam quando os números mudam.
  return (
    <div
      role="img"
      className="relative h-3 overflow-hidden rounded-full bg-creme"
      aria-label={`${acertos} acertos, ${erros} erros, ${brancos} em branco`}
    >
      <Preenchimento fracao={fracao(total)} className="absolute inset-0 bg-branco-q" />
      <Preenchimento fracao={fracao(acertos + erros)} className="absolute inset-0 bg-erro" />
      <Preenchimento fracao={fracao(acertos)} className="absolute inset-0 bg-acerto" />
    </div>
  );
}
// O Recharts (~380KB) só baixa nas telas com gráfico, e não junto com este arquivo.
// Com internet instável o trecho pode não chegar (e o navegador guarda a falha, então não adianta
// tentar de novo na mesma página): fica a caixa vazia, do tamanho do gráfico, em vez de o erro
// derrubar a tela inteira.
const CaixaVazia = () => <div className="h-full w-full" />;
const GraficoEvolucao = lazy((): Promise<{ default: ComponentType<PropsGraficoEvolucao> }> =>
  import("./grafico-evolucao").catch(() => ({ default: CaixaVazia })),
);

export function Evolucao({
  valores,
  segunda,
  rotulos = ["fev", "abr", "jun", "ago"],
  legenda = "Seu % de acertos",
  legendaSegunda = "Média da Rede",
  rede = false,
  rotulosSegunda = false,
  duracao = DURACAO.media,
}: {
  valores: number[];
  segunda?: number[];
  rotulos?: string[];
  legenda?: string;
  legendaSegunda?: string;
  rede?: boolean;
  /** true: a segunda série ganha pontos e rótulos de valor (ex.: Rede × Externos). */
  rotulosSegunda?: boolean;
  /** Em ms, para desenhar a linha e trocar de valores. Padrão: média (360), no ritmo dos números
   * e das barras. DURACAO.longa só se o gráfico for o herói da tela. */
  duracao?: number;
}) {
  // As linhas se desenham quando o gráfico entra na tela (eixos e grade já estão lá).
  const reduzido = useMovimentoReduzido();
  const caixa = useRef<HTMLDivElement>(null);
  const [emVista, setEmVista] = useState(false);
  useEffect(() => {
    const el = caixa.current;
    return el ? quandoEntrarNaTela(el, () => setEmVista(true)) : undefined;
  }, []);
  return (
    <div ref={caixa}>
      <div className="mb-3 flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-2">
          <span className={`h-0.5 w-5 ${rede ? "bg-vinho" : "bg-laranja-acao"}`} />
          {legenda}
        </span>
        {segunda && (
          <span className="flex items-center gap-2">
            <span className="w-5 border-t border-dashed border-marrom" />
            {legendaSegunda}
          </span>
        )}
      </div>
      {/* A caixa tem altura fixa: enquanto o Recharts baixa, o espaço já é o do gráfico (sem
          salto). Se ele chegar depois de o gráfico entrar na tela, as linhas se desenham ao chegar. */}
      <div className="h-64 w-full min-w-0 md:h-72">
        <Suspense fallback={<CaixaVazia />}>
          <GraficoEvolucao
            valores={valores}
            segunda={segunda}
            rotulos={rotulos}
            rede={rede}
            rotulosSegunda={rotulosSegunda}
            duracao={duracao}
            emVista={emVista}
            reduzido={reduzido}
          />
        </Suspense>
      </div>
    </div>
  );
}
export function NaoEncontrado({ destino = "/app" }: { destino?: "/app" | "/admin" }) {
  return (
    <EstadoVazio
      titulo="Não encontramos isso por aqui"
      texto="Vamos voltar e escolher outro caminho?"
      acao={
        <Button asChild>
          <Link to={destino}>Voltar ao início</Link>
        </Button>
      }
    />
  );
}
export type Papel = "estudante" | "central" | "polo";
const CHAVE_PAPEL = "simula-papel";
const useEfeitoDeLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;
export const PapelContext = createContext<{
  papel: Papel;
  /** `comATelaNova`: o papel só muda quando a próxima tela terminar de carregar, no mesmo
   * desenho que ela (a tela antiga nunca aparece com o papel novo). */
  setPapel: (p: Papel, comATelaNova?: boolean) => void;
  pronto: boolean;
}>({ papel: "central", setPapel: () => {}, pronto: false });
/** Grava o papel sem mexer na tela atual (só em eventos, no cliente). */
function gravarPapel(p: Papel) {
  try {
    sessionStorage.setItem(CHAVE_PAPEL, p);
  } catch {}
}
/**
 * Papel escolhido no "Ver como". Lido e gravado em sessionStorage só no cliente: o HTML do
 * servidor sai com o papel padrão (coordenação central). A leitura acontece antes do 1º desenho
 * no cliente, então um layout que monta depois de trocar pelo "Ver como" já aparece certo.
 */
export function PapelProvider({ children }: { children: ReactNode }) {
  const [papel, setPapelEstado] = useState<Papel>("central");
  const [pronto, setPronto] = useState(false);
  // Papel que espera a tela nova: aplicado na mesma renderização em que o roteador monta a
  // tela nova (a última rota casada muda), antes de qualquer efeito dela rodar.
  const telaCarregada = useRouterState({
    select: (s) => s.matches[s.matches.length - 1]?.id ?? "",
  });
  const [pendente, setPendente] = useState<{ papel: Papel; desde: string } | null>(null);
  if (pendente && pendente.desde !== telaCarregada) {
    setPendente(null);
    setPapelEstado(pendente.papel);
  }
  const telaAtual = useRef(telaCarregada);
  telaAtual.current = telaCarregada;
  useEfeitoDeLayout(() => {
    try {
      const v = sessionStorage.getItem(CHAVE_PAPEL);
      if (v === "central" || v === "polo" || v === "estudante") setPapelEstado(v);
    } catch {}
    setPronto(true);
  }, []);
  // Grava na hora (só roda em eventos, no cliente): o layout de destino lê ao montar.
  const setPapel = useCallback((p: Papel, comATelaNova = false) => {
    gravarPapel(p);
    if (comATelaNova) setPendente({ papel: p, desde: telaAtual.current });
    else setPapelEstado(p);
  }, []);
  return (
    <PapelContext.Provider value={{ papel, setPapel, pronto }}>{children}</PapelContext.Provider>
  );
}
export function usePapel() {
  return useContext(PapelContext);
}
const ROTULO_VER_COMO = "Protótipo: ver como";
const destinosVerComo = {
  estudante: linkOptions({ to: "/app" }),
  central: linkOptions({ to: "/admin" }),
  polo: linkOptions({ to: "/admin/polos/$poloId", params: { poloId: "paulo-freire" } }),
};
/**
 * Depois de trocar de layout pelo "Ver como" (/app ↔ /admin), o select usado saiu da tela e o
 * foco cairia no <body>: ele vai para o "Ver como" do layout novo, se estiver à vista, ou para o
 * título da página (no celular, o "Ver como" fica num menu fechado).
 */
function focarNoLayoutNovo(principalAntigo: Element | null) {
  let quadros = 0;
  const tentar = () => {
    // Espera o layout antigo sair (até ~2s, para internet lenta).
    if (principalAntigo?.isConnected && quadros++ < 120) {
      requestAnimationFrame(tentar);
      return;
    }
    const ativo = document.activeElement;
    if (ativo && ativo !== document.body) return;
    const verComo = [
      ...document.querySelectorAll<HTMLElement>(`select[aria-label="${ROTULO_VER_COMO}"]`),
    ].find((el) => el.getClientRects().length > 0);
    const titulo = document.querySelector<HTMLElement>("main h1");
    if (!verComo && titulo && !titulo.hasAttribute("tabindex")) titulo.tabIndex = -1;
    (verComo ?? titulo)?.focus({ preventScroll: true });
  };
  requestAnimationFrame(tentar);
}
/** Seletor do protótipo. Em /app mostra "Estudante"; em /admin, o papel da coordenação. */
export function VerComo({
  sobreEscuro = false,
  aoMudar,
}: {
  sobreEscuro?: boolean;
  /** Chamado a cada troca de papel (ex.: fechar o menu do celular). */
  aoMudar?: () => void;
}) {
  const { papel, setPapel } = usePapel();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const router = useRouter();
  const noApp = path.startsWith("/app");
  const atual: Papel = noApp ? "estudante" : papel === "polo" ? "polo" : "central";
  // O select mostra a escolha na hora, enquanto a tela troca.
  const [escolhido, setEscolhido] = useState<Papel | null>(null);
  if (escolhido !== null && escolhido === atual) setEscolhido(null);
  return (
    <label className="block text-sm">
      <span
        className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold ${sobreEscuro ? "bg-white/10 text-creme" : "bg-creme text-marrom ring-1 ring-linha"}`}
      >
        Protótipo · Ver como
      </span>
      <select
        aria-label={ROTULO_VER_COMO}
        className="min-h-11 w-full cursor-pointer rounded-xl border border-borda-controle bg-card px-3 text-marrom"
        value={escolhido ?? atual}
        onChange={(e) => {
          const p = e.target.value as Papel;
          const trocaDeLayout = noApp !== (p === "estudante");
          // Dentro de um menu (sheet ou popover), sem transição de rota: ela fotografaria o menu
          // aberto e o esmaeceria sobre a tela nova. O menu fechando já faz esse papel.
          const ir = () =>
            void navigate({ ...destinosVerComo[p], viewTransition: aoMudar ? false : undefined });
          setEscolhido(p);
          aoMudar?.();
          if (trocaDeLayout) {
            // Para outro layout, só grava: a tela que vai sair continua como está (sem passar
            // por um papel intermediário) e o layout de destino lê o papel ao montar.
            gravarPapel(p);
            focarNoLayoutNovo(document.querySelector("main"));
            ir();
            return;
          }
          // No mesmo layout, o papel muda junto com a tela nova (sem a tela antiga com o papel
          // novo, que a transição de rota fotografaria). Se o destino é a tela atual, muda já.
          const mesmaTela =
            router.buildLocation(destinosVerComo[p]).href === router.state.resolvedLocation?.href;
          setPapel(p, !mesmaTela);
          if (!mesmaTela) ir();
        }}
      >
        <option value="estudante">Estudante</option>
        <option value="central">Coordenação central</option>
        {/* Rótulo curto para caber no select da sidebar (224px) sem cortar. */}
        <option value="polo">Coordenação · Paulo Freire</option>
      </select>
    </label>
  );
}
export function Tendencia({ valor }: { valor: number }) {
  const Icon = valor > 2 ? TrendingUp : valor < -2 ? TrendingDown : Minus;
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm ${valor > 2 ? "text-acerto" : valor < -2 ? "text-marrom" : "text-muted-foreground"}`}
    >
      <Icon className="size-4" />
      {Math.abs(valor) <= 2 ? "estável" : `${valor > 0 ? "+" : "−"}${Math.abs(valor)} p.p.`}
    </span>
  );
}
