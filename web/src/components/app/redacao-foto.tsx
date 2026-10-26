/**
 * Redação escrita à mão: o estudante fotografa a folha, a IA lê a letra e o texto cai no
 * editor para ele conferir antes de enviar. As fotos ficam guardadas junto da redação.
 */
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Camera, ImagePlus, Loader2, ScanText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enviarFotoRedacao, lerFotosRedacao, linksDasFotos } from "@/lib/redacao";

const MAX_FOTOS = 2;

interface Selecionada {
  arquivo: File;
  previa: string;
}

/** Cartão "Escreveu no papel?" do editor: escolher fotos, mandar ler, devolver o texto. */
export function EnviarFoto({
  aoLer,
}: {
  aoLer: (r: { texto: string; fotos: string[]; duvidas: number; aviso: string }) => void;
}) {
  const [selecionadas, setSelecionadas] = useState<Selecionada[]>([]);
  const [fase, setFase] = useState<"escolher" | "enviando" | "lendo">("escolher");
  const [erro, setErro] = useState<string | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  // Libera as prévias quando o cartão sai da tela.
  const atuais = useRef(selecionadas);
  atuais.current = selecionadas;
  useEffect(() => () => atuais.current.forEach((s) => URL.revokeObjectURL(s.previa)), []);

  function adicionar(lista: FileList | null) {
    if (!lista?.length) return;
    setErro(null);
    const novas = [...lista]
      .filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name))
      .map((arquivo) => ({ arquivo, previa: URL.createObjectURL(arquivo) }));
    setSelecionadas((s) => {
      const juntas = [...s, ...novas];
      juntas.slice(MAX_FOTOS).forEach((x) => URL.revokeObjectURL(x.previa));
      return juntas.slice(0, MAX_FOTOS);
    });
  }

  function remover(i: number) {
    setSelecionadas((s) => {
      URL.revokeObjectURL(s[i].previa);
      return s.filter((_, j) => j !== i);
    });
  }

  async function ler() {
    setErro(null);
    setFase("enviando");
    let caminhos: string[];
    try {
      caminhos = await Promise.all(selecionadas.map((s) => enviarFotoRedacao(s.arquivo)));
    } catch (e) {
      setFase("escolher");
      return setErro(e instanceof Error ? e.message : "A foto não subiu. Tente de novo.");
    }
    setFase("lendo");
    const r = await lerFotosRedacao(caminhos);
    setFase("escolher");
    if (!r.ok) return setErro(r.mensagem);
    aoLer({ texto: r.texto, fotos: caminhos, duvidas: r.duvidas, aviso: r.aviso });
  }

  const ocupado = fase !== "escolher";

  return (
    <section className="cartao p-5 md:p-6" aria-labelledby="titulo-foto">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-rosa/10 text-rosa">
          <Camera className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 id="titulo-foto" className="text-lg font-bold leading-snug">
            Escreveu no papel? Mande a foto
          </h3>
          <p className="mt-1 text-muted-foreground">
            A IA lê a sua letra e coloca o texto aqui embaixo. Você confere e envia para correção.
          </p>
        </div>
      </div>

      {/* Câmera direto no celular (capture) e galeria/arquivos (sem capture). */}
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          adicionar(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galeria}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          adicionar(e.target.files);
          e.target.value = "";
        }}
      />

      {selecionadas.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-3">
          {selecionadas.map((s, i) => (
            <li key={s.previa} className="relative">
              <img
                src={s.previa}
                alt={`Foto ${i + 1} da folha`}
                className="h-36 w-28 rounded-xl border border-linha object-cover"
              />
              {!ocupado && (
                <button
                  type="button"
                  onClick={() => remover(i)}
                  className="absolute -right-2 -top-2 grid size-8 place-items-center rounded-full bg-marrom text-offwhite shadow"
                  aria-label={`Tirar a foto ${i + 1}`}
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {ocupado ? (
        <p
          className="mt-5 flex items-center gap-3 rounded-xl bg-creme px-4 py-3 font-semibold"
          aria-live="polite"
        >
          <Loader2 className="size-5 shrink-0 animate-spin text-rosa" aria-hidden />
          {fase === "enviando" ? "Enviando a foto…" : "Lendo sua letra… isso leva uns 20 segundos."}
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {selecionadas.length > 0 ? (
            <>
              <Button onClick={ler}>
                <ScanText />
                Ler minha redação
              </Button>
              {selecionadas.length < MAX_FOTOS && (
                <Button variant="outline" onClick={() => camera.current?.click()}>
                  <ImagePlus />
                  Adicionar a 2ª página
                </Button>
              )}
            </>
          ) : (
            <>
              <Button onClick={() => camera.current?.click()}>
                <Camera />
                Tirar foto da folha
              </Button>
              <Button variant="outline" onClick={() => galeria.current?.click()}>
                <ImagePlus />
                Escolher da galeria
              </Button>
            </>
          )}
        </div>
      )}

      <div aria-live="polite">
        {erro && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-mostarda/25 px-4 py-3 text-marrom">
            <AlertCircle className="mt-1 size-5 shrink-0" aria-hidden />
            {erro}
          </p>
        )}
      </div>

      {!ocupado && (
        <p className="mt-4 text-sm text-muted-foreground">
          Dica: folha inteira na foto, de cima, com boa luz e sem sombra. Até {MAX_FOTOS} fotos (se
          usou frente e verso).
        </p>
      )}
    </section>
  );
}

/** Miniaturas das fotos da folha; tocar abre a foto inteira. */
export function FotosDaFolha({ fotos, className }: { fotos: string[]; className?: string }) {
  const q = useQuery({
    queryKey: ["fotos-redacao", ...fotos],
    queryFn: () => linksDasFotos(fotos),
    enabled: fotos.length > 0,
    staleTime: 30 * 60 * 1000,
  });
  if (!fotos.length) return null;
  return (
    <div className={className}>
      <p className="font-semibold">Foto da folha</p>
      <p className="text-sm text-muted-foreground">Toque para ver em tamanho grande.</p>
      {q.error ? (
        <p className="mt-2 text-sm text-muted-foreground">Não foi possível carregar a foto.</p>
      ) : !q.data ? (
        <Loader2
          className="mt-3 size-5 animate-spin text-muted-foreground"
          aria-label="Carregando"
        />
      ) : (
        <ul className="mt-3 flex flex-wrap gap-3">
          {q.data.map((url, i) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noreferrer" className="block">
                <img
                  src={url}
                  alt={`Foto ${i + 1} da folha de redação`}
                  className="h-40 w-32 rounded-xl border border-linha object-cover transition-opacity hover:opacity-90"
                />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
