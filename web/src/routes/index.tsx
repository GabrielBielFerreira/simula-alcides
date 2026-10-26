import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { PhoneMock } from "@/components/site/PhoneMock";
import { ModalidadesCurtas, SecaoCoordenacao, SecaoRedacao } from "@/components/site/secoes-inicio";
import { AreaChip, Revelar, Selo, TituloSecao } from "@/components/ds";
import { faqs, passos, polos, questaoExemplo } from "@/data/mock";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Simula Alcides · Simulados do ENEM gratuitos" },
      {
        name: "description",
        content:
          "Simulados do ENEM gratuitos no celular, da Rede de Cursinhos Populares Alcides Nascimento.",
      },
      { property: "og:title", content: "Simula Alcides" },
      { property: "og:description", content: "Seu futuro começa com a próxima questão." },
    ],
  }),
  component: Index,
});

/**
 * Movimento: o herói entra em cascata (selo, título, frase, texto, botões) e o celular sobe
 * logo depois, com a demonstração da prova. Cada seção é revelada uma vez ao chegar na tela;
 * grades e listas de cartões entram escalonadas.
 */
function Index() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="bg-hero text-offwhite">
        <div className="container-site grid items-center gap-10 py-14 md:grid-cols-2 md:py-20">
          <div className="escalonar-filhos space-y-5">
            <div className="anima-subir">
              <Selo>Gratuito para qualquer estudante</Selo>
            </div>
            {/* Em telas estreitas o título quebra sempre em duas linhas, com ou sem a fonte de títulos
                carregada: assim a troca de fonte não empurra o resto do herói. */}
            <h1 className="anima-subir text-5xl font-black md:text-7xl">
              Simula <br className="min-[25rem]:hidden" />
              Alcides
            </h1>
            <p className="anima-subir font-display text-2xl text-amarelo">
              Seu futuro começa com a próxima questão.
            </p>
            <p className="anima-subir max-w-lg text-lg text-creme">
              Simulados do ENEM gratuitos, com acompanhamento da sua evolução, para estudantes da
              Rede Alcides Nascimento e de qualquer cursinho.
            </p>
            <div className="anima-subir flex flex-wrap gap-3">
              <Button asChild variant="secondary" size="lg">
                <Link to="/cadastro">Comece agora</Link>
              </Button>
              <Button asChild variant="contornoClaro" size="lg">
                <Link to="/entrar">Já tenho conta</Link>
              </Button>
            </div>
          </div>
          <PhoneMock {...questaoExemplo} className="anima-subir [--atraso:250ms]" />
        </div>
      </section>

      <section className="container-site py-16">
        <Revelar>
          <TituloSecao sobretitulo="Como funciona" titulo="Três passos até sua evolução" />
        </Revelar>
        <Revelar como="ol" escalonar className="mt-8 grid gap-5 md:grid-cols-3">
          {passos.map((p, i) => (
            <li key={p.titulo} className="cartao p-6">
              <span className="font-display text-5xl font-black text-laranja">{i + 1}</span>
              <h3 className="mt-2 text-2xl font-bold">{p.titulo}</h3>
              <p className="mt-2 text-muted-foreground">{p.texto}</p>
              {p.itens && (
                <ul className="mt-3 space-y-1">
                  {p.itens.map((it) => (
                    <li key={it} className="flex gap-2">
                      <Check className="mt-1 size-4 shrink-0 text-acerto" aria-hidden />
                      {it}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </Revelar>
      </section>

      <section className="bg-creme py-16">
        <div className="container-site">
          <Revelar>
            <TituloSecao
              sobretitulo="Os dois dias do ENEM"
              titulo="Treine como na prova de verdade"
            />
          </Revelar>
          <Revelar escalonar className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="cartao space-y-3 p-6">
              <h3 className="text-2xl font-bold">Dia 1</h3>
              <div className="flex flex-wrap gap-2">
                <AreaChip area="linguagens" />
                <AreaChip area="humanas" />
              </div>
              <p>45 + 45 questões e Redação</p>
            </div>
            <div className="cartao space-y-3 p-6">
              <h3 className="text-2xl font-bold">Dia 2</h3>
              <div className="flex flex-wrap gap-2">
                <AreaChip area="natureza" />
                <AreaChip area="matematica" />
              </div>
              <p>45 + 45 questões</p>
            </div>
          </Revelar>
          <ModalidadesCurtas />
        </div>
      </section>

      <SecaoRedacao />
      <SecaoCoordenacao />

      <section className="container-site py-16">
        <Revelar>
          <TituloSecao
            sobretitulo="Polos da Rede"
            titulo="Seis polos nos Compaz do Recife"
            texto="Estudantes de outros cursinhos e independentes usam a plataforma do mesmo jeito."
          />
        </Revelar>
        <Revelar como="ul" escalonar className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {polos.map((p) => (
            <li key={p.id} className="cartao flex gap-3 p-5">
              <MapPin className="size-6 shrink-0 text-laranja" aria-hidden />
              <div>
                <p className="font-semibold">{p.nome}</p>
                <p className="text-muted-foreground">{p.bairro}</p>
              </div>
            </li>
          ))}
        </Revelar>
      </section>

      {/* texto a validar com a coordenação */}
      <section className="bg-vinho py-16">
        <Revelar className="container-site">
          <TituloSecao
            claro
            sobretitulo="Quem foi Alcides"
            titulo="Alcides do Nascimento Lins"
            texto="Jovem negro da rede pública do Recife, conquistou o primeiro lugar em Biomedicina na UFPE em 2007. Seu nome inspira cada estudante da Rede."
          />
        </Revelar>
      </section>

      <section className="container-site py-16">
        <Revelar>
          <TituloSecao sobretitulo="Perguntas frequentes" titulo="Dúvidas comuns" />
        </Revelar>
        {/* A seta gira e, onde o navegador permite (::details-content), a resposta abre suave. */}
        <Revelar escalonar className="mt-6 space-y-3">
          {faqs.map((f) => (
            <details key={f.pergunta} className="faq-item cartao group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl p-5 font-semibold transition-colors hover:text-laranja-acao [&::-webkit-details-marker]:hidden">
                {f.pergunta}
                <ChevronDown
                  className="size-5 shrink-0 text-laranja-acao transition-transform duration-220 group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="faq-resposta px-5 pb-5 text-muted-foreground">{f.resposta}</p>
            </details>
          ))}
        </Revelar>
        <p className="mt-8 text-sm text-muted-foreground">
          Mostramos quantidade e percentual de acertos. Isso não é a nota TRI oficial do ENEM.
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}
