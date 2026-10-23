import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowUp, Check, Scale } from "lucide-react";
import { Selo, movimentoReduzidoAgora } from "@/components/ds";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { cn } from "@/lib/utils";
import { privacidade, type BlocoTexto, type ItemLista } from "@/data/conta";

const { secoes } = privacidade;

/**
 * /privacidade · Política de privacidade (texto provisório), com índice e seções.
 * Movimento: o topo entra suave; no desktop, o índice marca a seção que está sendo lida (a
 * marca troca de item encolhendo e crescendo) e os links rolam suave até a seção (na hora,
 * com movimento reduzido), levando o foco junto.
 */
export function Privacidade() {
  const { ativa, irPara } = useSecaoAtiva();

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main id="topo" className="container-site pb-16 pt-8 md:pt-14">
        <div className="mx-auto grid max-w-[1040px] gap-8 lg:grid-cols-[240px_minmax(0,720px)] lg:gap-x-16 lg:gap-y-10">
          <header className="escalonar-filhos lg:col-start-2 lg:row-start-1">
            <div className="anima-subir duracao-media">
              <Selo>
                <Scale className="size-4" aria-hidden />
                Texto provisório, em validação jurídica
              </Selo>
            </div>
            <h1
              id="politica-titulo"
              tabIndex={-1}
              className="anima-subir duracao-media titulo-pagina mt-5"
            >
              Política de privacidade
            </h1>
            <p className="anima-subir duracao-media mt-3 text-muted-foreground">
              Como o Simula Alcides cuida dos seus dados, em linguagem direta.
            </p>
            <p className="anima-subir duracao-media mt-1 text-sm text-muted-foreground">
              Atualizada em {privacidade.atualizadaEm}
            </p>
          </header>

          <div className="anima-aparecer duracao-media [--atraso:150ms] lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <nav
              aria-labelledby="indice-titulo"
              className="cartao p-5 lg:sticky lg:top-28 lg:border-0 lg:bg-transparent lg:p-0 lg:pt-2 lg:shadow-none"
            >
              <h2
                id="indice-titulo"
                className="mb-2 font-sans text-sm font-bold uppercase tracking-[0.14em] text-laranja-acao"
              >
                Nesta página
              </h2>
              {/* No desktop: um trilho fino e uma marca grossa no item atual (forma e cor). */}
              <ol className="lg:border-l lg:border-linha">
                {secoes.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      onClick={(e) => irPara(e, s.id)}
                      aria-current={ativa === s.id ? "location" : undefined}
                      className={cn(
                        "relative flex min-h-11 items-center gap-3 py-1.5 leading-snug text-marrom transition-colors hover:text-marrom lg:pl-4",
                        ativa !== s.id && "lg:text-muted-foreground",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-y-1.5 -left-[2px] hidden w-[3px] rounded-full bg-laranja-acao transition-[scale,opacity] duration-220 lg:block",
                          ativa === s.id ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0",
                        )}
                      />
                      <span className="w-5 shrink-0 font-display font-bold tabular-nums text-laranja-acao lg:hidden">
                        {i + 1}
                      </span>
                      {s.titulo}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          <article className="min-w-0 lg:col-start-2 lg:row-start-2">
            <section
              aria-labelledby="resumo-titulo"
              className="anima-subir duracao-media rounded-2xl bg-creme p-5 [--atraso:200ms] md:p-6"
            >
              <h2 id="resumo-titulo" className="text-xl font-bold">
                Em poucas palavras
              </h2>
              <ul className="mt-4 space-y-3">
                {privacidade.resumo.map((frase) => (
                  <li key={frase} className="flex gap-3">
                    <Check className="mt-1 size-5 shrink-0 text-laranja-acao" aria-hidden />
                    {frase}
                  </li>
                ))}
              </ul>
            </section>

            {secoes.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                aria-labelledby={`${s.id}-titulo`}
                className="mt-10 scroll-mt-28 border-t border-linha pt-10"
              >
                <h2 id={`${s.id}-titulo`} tabIndex={-1} className="flex gap-3 text-2xl font-bold">
                  <span className="text-laranja-acao tabular-nums" aria-hidden>
                    {i + 1}.
                  </span>
                  {s.titulo}
                </h2>
                <div className="mt-4 space-y-4 leading-[1.7]">
                  {s.blocos.map((b, j) => (
                    <Bloco key={j} bloco={b} />
                  ))}
                </div>
              </section>
            ))}

            <p className="mt-12 border-t border-linha pt-6">
              <a
                href="#topo"
                onClick={(e) => irPara(e, "topo")}
                className="inline-flex min-h-11 items-center gap-2 font-semibold text-laranja-acao underline transition-colors hover:text-vinho"
              >
                <ArrowUp className="size-5" aria-hidden />
                Voltar ao topo
              </a>
            </p>
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Bloco({ bloco }: { bloco: BlocoTexto }) {
  if (bloco.tipo === "paragrafo") return <p>{bloco.texto}</p>;
  if (bloco.ordenada) {
    return (
      <ol className="space-y-3">
        {bloco.itens.map((item, i) => (
          <li key={item.texto} className="flex gap-3">
            <span
              className="grid size-7 shrink-0 place-items-center rounded-full bg-creme text-sm font-bold tabular-nums ring-1 ring-linha"
              aria-hidden
            >
              {i + 1}
            </span>
            <span className="pt-0.5">
              <TextoItem item={item} />
            </span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ul className="space-y-2.5">
      {bloco.itens.map((item) => (
        <li key={item.texto} className="flex gap-3">
          <span className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-laranja" aria-hidden />
          <span>
            <TextoItem item={item} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function TextoItem({ item }: { item: ItemLista }) {
  return (
    <>
      {item.destaque && <strong className="font-semibold">{item.destaque} </strong>}
      {item.texto}
    </>
  );
}

/** Linha de leitura: a seção atual é a última cujo topo passou desta altura (abaixo do cabeçalho). */
const LINHA_DE_LEITURA = 160;
/** Depois de um clique no índice, a marca fica no destino enquanto a rolagem suave acontece. */
const TRAVA_DO_CLIQUE = 900;

/**
 * Seção que está sendo lida, para marcar no índice (só no cliente, ao rolar). No fim da página,
 * marca a última seção, mesmo que ela seja curta demais para chegar à linha de leitura.
 * `irPara` faz os links do índice rolarem suave (na hora, com movimento reduzido), atualiza o
 * endereço e leva o foco ao título do destino.
 */
function useSecaoAtiva() {
  const navigate = useNavigate();
  const [ativa, setAtiva] = useState(secoes[0].id);
  const travadaAte = useRef(0);

  useEffect(() => {
    let quadro = 0;
    const medir = () => {
      quadro = 0;
      if (performance.now() < travadaAte.current) return;
      const fim = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let atual = secoes[0].id;
      for (const s of secoes) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= LINHA_DE_LEITURA) atual = s.id;
      }
      setAtiva(fim ? secoes[secoes.length - 1].id : atual);
    };
    const aoRolar = () => {
      if (!quadro) quadro = requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar, { passive: true });
    return () => {
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", aoRolar);
      cancelAnimationFrame(quadro);
    };
  }, []);

  const irPara = (evento: MouseEvent<HTMLAnchorElement>, id: string) => {
    const destino = document.getElementById(id);
    if (!destino) return;
    evento.preventDefault();
    const titulo =
      id === "topo"
        ? document.getElementById("politica-titulo")
        : document.getElementById(`${id}-titulo`);
    if (id !== "topo") {
      setAtiva(id);
      travadaAte.current = performance.now() + TRAVA_DO_CLIQUE;
    }
    // O foco vai antes (sem rolar), para o teclado e o leitor de tela seguirem dali.
    titulo?.focus({ preventScroll: true });
    const comportamento = movimentoReduzidoAgora() ? "auto" : "smooth";
    if (id === "topo") window.scrollTo({ top: 0, behavior: comportamento });
    else destino.scrollIntoView({ behavior: comportamento, block: "start" });
    // Troca só o endereço (#secao), sem nova entrada no histórico, pelo roteador: ele não mexe
    // na rolagem (um replaceState direto faria o roteador restaurar a posição e cortar a rolagem).
    void navigate({
      to: "/privacidade",
      hash: id === "topo" ? undefined : id,
      replace: true,
      resetScroll: false,
      hashScrollIntoView: false,
    });
  };

  return { ativa, irPara };
}
