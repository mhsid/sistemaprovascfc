import { el, definirTitulo, mostrarVoltar, snackbar, aviso } from "../ui.js";
import { identidade, apelido } from "../identidade.js";
import { registrarProfessor, diaAtual } from "../dados.js";
import { desbloquearAudio } from "../alerta.js";
import { ir } from "../router.js";

/**
 * "É meu dia de prova". Esta tela tem uma segunda função, tão importante quanto
 * a primeira: o toque em "Abrir meu painel" é o gesto do usuário que libera o
 * áudio. Sem passar por aqui, o navegador não deixaria o painel apitar.
 */
export function montar(app) {
  definirTitulo("Meu dia de prova");
  mostrarVoltar(true);

  const campoNome = el("input", {
    classe: "campo", id: "c-nome", type: "text", maxlength: "40",
    placeholder: "Ex.: Ana Paula Souza", autocomplete: "name", value: identidade.nome
  });

  const campoMateria = el("input", {
    classe: "campo", id: "c-materia", type: "text", maxlength: "40",
    placeholder: "Ex.: Matemática", value: identidade.materia
  });

  const botao = el("button", { classe: "botao", texto: "Abrir meu painel" });

  app.append(
    el("h1", { texto: "Vou receber os chamados" }),
    el("p", { classe: "sub", texto: "Seu nome entra na lista que os fiscais veem hoje. Amanhã a lista começa vazia de novo." }),
    el("label", { for: "c-nome", texto: "Seu nome" }), campoNome,
    el("label", { for: "c-materia", texto: "Matéria da prova" }), campoMateria,
    botao,
    el("p", { classe: "ajuda", texto: "Deixe esta tela aberta durante a prova para ouvir o aviso de cada chamado." })
  );

  botao.addEventListener("click", async () => {
    // Precisa acontecer aqui dentro, no toque, senão o navegador bloqueia o som.
    desbloquearAudio();

    const nome = campoNome.value.trim().replace(/\s+/g, " ");
    const materia = campoMateria.value.trim().replace(/\s+/g, " ");

    if (nome.length < 2)    { snackbar("Escreva o seu nome.");        campoNome.focus();    return; }
    if (materia.length < 2) { snackbar("Escreva a matéria da prova."); campoMateria.focus(); return; }

    const profId = apelido(nome);
    if (profId.length < 2) { snackbar("Use letras no nome, por favor."); campoNome.focus(); return; }

    botao.disabled = true;
    botao.textContent = "Abrindo…";

    try {
      await registrarProfessor(profId, nome, materia);
      identidade.nome = nome;
      identidade.materia = materia;
      identidade.guardarPainel(profId, diaAtual());
      ir("/painel/" + encodeURIComponent(profId), true);
    } catch (erro) {
      console.error(erro);
      botao.disabled = false;
      botao.textContent = "Abrir meu painel";
      app.prepend(aviso("perigo", "Não deu para entrar na lista. Confira a conexão e tente de novo."));
    }
  });

  if (!identidade.nome) setTimeout(() => campoNome.focus(), 60);
}
