/**
 * /admin/equipe · quem pode abrir o painel da coordenação. Um administrador busca a pessoa
 * (que já criou a conta no site) e dá acesso de administrador ou de coordenação do Compaz.
 */
import { useDeferredValue, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Carregando, EstadoVazio } from "@/components/ds";
import { Button } from "@/components/ui/button";
import {
  NOME_PAPEL,
  buscarEquipe,
  buscarPessoas,
  definirPapel,
  type PessoaEquipe,
} from "@/lib/equipe";
import { iniciaisDe, useSessao } from "@/lib/sessao";
import { Avatar, CabecalhoAdmin } from "./ui";

type PapelNovo = "estudante" | "coord_polo" | "admin";

function useMudarPapel() {
  const cliente = useQueryClient();
  const { recarregarPerfil } = useSessao();
  const [mudando, setMudando] = useState<string | null>(null);
  const mudar = async (p: PessoaEquipe, papel: PapelNovo) => {
    setMudando(p.id);
    try {
      await definirPapel(p.id, papel);
      const primeiro = p.nome.split(/\s+/)[0];
      toast.success(
        papel === "estudante"
          ? `${primeiro} não tem mais acesso ao painel.`
          : `${primeiro} agora é ${NOME_PAPEL[papel].toLocaleLowerCase("pt-BR")}.`,
      );
      await Promise.all([
        cliente.invalidateQueries({ queryKey: ["equipe"] }),
        cliente.invalidateQueries({ queryKey: ["buscar-pessoas"] }),
        cliente.invalidateQueries({ queryKey: ["painel-estudantes"] }),
        cliente.invalidateQueries({ queryKey: ["painel-polos"] }),
        recarregarPerfil(),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível mudar o acesso.");
    } finally {
      setMudando(null);
    }
  };
  return { mudar, mudando };
}

function Pessoa({ p, children }: { p: PessoaEquipe; children: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <Avatar iniciais={iniciaisDe(p.nome)} tamanho="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{p.nome}</p>
        <p className="truncate text-sm text-muted-foreground">
          {NOME_PAPEL[p.papel]}
          {p.papel === "coord_polo" && p.poloNome ? ` · ${p.poloNome}` : ""}
          {p.email ? ` · ${p.email}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </li>
  );
}

/** Tirar acesso pede um segundo toque, para não acontecer sem querer. */
function BotaoTirarAcesso({
  p,
  aoConfirmar,
  ocupado,
}: {
  p: PessoaEquipe;
  aoConfirmar: () => void;
  ocupado: boolean;
}) {
  const [confirmando, setConfirmando] = useState(false);
  if (!confirmando)
    return (
      <Button variant="outline" disabled={ocupado} onClick={() => setConfirmando(true)}>
        <UserMinus aria-hidden />
        Tirar acesso
      </Button>
    );
  return (
    <>
      <Button variant="destructive" disabled={ocupado} onClick={aoConfirmar}>
        Confirmar: tirar o acesso de {p.nome.split(/\s+/)[0]}
      </Button>
      <Button variant="ghost" disabled={ocupado} onClick={() => setConfirmando(false)}>
        Cancelar
      </Button>
    </>
  );
}

export function PainelEquipe() {
  const { perfil, usuario } = useSessao();
  const [termo, setTermo] = useState("");
  const termoBusca = useDeferredValue(termo.trim());
  const ehAdmin = perfil?.papel === "admin";
  const equipe = useQuery({ queryKey: ["equipe"], queryFn: buscarEquipe, enabled: ehAdmin });
  const busca = useQuery({
    queryKey: ["buscar-pessoas", termoBusca],
    queryFn: () => buscarPessoas(termoBusca),
    enabled: ehAdmin && termoBusca.length >= 2,
  });
  const { mudar, mudando } = useMudarPapel();

  if (perfil && !ehAdmin)
    return (
      <EstadoVazio
        icon={ShieldCheck}
        titulo="Só a administração da Rede"
        texto="Peça a um administrador para dar ou tirar acesso ao painel."
      />
    );

  return (
    <>
      <CabecalhoAdmin
        sobretitulo="Coordenação"
        titulo="Equipe"
        subtitulo="Quem pode abrir este painel."
      />

      <section className="cartao p-5 md:p-6">
        <h2 className="text-xl font-bold">Dar acesso a alguém</h2>
        <p className="mt-1 text-muted-foreground">
          A pessoa precisa ter criado a conta no site. <strong>Administração da Rede</strong> vê
          todos os Compaz e pode mudar a equipe. <strong>Coordenação do Compaz</strong> vê só os
          estudantes do Compaz do cadastro dela.
        </p>
        <label className="relative mt-4 block sm:max-w-md">
          <span className="sr-only">Buscar pelo nome ou e-mail</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar pelo nome ou e-mail"
            className="min-h-12 w-full rounded-xl border border-borda-controle bg-card pl-10 pr-3"
          />
        </label>
        {termoBusca.length >= 2 && (
          <div className="mt-4">
            {busca.error ? (
              <p className="text-erro">Não foi possível buscar agora. Tente de novo.</p>
            ) : !busca.data ? (
              <Carregando texto="Buscando…" />
            ) : busca.data.length === 0 ? (
              <p className="text-muted-foreground">
                Ninguém com esse nome ou e-mail. Peça para a pessoa criar a conta no site primeiro.
              </p>
            ) : (
              <ul className="divide-y divide-linha rounded-xl border border-linha">
                {busca.data.map((p) => (
                  <Pessoa key={p.id} p={p}>
                    {p.papel === "admin" ? (
                      <span className="self-center text-sm font-semibold text-muted-foreground">
                        Já é administração
                      </span>
                    ) : (
                      <Button disabled={mudando === p.id} onClick={() => void mudar(p, "admin")}>
                        <ShieldCheck aria-hidden />
                        Tornar administração
                      </Button>
                    )}
                    {p.poloId && p.papel !== "coord_polo" && (
                      <Button
                        variant="outline"
                        disabled={mudando === p.id}
                        onClick={() => void mudar(p, "coord_polo")}
                      >
                        Coordenação do {p.poloNome?.replace(/^Compaz /, "") ?? "Compaz"}
                      </Button>
                    )}
                  </Pessoa>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <h2 className="mb-4 mt-10 text-2xl font-bold">Com acesso ao painel</h2>
      {equipe.error ? (
        <p className="text-erro">Não foi possível carregar a equipe. Recarregue a página.</p>
      ) : !equipe.data ? (
        <Carregando texto="Carregando a equipe…" />
      ) : (
        <ul className="cartao divide-y divide-linha">
          {equipe.data.map((p) => (
            <Pessoa key={p.id} p={p}>
              {p.id === usuario?.id ? (
                <span className="self-center text-sm font-semibold text-muted-foreground">
                  Você
                </span>
              ) : (
                <BotaoTirarAcesso
                  p={p}
                  ocupado={mudando === p.id}
                  aoConfirmar={() => void mudar(p, "estudante")}
                />
              )}
            </Pessoa>
          ))}
        </ul>
      )}
    </>
  );
}
