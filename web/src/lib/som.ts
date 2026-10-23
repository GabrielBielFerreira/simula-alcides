/**
 * Som curto e baixinho ao avançar de questão, gerado na hora (Web Audio, sem arquivo para
 * baixar). A escolha de ligar ou desligar fica guardada no aparelho.
 */
const CHAVE = "simula-som";
let contexto: AudioContext | null = null;

export function somLigadoSalvo() {
  try {
    return localStorage.getItem(CHAVE) !== "0";
  } catch {
    return true;
  }
}

export function guardarSom(ligado: boolean) {
  try {
    localStorage.setItem(CHAVE, ligado ? "1" : "0");
  } catch {
    // Sem armazenamento: vale só até fechar a página.
  }
}

/** Duas notas rápidas subindo (mi e lá), com volume baixo e final suave. */
export function tocarAvanco() {
  if (typeof window === "undefined") return;
  try {
    const Contexto =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexto) return;
    contexto ??= new Contexto();
    const ctx = contexto;
    if (ctx.state === "suspended") void ctx.resume();
    const agora = ctx.currentTime;
    for (const [frequencia, atraso] of [
      [659.25, 0],
      [880, 0.07],
    ]) {
      const inicio = agora + atraso;
      const osc = ctx.createOscillator();
      const volume = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequencia;
      volume.gain.setValueAtTime(0.0001, inicio);
      volume.gain.exponentialRampToValueAtTime(0.07, inicio + 0.012);
      volume.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.16);
      osc.connect(volume).connect(ctx.destination);
      osc.start(inicio);
      osc.stop(inicio + 0.18);
    }
  } catch {
    // Sem áudio no aparelho: a prova segue em silêncio.
  }
}
