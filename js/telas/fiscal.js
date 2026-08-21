import { el, definirTitulo, mostrarVoltar, snackbar, aviso, vazio } from "../ui.js";
import { identidade } from "../identidade.js";
import { TURMAS, OPCOES } from "../../config.js";
import { tempoDecorrido } from "../dia.js";
import { ouvirProfessoresAtivos, ouvirChamados, criarChamado, reforcarChamado } from "../dados.js";
import { ir } from "../router.js";

export function montar(app) {
  if (!identidade.nome) { ir("/eu?depois=/fiscal", true); return; }

  definirTitulo("Chamar professor");
  mostrarVoltar(true);

  let turmaSel = TURMAS.some((t) => t.id === identidade.turma) ? identidade.turma : "";
  let profSel = "";
  let professores = [];
  let fila = [];            // chamados do professor escolhido
  let pararFila = null;
  let enviando = false;

  const caixaProfs = el("div", { id: "lista-profs" });
  const caixaAcao  = el("div", { id: "area-acao" });

  app.append(
    el("p", { classe: "passo", texto: "1 · Em que turma você está" }),
    grade(),
    el("p", { classe: "passo", texto: "2 · Qual professor você precisa" }),
    caixaProfs,
    caixaAcao
  );

  const pararProfs = ouvirProfessoresAtivos((lista) => {
    professores = lista;
    // Se o professor escolhido encerrou o dia, a escolha deixa de valer.
    if (profSel && !lista.some((p) => p.id === profSel)) { profSel = ""; assinarFila(); }
    desenharProfs();
    desenharAcao();
  });

  // ------------------------------------------------------------------ partes

  function grade() {
    const g = el("div", { classe: "grade-turmas" });
    for (const t of TURMAS) {
      g.append(el("button", {
        classe: "turma", type: "button", "data-id": t.id,
        "aria-pressed": String(t.id === turmaSel),
        texto: t.rotulo,
        aoTocar: () => {
          turmaSel = t.id;
          identidade.turma = t.id;
          g.querySelectorAll("button").forEach((b) => {
            b.setAttribute("aria-pressed", String(b.dataset.id === turmaSel));
          });
          desenharAcao();
        }
      }));
    }
    return g;
  }

  function desenharProfs() {
    caixaProfs.innerHTML = "";

    if (!professores.length) {
      caixaProfs.append(vazio(
        "Ninguém marcou dia de prova ainda",
        "Peça ao professor da prova para abrir este site e tocar em “É meu dia de prova”. " +
        "A lista aparece aqui sozinha, sem precisar recarregar."
      ));
      return;
    }

    for (const p of professores) {
      caixaProfs.append(el("button", {
        classe: "opcao", type: "button", "aria-pressed": String(p.id === profSel),
        aoTocar: () => { profSel = p.id; assinarFila(); desenharProfs(); desenharAcao(); }
      }, [
        el("span", {}, [
          el("b", { texto: p.nome }),
          el("small", { texto: p.materia || "" })
        ])
      ]));
    }
  }

  function assinarFila() {
    pararFila?.();
    pararFila = null;
    fila = [];
    if (!profSel) return;
    pararFila = ouvirChamados(profSel, (lista) => { fila = lista; desenharAcao(); });
  }

  function pendenteDaMinhaTurma() {
    return fila.find((c) => c.status === "pendente" && c.turma === turmaSel) || null;
  }

  function posicaoNaFila(chamado) {
    const pendentes = fila.filter((c) => c.status === "pendente");
    const i = pendentes.findIndex((c) => c.id === chamado.id);
    return { posicao: i + 1, total: pendentes.length };
  }

  function desenharAcao() {
    caixaAcao.innerHTML = "";
    caixaAcao.append(el("p", { classe: "passo", texto: "3 · Enviar" }));

    if (!turmaSel || !profSel) {
      caixaAcao.append(el("button", {
        classe: "botao", texto: "Solicitar presença", disabled: true
      }));
      caixaAcao.append(el("p", {
        classe: "ajuda",
        texto: !turmaSel ? "Escolha a sua turma acima." : "Escolha o professor acima."
      }));
      return;
    }

    const jaPendente = pendenteDaMinhaTurma();
    const rotuloTurma = TURMAS.find((t) => t.id === turmaSel)?.rotulo || turmaSel;

    if (jaPendente) {
      // Segunda chamada da mesma sala não vira um segundo cartão: vira ênfase.
      const { posicao, total } = posicaoNaFila(jaPendente);
      caixaAcao.append(
        aviso("info", `${rotuloTurma} já está na fila (${posicao}º de ${total}), ` +
                      `chamada ${tempoDecorrido(jaPendente.criadoEm)}` +
                      (jaPendente.insistencias > 1 ? ` · reforçada ${jaPendente.insistencias}×` : "")),
        el("button", {
          classe: "botao botao-alerta",
          texto: enviando ? "Enviando…" : "Reforçar o chamado",
          disabled: enviando,
          aoTocar: () => enviar(() => reforcarChamado(profSel, jaPendente.id, jaPendente.insistencias),
                               "Reforço enviado — a turma subiu na fila.")
        }),
        el("p", { classe: "ajuda", texto: "O professor volta a ser avisado e a sua turma sobe para o topo, sem criar um chamado repetido." })
      );
      return;
    }

    const nomeProf = professores.find((p) => p.id === profSel)?.nome || "";
    caixaAcao.append(
      el("button", {
        classe: "botao",
        texto: enviando ? "Enviando…" : `Solicitar presença`,
        disabled: enviando,
        aoTocar: () => enviar(() => criarChamado(profSel, turmaSel, identidade.nome),
                             `Pronto — ${nomeProf} foi avisado.`)
      }),
      el("p", { classe: "ajuda", texto: `Vai chegar assim: “${rotuloTurma} — ${identidade.nome}”.` })
    );
  }

  // ------------------------------------------------------------------ envio

  /**
   * O ✓ só aparece quando o servidor confirma. O risco real aqui é o fiscal
   * achar que chamou, largar o celular e voltar para a sala — então uma rede
   * ruim precisa aparecer na tela, não ficar escondida numa promessa pendente.
   */
  async function enviar(acao, mensagemDeSucesso) {
    if (enviando) return;
    enviando = true;
    desenharAcao();

    let demorou = false;
    const relogio = setTimeout(() => {
      demorou = true;
      caixaAcao.prepend(aviso("alerta",
        "A rede está lenta. Não feche esta tela: o chamado será enviado assim que a conexão voltar."));
    }, OPCOES.segundosEsperaEnvio * 1000);

    try {
      await acao();
      clearTimeout(relogio);
      snackbar(mensagemDeSucesso, { segundos: 5 });
      if (demorou) desenharAcao();
    } catch (erro) {
      clearTimeout(relogio);
      console.error(erro);
      caixaAcao.prepend(aviso("perigo", "Não deu para enviar. Confira a conexão e tente de novo."));
    } finally {
      enviando = false;
      desenharAcao();
    }
  }

  return {
    desmontar() { pararProfs?.(); pararFila?.(); }
  };
}
