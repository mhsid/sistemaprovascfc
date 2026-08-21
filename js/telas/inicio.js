import { el, definirTitulo, mostrarVoltar } from "../ui.js";
import { identidade } from "../identidade.js";
import { diaPorExtenso } from "../dia.js";
import { ir } from "../router.js";

export function montar(app) {
  definirTitulo("Chamados de Prova");
  mostrarVoltar(false);

  app.append(
    el("p", { classe: "hoje", texto: diaPorExtenso() }),
    el("h1", { texto: "O que você é hoje?" }),
    el("p", { classe: "sub", texto: "Escolha uma vez. Dá para trocar quando quiser." }),

    el("button", { classe: "botao botao-gigante", aoTocar: () => ir("/fiscal") }, [
      el("span", { texto: "Sou fiscal de sala" }),
      el("small", { texto: "chamar o professor até a minha turma" })
    ]),

    el("button", {
      classe: "botao botao-gigante botao-secundario",
      aoTocar: () => ir("/cadastro")
    }, [
      el("span", { texto: "É meu dia de prova" }),
      el("small", { texto: "abrir o painel e receber os chamados" })
    ]),

    rodape()
  );
}

function rodape() {
  const nome = identidade.nome;
  if (!nome) {
    return el("p", { classe: "rodape" }, [
      el("button", { texto: "Dizer o meu nome", aoTocar: () => ir("/eu") })
    ]);
  }
  return el("p", { classe: "rodape" }, [
    document.createTextNode("Você é "),
    el("strong", { texto: nome }),
    document.createTextNode(" — "),
    el("button", { texto: "trocar", aoTocar: () => ir("/eu") }),
    document.createTextNode(" · "),
    el("button", { texto: "ajustes", aoTocar: () => ir("/ajustes") })
  ]);
}
