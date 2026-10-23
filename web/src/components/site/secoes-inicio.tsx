/**
 * Seções acrescentadas à página inicial: modalidades curtas, Redação com orientação
 * e Para cursinhos e coordenações. Sem Recharts, para a página continuar leve no celular.
 * Movimento: cada bloco é revelado uma vez ao chegar na tela (listas escalonadas) e o número
 * principal de cada exemplo conta até o valor, como no app e no painel (os menores já aparecem
 * prontos, para o olho ter um ponto só).
 */
import { Link } from "@tanstack/react-router";
import {
  ArrowDownAZ,
  ArrowRight,
  Check,
  FlaskConical,
  HeartHandshake,
  Info,
  MapPin,
  RotateCcw,
  Target,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarraProgresso, NumeroAnimado, Revelar, Selo, TituloSecao } from "@/components/ds";
import { BarraCompetencia } from "@/components/app/barra-competencia";
import { redacoesMaria } from "@/data/prototipo";
import { POLO_DA_COORDENACAO, buscarPolo } from "@/data/coordenacao";
import {
  competenciasCurtas,
  modalidadesCurtas,
  recursosCoordenacao,
  recursosRedacao,
} from "@/data/estudante";

const iconeModalidade: Record<(typeof modalidadesCurtas)[number]["id"], LucideIcon> = {
  rapido: Timer,
  area: Target,
  recuperacao: RotateCcw,
};

/** Fica dentro da seção "Os dois dias do ENEM", abaixo dos cartões de Dia 1 e Dia 2. */
export function ModalidadesCurtas() {
  return (
    <div className="mt-12">
      <Revelar>
        <h3 className="text-2xl font-bold">Pouco tempo? Faça um treino curto</h3>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Treinos curtos também entram na sua evolução, sempre comparados com treinos do mesmo tipo.
        </p>
      </Revelar>
      <Revelar como="ul" escalonar className="mt-6 grid gap-5 md:grid-cols-3">
        {modalidadesCurtas.map((m) => {
          const Icone = iconeModalidade[m.id];
          return (
            <li key={m.id} className="cartao p-6">
              <span className="grid size-12 place-items-center rounded-xl bg-creme text-laranja ring-1 ring-linha">
                <Icone className="size-6" aria-hidden />
              </span>
              <h4 className="mt-4 font-display text-xl font-bold">{m.titulo}</h4>
              <p className="mt-1 font-semibold tabular-nums">
                {m.questoes} · {m.tempo}
              </p>
              <p className="mt-2 text-muted-foreground">{m.texto}</p>
            </li>
          );
        })}
      </Revelar>
    </div>
  );
}

export function SecaoRedacao() {
  const exemplo = redacoesMaria[redacoesMaria.length - 1];
  return (
    <section className="container-site py-16" aria-label="Redação com orientação">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <Revelar>
            <div className="mb-4">
              <Selo tom="rosa">Em breve</Selo>
            </div>
            <TituloSecao
              sobretitulo="Redação com orientação"
              titulo="Escreva, receba a devolutiva e evolua"
              texto="Temas no estilo do ENEM e uma devolutiva pelas 5 competências, para você saber o que já funciona e o que treinar na próxima."
            />
          </Revelar>
          <Revelar como="ul" escalonar className="mt-6 space-y-2">
            {recursosRedacao.map((r) => (
              <li key={r} className="flex gap-2">
                <Check className="mt-1 size-4 shrink-0 text-acerto" aria-hidden />
                {r}
              </li>
            ))}
          </Revelar>
          <Revelar
            como="p"
            efeito="aparecer"
            className="mt-6 flex items-start gap-2 text-sm text-muted-foreground"
          >
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />A nota é estimada por IA e sempre
            aparece rotulada como estimativa pedagógica. Não é a nota oficial do ENEM, e um
            professor pode revisar.
          </Revelar>
        </div>

        <Revelar atraso={100}>
          <figure className="cartao p-5 md:p-7">
            <figcaption className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Exemplo de devolutiva
            </figcaption>
            <p className="mt-3 flex flex-wrap items-end gap-x-3">
              <NumeroAnimado
                valor={exemplo.nota}
                className="font-display text-[56px] font-black leading-none text-rosa"
              />
              <span className="pb-1 font-display text-xl font-bold">nota estimada</span>
            </p>
            <ul className="mt-6 space-y-4">
              {exemplo.competencias.map((valor, i) => (
                <li
                  key={competenciasCurtas[i]}
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3"
                >
                  <span
                    aria-hidden
                    className="grid size-10 place-items-center rounded-xl bg-rosa/10 font-display font-black text-rosa"
                  >
                    C{i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="mb-1.5 block text-sm font-semibold">
                      <span className="sr-only">Competência {i + 1}: </span>
                      {competenciasCurtas[i]}
                    </span>
                    <BarraCompetencia valor={valor} />
                  </span>
                  <span className="text-right tabular-nums">
                    <span className="font-display text-xl font-black">{valor}</span>
                    <span className="block text-sm text-muted-foreground">de 200</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 flex items-start gap-2 border-t border-linha pt-4 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              Estimativa pedagógica gerada por IA. Dados de exemplo.
            </p>
          </figure>
        </Revelar>
      </div>
    </section>
  );
}

const iconeRecurso: Record<(typeof recursosCoordenacao)[number]["id"], LucideIcon> = {
  polo: MapPin,
  estudante: Users,
  "sem-ranking": ArrowDownAZ,
};

export function SecaoCoordenacao() {
  const polo = buscarPolo(POLO_DA_COORDENACAO);
  return (
    <section className="bg-creme py-16" aria-label="Para cursinhos e coordenações">
      <div className="container-site grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <Revelar>
            <TituloSecao
              sobretitulo="Para cursinhos e coordenações"
              titulo="Acompanhe cada polo e cada estudante"
              texto="Um painel para a coordenação planejar apoio: quem está participando, onde a turma tem mais dificuldade e quem precisa de um cuidado a mais."
            />
          </Revelar>
          <Revelar como="ul" escalonar className="mt-8 space-y-5">
            {recursosCoordenacao.map((r) => {
              const Icone = iconeRecurso[r.id];
              return (
                <li key={r.id} className="flex gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-card text-laranja ring-1 ring-linha">
                    <Icone className="size-6" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-display text-xl font-bold">{r.titulo}</span>
                    <span className="mt-1 block text-muted-foreground">{r.texto}</span>
                  </span>
                </li>
              );
            })}
          </Revelar>
          <Revelar efeito="aparecer" atraso={150}>
            <Button asChild size="lg" className="mt-8 w-full sm:w-auto">
              <Link to="/entrar">
                Entrar como coordenação
                <ArrowRight />
              </Link>
            </Button>
          </Revelar>
        </div>

        {polo && (
          <Revelar atraso={100}>
            <figure className="cartao p-5 md:p-7">
              <figcaption className="sr-only">
                Prévia do painel da coordenação, com dados de demonstração
              </figcaption>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-laranja-acao">
                    Por Compaz
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold">{polo.nome}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="size-4" aria-hidden />
                    {polo.bairro}
                  </p>
                </div>
                <Selo>
                  <FlaskConical className="size-4" aria-hidden />
                  Dados de demonstração
                </Selo>
              </div>
              {/* Um ponto de atenção só: conta o número principal (estudantes); os outros já
                  aparecem no valor final e, nas dificuldades, só as barras enchem. */}
              <dl className="mt-6 grid gap-2 sm:grid-cols-3 sm:gap-3">
                {[
                  { valor: polo.estudantes, sufixo: "", rotulo: "estudantes", contar: true },
                  { valor: polo.ativos, sufixo: "", rotulo: "ativos em 30 dias", contar: false },
                  {
                    valor: polo.participacao,
                    sufixo: "%",
                    rotulo: "fizeram o 4º oficial",
                    contar: false,
                  },
                ].map((k) => (
                  <div
                    key={k.rotulo}
                    className="flex flex-row-reverse items-baseline justify-end gap-2 rounded-xl bg-creme px-3 py-2.5 sm:flex-col-reverse sm:items-start sm:gap-1 sm:py-3"
                  >
                    <dt className="text-sm leading-snug text-muted-foreground">{k.rotulo}</dt>
                    <dd className="font-display text-[28px] font-black leading-none tabular-nums">
                      {k.contar ? (
                        <NumeroAnimado valor={k.valor} sufixo={k.sufixo} />
                      ) : (
                        `${k.valor}${k.sufixo}`
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 font-semibold">Principais dificuldades da turma</p>
              <ul className="mt-3 space-y-3">
                {polo.dificuldades.slice(0, 3).map((d) => (
                  <li key={d.assunto}>
                    <BarraProgresso
                      valor={d.percentual}
                      rotulo={d.assunto}
                      cor="bg-laranja-acao"
                      contar={false}
                    />
                  </li>
                ))}
              </ul>
              <p className="mt-6 flex items-center gap-2 rounded-xl bg-rosa/10 px-3 py-2.5 text-sm font-semibold text-rosa">
                <HeartHandshake className="size-4 shrink-0" aria-hidden />
                {polo.atencao} estudantes precisam de atenção
              </p>
            </figure>
          </Revelar>
        )}
      </div>
    </section>
  );
}
