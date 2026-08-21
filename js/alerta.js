// Som, vibração e tela acesa.
//
// Esta é a parte que decide se o sistema funciona de verdade. Navegador nenhum
// deixa uma página tocar som sozinha: o AudioContext só sai de "suspended"
// dentro de um toque do usuário. Se isso falhar em silêncio, o professor só
// descobre que o som não funciona quando já perdeu um chamado — por isso aqui
// há três canais independentes (som, vibração e aviso visual) e uma faixa
// vermelha permanente enquanto o áudio não estiver liberado.

import { identidade } from "./identidade.js";

let ctx = null;
let travaTela = null;
let tituloOriginal = document.title;
let piscando = null;

// ------------------------------------------------------------------- áudio

/** Deve ser chamado DENTRO de um toque do usuário. */
export function desbloquearAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
    }
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    return ctx.state === "running";
  } catch {
    return false;
  }
}

export function audioLiberado() {
  return !!ctx && ctx.state === "running";
}

export function audioSuportado() {
  return !!(window.AudioContext || window.webkitAudioContext);
}

/**
 * Bip sintetizado — dois tons curtos. Sintetizado, e não um arquivo, para não
 * carregar binário no repositório nem depender de codec do aparelho.
 */
export function bip(vezes = 1) {
  if (!identidade.somLigado) return;
  if (!audioLiberado()) return;
  for (let i = 0; i < vezes; i++) {
    const base = ctx.currentTime + i * 0.42;
    tom(880, base, 0.18);
    tom(1320, base + 0.2, 0.18);
  }
}

function tom(hz, quando, duracao) {
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(hz, quando);
  // Envelope suave nas pontas: sem isso o bip estala.
  vol.gain.setValueAtTime(0.0001, quando);
  vol.gain.exponentialRampToValueAtTime(0.35, quando + 0.015);
  vol.gain.exponentialRampToValueAtTime(0.0001, quando + duracao);
  osc.connect(vol).connect(ctx.destination);
  osc.start(quando);
  osc.stop(quando + duracao + 0.02);
}

// ---------------------------------------------------------------- vibração

export function vibrar(padrao = [200, 100, 200]) {
  if (!identidade.vibrarLigado) return;
  try { navigator.vibrate?.(padrao); } catch { /* iOS não vibra, e tudo bem */ }
}

/** Alerta completo de chamado novo. */
export function alertarChamado(forte = false) {
  bip(forte ? 3 : 1);
  vibrar(forte ? [250, 120, 250, 120, 250] : [200, 100, 200]);
}

// ------------------------------------------------- título da aba piscando

export function piscarTitulo(texto) {
  pararTitulo();
  let liga = false;
  piscando = setInterval(() => {
    document.title = (liga = !liga) ? texto : tituloOriginal;
  }, 900);
}

export function pararTitulo() {
  if (piscando) { clearInterval(piscando); piscando = null; }
  document.title = tituloOriginal;
}

// ------------------------------------------------------------- tela acesa

export async function manterTelaLigada() {
  try {
    if (!("wakeLock" in navigator)) return false;
    travaTela = await navigator.wakeLock.request("screen");
    return true;
  } catch {
    return false;
  }
}

export function liberarTela() {
  try { travaTela?.release(); } catch { /* já liberada */ }
  travaTela = null;
}

export function telaSuportada() {
  return "wakeLock" in navigator;
}

// ---------------------------------------------------------------- ligações

/**
 * Liga os reparos automáticos que precisam existir durante toda a sessão:
 *  - qualquer toque na página tenta destravar o áudio de novo;
 *  - ao voltar do bloqueio, o áudio e a trava de tela são reconquistados.
 *
 * A retomada da trava de tela é obrigatória: o wake lock morre sozinho quando a
 * aba perde o foco, e esquecer de repedi-lo é o erro clássico que faz a tela
 * apagar no meio da prova.
 */
export function ligarReparosAutomaticos(aoMudarEstadoDoAudio) {
  const tentar = () => {
    const antes = audioLiberado();
    if (ctx && ctx.state !== "running") ctx.resume().catch(() => {});
    if (audioLiberado() !== antes) aoMudarEstadoDoAudio?.();
  };

  document.addEventListener("pointerdown", tentar, { passive: true });
  document.addEventListener("keydown", tentar);

  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible") return;
    tentar();
    if (travaTela === null && document.body.dataset.querTela === "1") {
      await manterTelaLigada();
    }
  });

  // O estado do AudioContext muda sem avisar em alguns navegadores.
  setInterval(() => aoMudarEstadoDoAudio?.(), 3000);
}

export function marcarQueQuerTela(quer) {
  document.body.dataset.querTela = quer ? "1" : "0";
}
