/**
 * Instalar o Simula Alcides como app na tela inicial do celular.
 *
 * O Chrome do Android avisa que dá para instalar com o evento `beforeinstallprompt`, que chega
 * logo ao abrir o site, muitas vezes antes de a pessoa entrar na conta. Um script pequeno no
 * <head> (CAPTURA_INSTALAR) guarda o evento em `window` para o convite usar depois do login.
 * No iPhone não existe esse evento: o convite mostra o passo a passo do Compartilhar.
 */
import { useSyncExternalStore } from "react";

interface EventoInstalar extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    __simulaInstalar?: EventoInstalar | null;
  }
}

/** Roda no <head>, antes do React: guarda o evento e segura a barrinha automática do Chrome. */
export const CAPTURA_INSTALAR = `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__simulaInstalar=e;window.dispatchEvent(new Event("simula-instalar"))});`;

export type ModoInstalar =
  /** Já está aberto como app (ou acabou de instalar). */
  | "instalado"
  /** O navegador instala com um toque no nosso botão. */
  | "botao"
  /** iPhone ou iPad: Compartilhar > Adicionar à Tela de Início. */
  | "iphone"
  /** Android sem o evento (Samsung Internet, Firefox, ou o Chrome ainda não ofereceu). */
  | "android"
  /** Dentro do Instagram, Facebook e afins: precisa abrir no navegador primeiro. */
  | "navegador-interno"
  /** Computador sem suporte: não mostramos nada. */
  | "nenhum";

const CHAVE_DEPOIS = "simula-instalar-depois";
/** Depois de "Agora não", o convite volta a aparecer só depois de uma semana. */
const ESPERA_MS = 7 * 24 * 60 * 60 * 1000;

let iniciado = false;
let acabouDeInstalar = false;
let dispensadoAte = 0;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

function lerDispensa() {
  try {
    return Number(localStorage.getItem(CHAVE_DEPOIS)) || 0;
  } catch {
    return 0;
  }
}

function estaComoApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.startsWith("android-app://")
  );
}

function ehIphone(ua: string) {
  // O iPad novo se apresenta como Mac; o toque denuncia.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** Navegadores embutidos em outros apps, onde não dá para instalar. */
function ehNavegadorInterno(ua: string) {
  return /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|MicroMessenger|TikTok|musical_ly|Snapchat/i.test(
    ua,
  );
}

function calcularModo(): ModoInstalar {
  if (acabouDeInstalar || estaComoApp()) return "instalado";
  if (window.__simulaInstalar) return "botao";
  const ua = navigator.userAgent;
  if (ehNavegadorInterno(ua)) return "navegador-interno";
  if (ehIphone(ua)) return "iphone";
  if (/Android/i.test(ua)) return "android";
  return "nenhum";
}

/** Liga os ouvintes e registra o service worker. Chamado uma vez, no layout raiz. */
export function iniciarInstalacao() {
  if (typeof window === "undefined" || iniciado) return;
  iniciado = true;
  dispensadoAte = lerDispensa();
  window.addEventListener("simula-instalar", avisar);
  window.addEventListener("appinstalled", () => {
    window.__simulaInstalar = null;
    acabouDeInstalar = true;
    avisar();
  });
  window.matchMedia("(display-mode: standalone)").addEventListener?.("change", avisar);
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sem service worker o site funciona igual; só não fica instalável em alguns Androids.
    });
  }
  avisar();
}

function assinar(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

/** "nenhum" no servidor e antes de iniciar, para a primeira pintura bater com o HTML. */
const modoNoServidor = (): ModoInstalar => "nenhum";
const modoAgora = (): ModoInstalar => (iniciado ? calcularModo() : "nenhum");
const dispensadoAgora = () => iniciado && dispensadoAte > Date.now();

export function useInstalar() {
  const modo = useSyncExternalStore(assinar, modoAgora, modoNoServidor);
  const dispensado = useSyncExternalStore(assinar, dispensadoAgora, () => false);
  return { modo, dispensado };
}

/** Abre a janela de instalação do navegador. Devolve true se a pessoa aceitou. */
export async function instalar() {
  const evento = window.__simulaInstalar;
  if (!evento) return false;
  // O evento só serve uma vez: depois do prompt, o navegador decide quando oferecer de novo.
  window.__simulaInstalar = null;
  await evento.prompt();
  const { outcome } = await evento.userChoice;
  if (outcome === "accepted") acabouDeInstalar = true;
  else adiarConvite();
  avisar();
  return outcome === "accepted";
}

/** "Agora não": some por uma semana neste aparelho. */
export function adiarConvite() {
  dispensadoAte = Date.now() + ESPERA_MS;
  try {
    localStorage.setItem(CHAVE_DEPOIS, String(dispensadoAte));
  } catch {
    // Sem armazenamento: some só até recarregar a página.
  }
  avisar();
}

/** Pelo menu "Instalar o app": mostra o convite de novo, mesmo se foi adiado. */
export function reabrirConvite() {
  dispensadoAte = 0;
  try {
    localStorage.removeItem(CHAVE_DEPOIS);
  } catch {
    // Sem armazenamento: nada a limpar.
  }
  avisar();
}
