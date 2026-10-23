import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Backpack,
  ChartLine,
  Check,
  Compass,
  HeartHandshake,
  Info,
  MapPin,
  School,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Campo, Preenchimento, escalonado } from "@/components/ds";
import { AvisoErro, MarcadorSelecionado } from "@/components/app/controles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { polos } from "@/data/mock";
import { toast } from "sonner";
import { atualizarMeuPerfil, POLO_UUID } from "@/lib/dados";
import { supabase } from "@/lib/supabase";
import { useSessao } from "@/lib/sessao";
import { mensagemDeErro } from "./envio";
import { ehMenorDeIdade, idadeEm } from "@/data/rules";
import { focarCampo, regras, useFormulario } from "./validacao";

const TOTAL_PASSOS = 4;
type Passo = 1 | 2 | 3 | 4;
type Vinculo = "rede" | "fora";
type Fora = "cursinho" | "conta-propria";
/** De onde veio o passo atual: avançar entra pela direita, voltar pela esquerda. */
type Direcao = "avancar" | "voltar";

const polosEmOrdem = [...polos].sort((a, b) => a.nomeCurto.localeCompare(b.nomeCurto, "pt-BR"));

/**
 * /boas-vindas · 4 passos depois do cadastro: vínculo com a Rede, polo (ou outro cursinho),
 * consentimento (com o caso de menor de 18 anos) e "Tudo pronto". Usa o nome e a data de
 * nascimento do perfil e salva o vínculo antes do "Tudo pronto".
 * Movimento: o passo novo entra pela direita ao avançar e pela esquerda ao voltar, a barra de
 * passos enche suave, a escolha marcada usa o "selecionado" do produto e o "Tudo pronto" tem
 * uma celebração sóbria (check que se desenha, um anel que se expande uma vez, título subindo).
 * O foco vai para o título de cada passo novo.
 */
export function BoasVindas() {
  const navigate = useNavigate();
  const [passo, setPasso] = useState<Passo>(1);
  const [direcao, setDirecao] = useState<Direcao | null>(null);
  const { perfil, recarregarPerfil } = useSessao();
  const [salvando, setSalvando] = useState(false);
  const [vinculo, setVinculo] = useState<Vinculo | null>(null);
  const [poloId, setPoloId] = useState<string | null>(null);
  const [fora, setFora] = useState<Fora | null>(null);
  const [aceite, setAceite] = useState(false);
  // Aviso "Escolha uma opção": depois de aparecer, fica no passo até ele mudar. Ao escolher,
  // só esmaece (resolvido), sem tirar a linha: o título e as opções não pulam no toque.
  const [erroEscolha, setErroEscolha] = useState<string | null>(null);
  const [erroResolvido, setErroResolvido] = useState(false);
  // Cada tentativa sem escolha refaz a entrada do aviso: o toque em "Continuar" sempre responde.
  const [tentativa, setTentativa] = useState(0);
  // Cartão que a pessoa acabou de escolher: só ele dá o pop do Check (não ao voltar de passo).
  const [recemEscolhido, setRecemEscolhido] = useState<string | null>(null);
  const [cobrarAceite, setCobrarAceite] = useState(false);
  const cursinho = useFormulario({ cursinho: regras.nomeCursinho }, { cursinho: "" });
  const responsavel = useFormulario({ responsavel: regras.emailResponsavel }, { responsavel: "" });

  const titulo = useRef<HTMLHeadingElement>(null);
  const avisoMenor = useRef<HTMLElement>(null);
  const primeiraRenderizacao = useRef(true);

  // A cada passo: volta ao topo e leva o foco ao título, para o leitor de tela anunciar.
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    titulo.current?.focus({ preventScroll: true });
  }, [passo]);

  useEffect(() => {
    if (fora === "cursinho") {
      document.getElementById("cursinho")?.scrollIntoView({ block: "center" });
    }
  }, [fora]);

  const nome = perfil?.nome || "Estudante";
  const primeiroNome = nome.split(/\s+/)[0];
  // Sem data (login com Google), segue como maior de idade.
  const nascimento = perfil?.data_nascimento || "2000-01-01";
  const idade = idadeEm(nascimento);
  const menor = ehMenorDeIdade(nascimento);
  const polo = vinculo === "rede" ? polos.find((p) => p.id === poloId) : undefined;

  const irPara = (p: Passo) => {
    setErroEscolha(null);
    setRecemEscolhido(null);
    setDirecao(p > passo ? "avancar" : "voltar");
    setPasso(p);
  };

  const pedirEscolha = (mensagem: string, primeiraOpcao: string) => {
    setErroEscolha(mensagem);
    setErroResolvido(false);
    setTentativa((n) => n + 1);
    focarCampo(primeiraOpcao);
  };

  const escolher = (id: string, acao: () => void) => () => {
    acao();
    setRecemEscolhido(id);
    setErroResolvido(true);
  };

  const salvar = async () => {
    if (salvando) return;
    setSalvando(true);
    try {
      await atualizarMeuPerfil({
        vinculo:
          vinculo === "rede" ? "rede" : fora === "cursinho" ? "outro_cursinho" : "independente",
        poloId: vinculo === "rede" && poloId ? POLO_UUID[poloId] : null,
        cursinhoExterno: fora === "cursinho" ? cursinho.valores.cursinho.trim() : null,
      });
      const { error } = await supabase.auth.updateUser({
        data: {
          boas_vindas: true,
          email_responsavel: menor ? responsavel.valores.responsavel.trim() : null,
        },
      });
      if (error) throw error;
      await recarregarPerfil();
      irPara(4);
    } catch (e) {
      toast.error(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  const continuar = () => {
    if (passo === 1) {
      if (!vinculo) return pedirEscolha("Escolha uma opção para continuar.", "vinculo-rede");
      return irPara(2);
    }
    if (passo === 2) {
      if (vinculo === "rede" && !poloId) {
        return pedirEscolha("Escolha seu polo para continuar.", `polo-${polosEmOrdem[0].id}`);
      }
      if (vinculo === "fora") {
        if (!fora) return pedirEscolha("Escolha uma opção para continuar.", "fora-cursinho");
        if (fora === "cursinho" && cursinho.validarTudo()) return focarCampo("cursinho");
      }
      return irPara(3);
    }
    if (passo === 3) {
      setCobrarAceite(true);
      if (menor && responsavel.validarTudo()) return focarCampo("responsavel");
      if (!aceite) {
        setTentativa((n) => n + 1);
        return focarCampo("consentimento");
      }
      return void salvar();
    }
    void navigate({ to: "/app" });
  };

  const titulos: Record<Passo, string> = {
    1: "Você faz parte da Rede de Cursinhos Populares Alcides Nascimento?",
    2: vinculo === "rede" ? "Qual é o seu polo?" : "Você participa de outro cursinho?",
    3: "Como cuidamos dos seus dados",
    4: `Tudo pronto, ${primeiroNome}!`,
  };
  const subtitulos: Record<Passo, string> = {
    1: `Que bom ter você aqui${perfil ? `, ${primeiroNome}` : ""}. Assim mostramos os simulados certos.`,
    2:
      vinculo === "rede"
        ? "Os simulados oficiais e o acompanhamento da coordenação são organizados por polo."
        : "Estudantes de qualquer cursinho, ou de nenhum, usam o Simula Alcides do mesmo jeito.",
    3: `${primeiroNome}, antes de começar, leia estes 3 pontos. É rapidinho.`,
    4: "Seu primeiro passo já foi dado. Agora é uma questão de cada vez.",
  };
  const rotuloContinuar =
    passo === 3 ? "Concordar e continuar" : passo === 4 ? "Ir para o início" : "Continuar";

  const vinculoTexto =
    vinculo === "rede"
      ? "Rede de Cursinhos Populares Alcides Nascimento"
      : fora === "cursinho"
        ? `Outro cursinho: ${cursinho.valores.cursinho.trim()}`
        : "Estudo por conta própria";

  const erroAceite = cobrarAceite && !aceite;

  // Entrada do passo: na primeira tela, sobe suave; depois, respeita a direção. O "Tudo pronto"
  // não desliza: seus itens entram em cascata (celebração).
  const entradaDoPasso =
    passo === 4
      ? ""
      : !direcao
        ? "anima-subir duracao-media"
        : direcao === "voltar"
          ? "anima-da-esquerda"
          : "anima-da-direita";

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-linha bg-card">
        <div className="mx-auto flex h-16 max-w-[720px] items-center gap-3 px-4 lg:h-20">
          <img
            src="/brand/simbolo-512.png"
            alt=""
            width={512}
            height={512}
            className="size-9 lg:hidden"
          />
          <img
            src="/brand/rcp-horizontal.png"
            alt="Rede de Cursinhos Populares Alcides Nascimento"
            width={1200}
            height={388}
            className="hidden h-11 w-auto lg:block"
          />
          <span className="hidden h-8 w-px bg-linha lg:block" aria-hidden />
          <span className="font-display text-xl font-black text-vinho">Simula Alcides</span>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-4 pb-36 pt-4 lg:pb-20 lg:pt-10">
        <div className="lg:cartao lg:p-10">
          <div className="flex min-h-11 items-center justify-between gap-3">
            {passo > 1 ? (
              <Button
                type="button"
                variant="ghost"
                className="-ml-3 px-3"
                onClick={() => irPara((passo - 1) as Passo)}
              >
                <ArrowLeft />
                Voltar
              </Button>
            ) : (
              <span aria-hidden />
            )}
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-laranja-acao tabular-nums">
              Passo {passo} de {TOTAL_PASSOS}
            </p>
          </div>
          <div
            role="progressbar"
            aria-label="Progresso das boas-vindas"
            aria-valuemin={1}
            aria-valuemax={TOTAL_PASSOS}
            aria-valuenow={passo}
            aria-valuetext={`Passo ${passo} de ${TOTAL_PASSOS}`}
            className="mt-2 grid grid-cols-4 gap-1.5"
          >
            {/* Cada trecho enche da esquerda ao avançar e esvazia ao voltar (só transform). */}
            {Array.from({ length: TOTAL_PASSOS }, (_, i) => (
              <div
                key={i}
                className="h-2 overflow-hidden rounded-full bg-creme ring-1 ring-inset ring-linha"
              >
                <Preenchimento fracao={i < passo ? 1 : 0} className="rounded-full bg-laranja" />
              </div>
            ))}
          </div>

          <div key={passo} className={cn("mt-8", entradaDoPasso)}>
            {passo === 4 && <CheckConcluido />}
            <h1
              ref={titulo}
              id="titulo-passo"
              tabIndex={-1}
              className={cn(
                "titulo-pagina outline-none",
                passo === 4 && "anima-subir duracao-longa",
              )}
              style={passo === 4 ? escalonado(2) : undefined}
            >
              {titulos[passo]}
            </h1>
            <p
              className={cn(
                "mt-3 text-muted-foreground",
                passo === 4 && "anima-subir duracao-longa",
              )}
              style={passo === 4 ? escalonado(3) : undefined}
            >
              {subtitulos[passo]}
            </p>

            <div
              className={cn("mt-7", passo === 4 && "anima-subir duracao-longa")}
              style={passo === 4 ? escalonado(4) : undefined}
            >
              {passo === 1 && (
                <GrupoEscolha erro={erroEscolha} resolvido={erroResolvido} tentativa={tentativa}>
                  <CartaoEscolha
                    id="vinculo-rede"
                    nome="vinculo"
                    marcado={vinculo === "rede"}
                    recem={recemEscolhido === "vinculo-rede"}
                    aoEscolher={escolher("vinculo-rede", () => setVinculo("rede"))}
                    icone={School}
                    titulo="Sim, estudo num polo da Rede"
                    descricao="Em um dos 6 Compaz do Recife"
                  />
                  <CartaoEscolha
                    id="vinculo-fora"
                    nome="vinculo"
                    marcado={vinculo === "fora"}
                    recem={recemEscolhido === "vinculo-fora"}
                    aoEscolher={escolher("vinculo-fora", () => setVinculo("fora"))}
                    icone={Compass}
                    titulo="Não"
                    descricao="Faço outro cursinho ou estudo por conta própria"
                  />
                </GrupoEscolha>
              )}

              {passo === 2 && vinculo === "rede" && (
                <GrupoEscolha erro={erroEscolha} resolvido={erroResolvido} tentativa={tentativa}>
                  {polosEmOrdem.map((p) => (
                    <CartaoEscolha
                      key={p.id}
                      id={`polo-${p.id}`}
                      nome="polo"
                      marcado={poloId === p.id}
                      recem={recemEscolhido === `polo-${p.id}`}
                      aoEscolher={escolher(`polo-${p.id}`, () => setPoloId(p.id))}
                      icone={MapPin}
                      titulo={p.nome}
                      descricao={p.bairro}
                    />
                  ))}
                </GrupoEscolha>
              )}

              {passo === 2 && vinculo === "fora" && (
                <>
                  <GrupoEscolha erro={erroEscolha} resolvido={erroResolvido} tentativa={tentativa}>
                    <CartaoEscolha
                      id="fora-cursinho"
                      nome="fora"
                      marcado={fora === "cursinho"}
                      recem={recemEscolhido === "fora-cursinho"}
                      aoEscolher={escolher("fora-cursinho", () => setFora("cursinho"))}
                      icone={Users}
                      titulo="Sim, participo de outro cursinho"
                      descricao="Depois é só escrever o nome dele"
                    />
                    <CartaoEscolha
                      id="fora-conta-propria"
                      nome="fora"
                      marcado={fora === "conta-propria"}
                      recem={recemEscolhido === "fora-conta-propria"}
                      aoEscolher={escolher("fora-conta-propria", () => setFora("conta-propria"))}
                      icone={Backpack}
                      titulo="Estudo por conta própria"
                      descricao="No seu ritmo, com os simulados livres"
                    />
                  </GrupoEscolha>
                  {fora === "cursinho" && (
                    <div className="anima-aparecer mt-6">
                      <Campo
                        id="cursinho"
                        rotulo="Nome do cursinho"
                        placeholder="Ex.: Cursinho Popular do Bairro"
                        autoComplete="organization"
                        required
                        {...cursinho.campo("cursinho")}
                      />
                    </div>
                  )}
                </>
              )}

              {passo === 3 && (
                <div className="space-y-6">
                  <ul className="cartao divide-y divide-linha lg:shadow-none">
                    <ItemConsentimento
                      icone={ChartLine}
                      titulo="Seus resultados viram sua evolução"
                    >
                      Guardamos suas respostas para calcular acertos, mostrar sua evolução e sugerir
                      o que estudar.
                    </ItemConsentimento>
                    {vinculo === "rede" ? (
                      <ItemConsentimento
                        icone={Users}
                        titulo={`A coordenação do ${polo?.nomeCurto ?? "seu polo"} acompanha a turma`}
                      >
                        Ela vê seu desempenho para planejar reforço. Não existe ranking, e colegas
                        não veem seus resultados.
                      </ItemConsentimento>
                    ) : (
                      <ItemConsentimento icone={Users} titulo="Você aparece separado da Rede">
                        A coordenação vê só números gerais de quem estuda fora dos polos, sem
                        ranking e sem expor ninguém.
                      </ItemConsentimento>
                    )}
                    <ItemConsentimento icone={ShieldCheck} titulo="Seus dados são seus">
                      Não vendemos nem repassamos nada. Você pode ver, corrigir ou apagar seus dados
                      quando quiser.
                    </ItemConsentimento>
                  </ul>
                  <p>
                    <Link
                      to="/privacidade"
                      target="_blank"
                      rel="noopener"
                      className="inline-flex min-h-11 items-center font-semibold text-laranja-acao underline hover:text-vinho"
                    >
                      Ler a Política de privacidade completa
                      <span className="sr-only"> (abre em nova aba)</span>
                    </Link>
                  </p>

                  {menor && (
                    <section
                      ref={avisoMenor}
                      aria-labelledby="aviso-menor-titulo"
                      className={cn("rounded-2xl border-2 border-mostarda bg-mostarda/15 p-5")}
                    >
                      <h2
                        id="aviso-menor-titulo"
                        className="flex items-start gap-3 text-xl font-bold"
                      >
                        <HeartHandshake className="mt-0.5 size-6 shrink-0" aria-hidden />
                        Você tem {idade} anos, então vamos chamar alguém junto
                      </h2>
                      <p className="mt-3">
                        Pela LGPD, quem tem menos de 18 anos precisa que uma pessoa responsável
                        saiba como usamos os dados. Mandamos um e-mail curto explicando o Simula
                        Alcides. Você já pode começar a estudar hoje.
                      </p>
                      <div className="mt-5">
                        <Campo
                          id="responsavel"
                          rotulo="E-mail de um responsável"
                          tipo="email"
                          placeholder="nome@email.com"
                          dica="Pode ser mãe, pai, avó, tio ou quem cuida de você."
                          required
                          {...responsavel.campo("responsavel")}
                        />
                      </div>
                    </section>
                  )}

                  <div className="space-y-1.5">
                    <label
                      htmlFor="consentimento"
                      className={cn(
                        "selecionavel flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border-2 bg-card p-4",
                        aceite
                          ? "selecionado"
                          : erroAceite
                            ? "border-erro"
                            : "border-borda-controle",
                      )}
                    >
                      <input
                        id="consentimento"
                        type="checkbox"
                        checked={aceite}
                        onChange={(e) => setAceite(e.target.checked)}
                        required
                        aria-invalid={erroAceite}
                        aria-describedby={erroAceite ? "consentimento-erro" : undefined}
                        className="mt-0.5 size-6 shrink-0 cursor-pointer accent-laranja-acao"
                      />
                      <span className="font-medium">
                        Li e concordo com o uso dos meus dados para o meu estudo
                        {menor ? ", e sei que meu responsável vai receber um e-mail." : "."}
                      </span>
                    </label>
                    {/* Depois de cobrado, o aviso guarda a linha: ao marcar, só esmaece e o que
                        vem abaixo (e o botão, no desktop) não sobe na hora do toque. */}
                    {cobrarAceite && (
                      <AvisoErro id="consentimento-erro" visivel={erroAceite} tentativa={tentativa}>
                        Marque a caixa para continuar.
                      </AvisoErro>
                    )}
                  </div>
                </div>
              )}

              {passo === 4 && (
                <div className="space-y-6">
                  <dl className="cartao divide-y divide-linha lg:shadow-none">
                    <LinhaResumo rotulo="Nome">{nome}</LinhaResumo>
                    <LinhaResumo rotulo="Vínculo">{vinculoTexto}</LinhaResumo>
                    {polo && (
                      <LinhaResumo rotulo="Polo">
                        {polo.nome} · {polo.bairro}
                      </LinhaResumo>
                    )}
                    <LinhaResumo rotulo="Seus dados">
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="size-4 text-laranja-acao" aria-hidden />
                        Uso dos dados combinado
                      </span>
                    </LinhaResumo>
                    {menor && (
                      <LinhaResumo rotulo="Responsável">
                        <span className="break-all">{responsavel.valores.responsavel.trim()}</span>
                        <span className="block text-sm text-muted-foreground">
                          Vai receber um e-mail explicando o Simula Alcides.
                        </span>
                      </LinhaResumo>
                    )}
                  </dl>
                  <div className="rounded-2xl bg-creme p-5">
                    <p className="text-sm font-bold uppercase tracking-[0.14em] text-laranja-acao">
                      Seu próximo passo
                    </p>
                    {vinculo === "rede" ? (
                      <p className="mt-2">
                        Faça o <strong className="font-semibold">1º Simulado da Rede</strong> na
                        versão online, com as questões que os professores do cursinho prepararam.
                      </p>
                    ) : (
                      <p className="mt-2">
                        Comece pelo <strong className="font-semibold">Simulado rápido</strong>: 20
                        questões em 1 hora, com resultado na hora.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linha bg-card px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 lg:static lg:mt-10 lg:flex lg:justify-end lg:border-0 lg:bg-transparent lg:p-0">
            <Button
              type="button"
              size="lg"
              className="w-full lg:w-auto lg:min-w-60"
              onClick={continuar}
              disabled={salvando}
            >
              {salvando ? "Salvando…" : rotuloContinuar}
              <ArrowRight />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Grupo de cartões de escolha única, nomeado pelo título do passo. */
function GrupoEscolha({
  erro,
  resolvido,
  tentativa,
  className,
  children,
}: {
  erro: string | null;
  /** A pessoa escolheu depois do aviso: ele esmaece, mas a linha fica (nada pula). */
  resolvido: boolean;
  /** Muda a cada tentativa sem escolha, para o aviso surgir de novo. */
  tentativa: number;
  className?: string;
  children: ReactNode;
}) {
  const ativo = erro !== null && !resolvido;
  return (
    <div>
      {/* O aviso vem antes das opções para nunca ficar atrás do botão fixo do celular. */}
      {erro && (
        <AvisoErro id="escolha-erro" visivel={ativo} tentativa={tentativa} className="mb-3">
          {erro}
        </AvisoErro>
      )}
      <div
        role="radiogroup"
        aria-labelledby="titulo-passo"
        aria-describedby={ativo ? "escolha-erro" : undefined}
        className={cn("grid gap-3", className)}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Cartão de escolha com semântica de radio (input nativo escondido, então as setas do
 * teclado funcionam). Selecionado: o estado padrão do produto (borda e fundo laranja-ação,
 * círculo preenchido com Check), com a mesma transição nos dois sentidos; o Check dá o pop
 * só no toque que escolheu (`recem`). O traço marrom de baixo (sombra do cartão) mora num
 * pseudo-elemento e esmaece em 140ms ao marcar, em vez de sumir de uma vez.
 */
function CartaoEscolha({
  id,
  nome,
  marcado,
  recem,
  aoEscolher,
  icone: Icone,
  titulo,
  descricao,
}: {
  id: string;
  nome: string;
  marcado: boolean;
  /** Acabou de ser escolhido (e não só montado de novo ao voltar de passo). */
  recem: boolean;
  aoEscolher: () => void;
  icone: LucideIcon;
  titulo: string;
  descricao?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "selecionavel relative flex min-h-[76px] cursor-pointer items-center gap-3 rounded-2xl border-2 bg-card p-4 active:scale-[0.99] sm:gap-4",
        "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-laranja-acao",
        "after:pointer-events-none after:absolute after:-inset-[2px] after:rounded-[inherit] after:shadow-cartao after:transition-opacity",
        marcado ? "selecionado after:opacity-0" : "border-marrom hover:bg-creme/60",
      )}
    >
      <input
        id={id}
        type="radio"
        name={nome}
        checked={marcado}
        onChange={aoEscolher}
        className="sr-only"
      />
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-creme text-laranja-acao ring-1 ring-linha sm:size-11">
        <Icone className="size-5 sm:size-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold leading-snug text-marrom">{titulo}</span>
        {descricao && <span className="mt-0.5 block text-muted-foreground">{descricao}</span>}
      </span>
      <MarcadorSelecionado marcado={marcado} recem={recem} className="size-7" />
    </label>
  );
}

/**
 * Celebração do "Tudo pronto": o círculo surge, o check se desenha e um anel suave se expande
 * uma vez e some. Decorativo (o título diz o que aconteceu).
 */
function CheckConcluido() {
  return (
    <div className="relative mb-6 size-16" aria-hidden>
      <span className="anel-celebracao absolute inset-0 rounded-full border-2 border-laranja-acao" />
      <span className="anima-pop duracao-media grid size-16 place-items-center rounded-full bg-laranja-acao text-primary-foreground">
        <svg
          viewBox="0 0 24 24"
          className="size-8"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            pathLength={1}
            d="M5 12.5 9.5 17 19 7.5"
            className="anima-desenhar [--atraso:200ms]"
          />
        </svg>
      </span>
    </div>
  );
}

function ItemConsentimento({
  icone: Icone,
  titulo,
  children,
}: {
  icone: LucideIcon;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3 p-4 sm:gap-4 sm:p-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-creme text-laranja-acao ring-1 ring-linha sm:size-11">
        <Icone className="size-5 sm:size-6" aria-hidden />
      </span>
      <span>
        <span className="block font-semibold">{titulo}</span>
        <span className="mt-1 block text-muted-foreground">{children}</span>
      </span>
    </li>
  );
}

function LinhaResumo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 p-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm font-semibold text-muted-foreground sm:pt-0.5">{rotulo}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
