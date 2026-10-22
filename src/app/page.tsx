import Image from "next/image";
import { polosIniciais, site } from "@/config/site";

const passos = [
  {
    titulo: "Crie sua conta",
    texto:
      "Só nome, e-mail e senha. Conte se você é da Rede, de outro cursinho ou se estuda por conta própria.",
  },
  {
    titulo: "Faça o simulado no celular",
    texto:
      "Cronômetro, marcação para revisar e salvamento automático. Se a internet cair, nenhuma resposta se perde.",
  },
  {
    titulo: "Veja onde evoluir",
    texto:
      "Acertos, erros e questões em branco por área e assunto, com o gabarito comentado e o próximo passo de estudo.",
  },
];

const dias = [
  {
    nome: "Dia 1",
    areas: [
      { nome: "Linguagens", cor: "bg-area-lc", qtd: 45 },
      { nome: "Ciências Humanas", cor: "bg-area-ch", qtd: 45 },
    ],
    extra: "+ Redação",
  },
  {
    nome: "Dia 2",
    areas: [
      { nome: "Ciências da Natureza", cor: "bg-area-cn", qtd: 45 },
      { nome: "Matemática", cor: "bg-area-mt", qtd: 45 },
    ],
    extra: null,
  },
];

export default function Home() {
  return (
    <>
      <header className="border-b border-line bg-background/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Image
            src="/brand/rcp-horizontal.png"
            alt={site.rede}
            width={1200}
            height={388}
            priority
            className="h-10 w-auto sm:h-12"
          />
          <a
            href="#como-funciona"
            className="rounded-full border-2 border-foreground px-4 py-2 text-sm font-semibold hover:bg-surface"
          >
            Entrar
          </a>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-surface">
          <div className="mx-auto flex max-w-5xl items-center gap-10 px-4 py-14 sm:py-20">
            <div className="flex-1">
              <p className="mb-3 inline-block rounded-full bg-background px-3 py-1 text-sm font-semibold text-vinho">
                Gratuito para qualquer estudante
              </p>
              <h1 className="font-display text-5xl font-black leading-tight text-foreground sm:text-6xl">
                {site.nome}
              </h1>
              <p className="mt-3 text-xl text-muted sm:text-2xl">{site.subtitulo}</p>
              <p className="mt-6 max-w-2xl">{site.descricao}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#como-funciona"
                  className="rounded-full bg-laranja-acao px-6 py-3 text-lg font-semibold text-white hover:bg-vinho"
                >
                  Comece agora
                </a>
                <a
                  href="#polos"
                  className="rounded-full bg-amarelo px-6 py-3 text-lg font-semibold text-vinho hover:bg-mostarda"
                >
                  Conheça os polos
                </a>
              </div>
            </div>
            <Image
              src="/brand/rcp-vertical.png"
              alt=""
              width={800}
              height={1017}
              priority
              className="hidden w-64 shrink-0 md:block"
            />
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="font-display text-3xl font-bold">Como funciona</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {passos.map((passo, i) => (
              <li key={passo.titulo} className="rounded-xl border border-line bg-white p-5">
                <span className="font-display text-3xl font-black text-laranja">{i + 1}</span>
                <h3 className="mt-2 text-lg font-semibold">{passo.titulo}</h3>
                <p className="mt-1 text-muted">{passo.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-14">
          <h2 className="font-display text-3xl font-bold">Os dois dias do ENEM</h2>
          <p className="mt-2 text-muted">
            Simulados completos com 90 questões, ou treinos rápidos de 20 e 30 questões e por área.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {dias.map((dia) => (
              <div key={dia.nome} className="rounded-xl border border-line bg-white p-5">
                <h3 className="font-display text-2xl font-bold">{dia.nome}</h3>
                <ul className="mt-3 space-y-2">
                  {dia.areas.map((area) => (
                    <li key={area.nome} className="flex items-center gap-3">
                      <span className={`h-3 w-3 rounded-full ${area.cor}`} aria-hidden />
                      <span className="flex-1">{area.nome}</span>
                      <span className="text-muted">{area.qtd} questões</span>
                    </li>
                  ))}
                </ul>
                {dia.extra && <p className="mt-3 font-semibold text-rosa">{dia.extra}</p>}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            Mostramos quantidade e percentual de acertos. Isso não é a nota TRI oficial do ENEM.
          </p>
        </section>

        <section id="polos" className="bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <h2 className="font-display text-3xl font-bold">Polos da Rede</h2>
            <p className="mt-2 text-muted">
              Estudantes de outros cursinhos e independentes usam a plataforma do mesmo jeito.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {polosIniciais.map((polo) => (
                <li key={polo.nome} className="rounded-xl border border-line bg-background p-4">
                  <p className="font-semibold">{polo.nome}</p>
                  <p className="text-muted">{polo.bairro}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="bg-vinho text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Image
            src="/brand/rcp-horizontal-fundo-escuro.png"
            alt={site.rede}
            width={1200}
            height={377}
            className="h-10 w-auto"
          />
          <p className="text-sm text-white/85">
            {site.nome} · uma iniciativa da {site.rede}
          </p>
        </div>
      </footer>
    </>
  );
}
