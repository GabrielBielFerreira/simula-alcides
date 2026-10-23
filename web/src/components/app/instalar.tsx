/**
 * Convite para instalar o Simula Alcides na tela inicial, mostrado no Início depois do login.
 * Android com Chrome: um botão abre a janela de instalação. iPhone e outros navegadores: passo a
 * passo curto. Dentro do Instagram/Facebook: pede para abrir no navegador.
 */
import { useNavigate } from "@tanstack/react-router";
import { Download, EllipsisVertical, Link2, Share, SquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  adiarConvite,
  instalar,
  reabrirConvite,
  useInstalar,
  type ModoInstalar,
} from "@/lib/instalar";

async function instalarComAviso() {
  try {
    if (await instalar())
      toast.success("Pronto! O Simula Alcides vai aparecer na sua tela inicial.");
  } catch {
    toast.error("Não foi possível abrir a instalação. Tente pelo menu do navegador.");
  }
}

function Passos({ modo }: { modo: ModoInstalar }) {
  if (modo === "iphone")
    return (
      <ol className="mt-3 list-decimal space-y-2 pl-5">
        <li>
          Toque em <strong>Compartilhar</strong>{" "}
          <Share className="inline size-5 align-text-bottom" aria-label="(quadrado com seta)" /> na
          barra do navegador.
        </li>
        <li>
          Role e toque em <strong>Adicionar à Tela de Início</strong>{" "}
          <SquarePlus className="inline size-5 align-text-bottom" aria-hidden />.
        </li>
        <li>
          Toque em <strong>Adicionar</strong>.
        </li>
      </ol>
    );
  if (modo === "android")
    return (
      <ol className="mt-3 list-decimal space-y-2 pl-5">
        <li>
          Toque no menu{" "}
          <EllipsisVertical
            className="inline size-5 align-text-bottom"
            aria-label="(três pontinhos)"
          />{" "}
          do navegador.
        </li>
        <li>
          Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.
        </li>
      </ol>
    );
  return null;
}

export function ConviteInstalar() {
  const { modo, dispensado } = useInstalar();
  if (dispensado || modo === "instalado" || modo === "nenhum") return null;

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/app`);
      toast.success("Link copiado! Cole no Chrome ou no Safari.");
    } catch {
      toast.error("Não deu para copiar. Abra pelo menu ⋯ do app e escolha abrir no navegador.");
    }
  };

  return (
    <section aria-labelledby="convite-instalar" className="cartao mb-6 p-5">
      <div className="flex items-start gap-4">
        <img
          src="/icons/icone-192.png"
          alt=""
          width={56}
          height={56}
          className="size-14 shrink-0 rounded-2xl ring-1 ring-linha"
        />
        <div className="min-w-0">
          <h2 id="convite-instalar" className="text-lg font-bold">
            Instale o Simula Alcides no celular
          </h2>
          <p className="mt-1 text-muted-foreground">
            {modo === "navegador-interno"
              ? "Você abriu o link dentro de outro app. Para instalar, abra no Chrome ou no Safari: toque no menu ⋯ e escolha abrir no navegador, ou copie o link."
              : "Abra os simulados direto da tela inicial, como um app. É grátis e ocupa pouco espaço."}
          </p>
          <Passos modo={modo} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {modo === "botao" && (
          <Button onClick={() => void instalarComAviso()}>
            <Download aria-hidden />
            Instalar o app
          </Button>
        )}
        {modo === "navegador-interno" && (
          <Button onClick={() => void copiarLink()}>
            <Link2 aria-hidden />
            Copiar link
          </Button>
        )}
        <Button variant="ghost" onClick={adiarConvite}>
          Agora não
        </Button>
      </div>
    </section>
  );
}

/** Item "Instalar o app" do menu do perfil, para quem adiou o convite. */
export function ItemMenuInstalar({ aoEscolher }: { aoEscolher: () => void }) {
  const { modo } = useInstalar();
  const navigate = useNavigate();
  if (modo === "instalado" || modo === "nenhum") return null;
  return (
    <Button
      variant="ghost"
      className="w-full justify-start"
      onClick={() => {
        aoEscolher();
        if (modo === "botao") {
          void instalarComAviso();
          return;
        }
        reabrirConvite();
        void navigate({ to: "/app" });
      }}
    >
      <Download aria-hidden />
      Instalar o app
    </Button>
  );
}
