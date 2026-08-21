// Ponto de entrada: escolhe o backend, descobre o dia, liga o roteador.

import { iniciarDados, ouvirConexao, diaAtual, houveFalha } from "./dados.js";
import { carregarConfiguracao } from "./configuracao.js";
import { registrar, iniciarRoteador, ir, caminhoAtual } from "./router.js";
import { definirConexao } from "./ui.js";
import { identidade } from "./identidade.js";
import { formatarDia } from "./dia.js";
import { ligarReparosAutomaticos, audioLiberado, audioSuportado, desbloquearAudio } from "./alerta.js";

import * as inicio   from "./telas/inicio.js";
import * as eu       from "./telas/eu.js";
import * as fiscal   from "./telas/fiscal.js";
import * as cadastro from "./telas/cadastro.js";
import * as painel   from "./telas/painel.js";
import * as ajustes  from "./telas/ajustes.js";

async function principal() {
  await carregarConfiguracao();
  const { modo, motivoDemo } = await iniciarDados();

  if (modo === "demo") {
    const faixa = document.getElementById("faixa-demo");
    faixa.hidden = false;
    if (houveFalha()) {
      // Configurou e não conectou: isso precisa parecer um defeito, não um
      // aviso de rotina, senão o professor confia num painel que ninguém vê.
      faixa.classList.add("faixa-erro");
      faixa.textContent = "NÃO CONECTOU — " + motivoDemo + " Os chamados não estão sendo compartilhados.";
      definirConexao("offline", "erro");
    } else {
      definirConexao("demo", "demo");
    }
    if (motivoDemo) console.warn("Modo demo:", motivoDemo);
  } else {
    ouvirConexao((ligado) => {
      definirConexao(ligado ? "online" : "offline", ligado ? "conectado" : "sem conexão");
    });
  }

  registrar("/",                 inicio.montar);
  registrar("/eu",               eu.montar);
  registrar("/fiscal",           fiscal.montar);
  registrar("/cadastro",         cadastro.montar);
  registrar("/painel/:profId",   painel.montar);
  registrar("/ajustes",          ajustes.montar);

  document.getElementById("btn-inicio").addEventListener("click", () => ir("/"));

  ligarReparosAutomaticos(atualizarFaixaDeAudio);
  document.getElementById("faixa-audio").addEventListener("click", () => {
    desbloquearAudio();
    atualizarFaixaDeAudio();
  });

  vigiarViradaDeDia();
  iniciarRoteador();

  // Quem já abriu o painel hoje volta direto para ele.
  const meuPainel = identidade.painelDeHoje(diaAtual());
  if (meuPainel && caminhoAtual() === "/") ir("/painel/" + encodeURIComponent(meuPainel), true);
}

/**
 * A faixa vermelha só aparece quando existe painel aberto e o som está
 * bloqueado. Sem ela, o professor descobre que o alerta não funciona apenas
 * depois de perder um chamado.
 */
function atualizarFaixaDeAudio() {
  const noPainel = caminhoAtual().startsWith("/painel/");
  const precisa = noPainel && audioSuportado() && !audioLiberado();
  document.getElementById("faixa-audio").hidden = !precisa;
}

/**
 * Se o site ficou aberto de um dia para o outro, tudo o que está na tela é de
 * ontem. Recarregar é mais honesto do que continuar mostrando dado velho.
 */
function vigiarViradaDeDia() {
  const conferir = () => {
    if (formatarDia() !== diaAtual()) location.reload();
  };
  setInterval(conferir, 60000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") conferir();
  });
}

window.addEventListener("hashchange", atualizarFaixaDeAudio);

principal().catch((erro) => {
  console.error(erro);
  document.getElementById("app").innerHTML =
    '<div class="aviso aviso-perigo">Não foi possível iniciar o site. ' +
    'Recarregue a página; se continuar, avise o responsável pelo sistema.</div>' +
    '<p class="diag">' + String(erro && erro.message ? erro.message : erro) + "</p>";
});
