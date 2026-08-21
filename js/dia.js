// Descobrir "que dia é hoje" — de propósito, sem confiar no relógio do celular.
//
// Um aparelho com data ou fuso errado gravaria os chamados num outro dia e
// ficaria invisível para todos os colegas, sem nenhuma mensagem de erro. Por
// isso o horário de referência vem do servidor sempre que ele está disponível.

import { OPCOES } from "../config.js";

let deslocamento = 0; // milissegundos de diferença entre servidor e aparelho

export function definirDeslocamento(ms) {
  if (typeof ms === "number" && isFinite(ms)) deslocamento = ms;
}

/** Agora, em milissegundos, corrigido pelo relógio do servidor. */
export function agora() {
  return Date.now() + deslocamento;
}

/** Formata um instante como "AAAA-MM-DD" no fuso do colégio. */
export function formatarDia(ms = agora()) {
  // 'sv-SE' produz exatamente o formato AAAA-MM-DD.
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: OPCOES.fusoHorario,
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date(ms));
}

/** Ex.: "quinta-feira, 21 de agosto". Usado só para exibição. */
export function diaPorExtenso(ms = agora()) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: OPCOES.fusoHorario,
    weekday: "long", day: "numeric", month: "long"
  }).format(new Date(ms));
}

/** Ex.: "14:07". */
export function hora(ms) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: OPCOES.fusoHorario,
    hour: "2-digit", minute: "2-digit"
  }).format(new Date(ms));
}

/** Ex.: "há 4 min", "agora". */
export function tempoDecorrido(desde) {
  const min = Math.floor((agora() - desde) / 60000);
  if (min < 1) return "agora";
  if (min === 1) return "há 1 min";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  const resto = min % 60;
  return resto ? `há ${h}h${String(resto).padStart(2, "0")}` : `há ${h}h`;
}
