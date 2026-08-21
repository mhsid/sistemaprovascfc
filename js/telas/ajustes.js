import { el, definirTitulo, mostrarVoltar, snackbar, aviso } from "../ui.js";
import { identidade } from "../identidade.js";
import { modoAtual, diaAtual, porqueDemo, uidAtual, houveFalha } from "../dados.js";
import { alertarChamado, desbloquearAudio, audioLiberado, audioSuportado, telaSuportada } from "../alerta.js";
import { ir } from "../router.js";

export function montar(app) {
  definirTitulo("Ajustes");
  mostrarVoltar(true);

  app.append(
    el("h1", { texto: "Ajustes" }),

    el("p", { classe: "rodape" }, [
      document.createTextNode("Você é "),
      el("strong", { texto: identidade.nome || "(sem nome)" }),
      document.createTextNode(" — "),
      el("button", { texto: "trocar o nome", aoTocar: () => ir("/eu?depois=/ajustes") })
    ]),

    el("h2", { texto: "Avisos" }),
    interruptor("Som", identidade.somLigado, (v) => { identidade.somLigado = v; }),
    interruptor("Vibração", identidade.vibrarLigado, (v) => { identidade.vibrarLigado = v; }),
    el("button", {
      classe: "botao botao-secundario", texto: "🔔 Testar som e vibração",
      aoTocar: () => {
        desbloquearAudio();
        alertarChamado(false);
        setTimeout(() => {
          if (!audioLiberado()) snackbar("O navegador ainda está bloqueando o som. Toque de novo nesta tela.", { segundos: 6 });
        }, 300);
      }
    }),

    el("h2", { texto: "Diagnóstico" }),
    modoAtual() === "demo"
      ? aviso(houveFalha() ? "perigo" : "alerta",
              (houveFalha() ? "NÃO CONECTOU: " : "MODO DEMO: ") +
              (porqueDemo() || "sem chaves do Firebase") +
              " Os chamados ficam só neste aparelho e ninguém mais os vê.")
      : null,
    el("p", { classe: "diag", html: [
      "Modo: <strong>" + modoAtual() + "</strong>",
      "Dia em uso: <strong>" + diaAtual() + "</strong>",
      "Identificador anônimo: " + uidAtual(),
      "Som disponível: " + (audioSuportado() ? (audioLiberado() ? "sim, liberado" : "sim, mas ainda bloqueado") : "não"),
      "Vibração: " + ("vibrate" in navigator ? "sim" : "não"),
      "Manter tela acesa: " + (telaSuportada() ? "sim" : "não")
    ].join("<br>") })
  );
}

function interruptor(rotulo, ligado, aoMudar) {
  const btn = el("button", {
    classe: "opcao", type: "button", "aria-pressed": String(ligado),
    aoTocar: () => {
      ligado = !ligado;
      aoMudar(ligado);
      btn.setAttribute("aria-pressed", String(ligado));
      btn.querySelector("small").textContent = ligado ? "ligado" : "desligado";
    }
  }, [
    el("span", {}, [ el("b", { texto: rotulo }), el("small", { texto: ligado ? "ligado" : "desligado" }) ])
  ]);
  return btn;
}
