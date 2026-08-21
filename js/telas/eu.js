import { el, definirTitulo, mostrarVoltar, snackbar } from "../ui.js";
import { identidade, apelido } from "../identidade.js";
import { ir } from "../router.js";

/** Pergunta o nome uma única vez. `?depois=` diz para onde voltar. */
export function montar(app, params = {}) {
  definirTitulo("Meu nome");
  mostrarVoltar(true);

  const destino = params.depois || "/";

  const campo = el("input", {
    classe: "campo", id: "campo-nome", type: "text",
    placeholder: "Ex.: Ana Paula Souza",
    autocomplete: "name", maxlength: "40", value: identidade.nome
  });

  const salvar = () => {
    const nome = campo.value.trim().replace(/\s+/g, " ");
    if (nome.length < 2) { snackbar("Escreva o seu nome para continuar."); campo.focus(); return; }
    if (apelido(nome).length < 2) { snackbar("Use letras no nome, por favor."); campo.focus(); return; }
    identidade.nome = nome;
    ir(destino, true);
  };

  app.append(
    el("h1", { texto: "Como você se chama?" }),
    el("p", { classe: "sub", texto: "Aparece junto do chamado, para o colega saber quem pediu. Fica salvo neste aparelho — você não vai digitar de novo." }),
    el("label", { for: "campo-nome", texto: "Seu nome" }),
    campo,
    el("button", { classe: "botao", texto: "Continuar", aoTocar: salvar })
  );

  campo.addEventListener("keydown", (e) => { if (e.key === "Enter") salvar(); });
  if (!identidade.nome) setTimeout(() => campo.focus(), 60);
}
