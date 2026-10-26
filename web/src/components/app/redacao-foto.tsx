/**
 * Redação escrita à mão: o estudante fotografa a folha (câmera direto no celular ou galeria) e
 * a IA corrige direto das fotos. As fotos ficam guardadas junto da redação.
 */
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { linksDasFotos } from "@/lib/redacao";

const MAX_FOTOS = 2;

export interface FotoEscolhida {
  arquivo: File;
  previa: string;
}

/** Libera as prévias (object URLs) quando a lista sai da tela. */
export function useLiberarPrevias(fotos: FotoEscolhida[]) {
  const atuais = useRef(fotos);
  atuais.current = fotos;
  useEffect(() => () => atuais.current.forEach((f) => URL.revokeObjectURL(f.previa)), []);
}

/**
 * Escolha das fotos da folha (até 2: frente e verso). Controlado: quem usa guarda a lista.
 * "Tirar foto" abre a câmera traseira no celular (capture); "Galeria" abre fotos e arquivos.
 */
export function EscolherFotos({
  fotos,
  aoMudar,
  desativado = false,
}: {
  fotos: FotoEscolhida[];
  aoMudar: (fotos: FotoEscolhida[]) => void;
  desativado?: boolean;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  function adicionar(lista: FileList | null) {
    if (!lista?.length) return;
    const novas = [...lista]
      .filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name))
      .map((arquivo) => ({ arquivo, previa: URL.createObjectURL(arquivo) }));
    const juntas = [...fotos, ...novas];
    juntas.slice(MAX_FOTOS).forEach((f) => URL.revokeObjectURL(f.previa));
    aoMudar(juntas.slice(0, MAX_FOTOS));
  }

  function remover(i: number) {
    URL.revokeObjectURL(fotos[i].previa);
    aoMudar(fotos.filter((_, j) => j !== i));
  }

  const entrada = (ref: typeof camera, comCamera: boolean) => (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      capture={comCamera ? "environment" : undefined}
      multiple={!comCamera}
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(e) => {
        adicionar(e.target.files);
        e.target.value = "";
      }}
    />
  );

  return (
    <div>
      {entrada(camera, true)}
      {entrada(galeria, false)}

      {fotos.length > 0 ? (
        <ul className="flex flex-wrap gap-4" aria-label="Fotos escolhidas">
          {fotos.map((f, i) => (
            <li key={f.previa} className="relative">
              <img
                src={f.previa}
                alt={`Foto ${i + 1} da folha`}
                className="h-56 w-44 rounded-2xl border border-linha bg-creme object-cover sm:h-64 sm:w-48"
              />
              <span className="absolute bottom-2 left-2 rounded-full bg-marrom/80 px-2.5 py-0.5 text-sm font-semibold text-offwhite">
                {fotos.length > 1 ? `Página ${i + 1}` : "Sua folha"}
              </span>
              {!desativado && (
                <button
                  type="button"
                  onClick={() => remover(i)}
                  className="absolute -right-2 -top-2 grid size-10 place-items-center rounded-full bg-marrom text-offwhite shadow-md"
                  aria-label={`Tirar a foto ${i + 1}`}
                >
                  <X className="size-5" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <button
          type="button"
          disabled={desativado}
          onClick={() => camera.current?.click()}
          className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-borda-controle bg-creme/50 px-6 py-10 text-center transition-colors hover:bg-creme focus-visible:outline-3 focus-visible:outline-laranja-acao"
        >
          <span className="grid size-16 place-items-center rounded-2xl bg-rosa/10 text-rosa">
            <Camera className="size-8" aria-hidden />
          </span>
          <span className="text-lg font-bold">Tirar foto da folha</span>
          <span className="max-w-sm text-muted-foreground">
            Folha inteira na foto, de cima, com boa luz e sem sombra.
          </span>
        </button>
      )}

      {!desativado && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {fotos.length > 0 && fotos.length < MAX_FOTOS && (
            <Button variant="outline" onClick={() => camera.current?.click()}>
              <Camera />
              Fotografar o verso
            </Button>
          )}
          {fotos.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                fotos.forEach((f) => URL.revokeObjectURL(f.previa));
                aoMudar([]);
                camera.current?.click();
              }}
            >
              <Camera />
              Tirar de novo
            </Button>
          )}
          {fotos.length < MAX_FOTOS && (
            <Button variant="ghost" onClick={() => galeria.current?.click()}>
              <ImagePlus />
              Escolher da galeria
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Miniaturas das fotos guardadas da folha; tocar abre a foto inteira. */
export function FotosDaFolha({
  fotos,
  className,
  titulo = "Foto da folha",
}: {
  fotos: string[];
  className?: string;
  titulo?: string;
}) {
  const q = useQuery({
    queryKey: ["fotos-redacao", ...fotos],
    queryFn: () => linksDasFotos(fotos),
    enabled: fotos.length > 0,
    staleTime: 30 * 60 * 1000,
  });
  if (!fotos.length) return null;
  return (
    <div className={className}>
      <p className="font-semibold">{titulo}</p>
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
                  className="h-40 w-32 rounded-xl border border-linha bg-creme object-cover transition-opacity hover:opacity-90"
                />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
