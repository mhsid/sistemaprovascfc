import { el, definirTitulo, mostrarVoltar, snackbar, aviso, vazio } from "../ui.js";
import { identidade } from "../identidade.js";
import { TURMAS, OPCOES } from "../configuracao.js";
import { tempoDecorrido, hora, agora } from "../dia.js";
import {
  ouvirChamados, ouvirProfessor, marcarAtendido, reabrirChamado, encerrarDia, explicarErro
} from "../dados.js";
import {
  alertarChamado, bip, vibrar, piscarTitulo, pararTitulo,
  manterTelaLigada, liberarTela, marcarQueQuerTela, telaSuportada, desbloquearAudio
} from "../alerta.js";
import { ir } from "../router.js";

const rotuloTurma = (id) => TURMAS.find((t) => t.id === id)?.rotulo || id;

export function montar(app, { profId }) {
  definirTitulo("Painel");
  mostrarVoltar(true);

  let chamados = [];
  let professor = null;
  let aba = "fila";

  // Ids que já foram anunciados. Nunca esvaziado: assim um chamado reaberto
  // pelo "Desfazer" não apita como se fosse novo.
  const anunciados = new Set();
  const insistenciasVistas = new Map();
  let primeiraCarga = true;
  let perdidosEnquantoFora = 0;

  const cabeca   = el("div");
  const abas     = el("div", { classe: "abas" });
  const conteudo = el("div");
  const pe       = el("div");

  app.append(cabeca, abas, conteudo, pe);

  const pararProf = ouvirProfessor(profId, (p) => { professor = p; desenharCabeca(); });
  const pararFila = ouvirChamados(profId, (lista) => {
    chamados = lista;
    reagirANovidades();
    desenhar();
  });

  // "há 4 min" precisa envelhecer sozinho, mesmo sem chegar chamado novo.
  const relogio = setInterval(desenhar, 30000);

  // Reforço periódico enquanto alguém espera: um bip a cada tantos segundos.
  const relembrar = setInterval(() => {
    if (pendentes().length) { bip(1); vibrar([120]); }
  }, Math.max(10, OPCOES.segundosRelembrar) * 1000);

  const aoVoltar = () => {
    if (document.visibilityState !== "visible") return;
    if (perdidosEnquantoFora > 0) {
      const n = perdidosEnquantoFora;
      perdidosEnquantoFora = 0;
      snackbar(n === 1 ? "Chegou 1 chamado enquanto a tela estava desligada."
                       : `Chegaram ${n} chamados enquanto a tela estava desligada.`,
               { segundos: 8 });
      desenhar();
    }
  };
  document.addEventListener("visibilitychange", aoVoltar);

  if (OPCOES.manterTelaLigada) { marcarQueQuerTela(true); manterTelaLigada(); }

  // --------------------------------------------------------------- listagens

  const pendentes = () => chamados
    .filter((c) => c.status === "pendente")
    // Quem reforçou vai para o topo; no resto, é ordem de chegada.
    .sort((a, b) => (insistencia(b) > 1) - (insistencia(a) > 1) || (a.criadoEm || 0) - (b.criadoEm || 0));

  const resolvidos = () => chamados
    .filter((c) => c.status !== "pendente")
    .sort((a, b) => (b.atendidoEm || b.criadoEm || 0) - (a.atendidoEm || a.criadoEm || 0));

  const insistencia = (c) => Number(c.insistencias) || 1;

  // ------------------------------------------------------------- novidades

  function reagirANovidades() {
    const abertos = chamados.filter((c) => c.status === "pendente");
    let novidade = 0;
    let reforco = 0;

    for (const c of abertos) {
      if (!anunciados.has(c.id)) { anunciados.add(c.id); novidade++; }
      else if (insistencia(c) > (insistenciasVistas.get(c.id) || 1)) reforco++;
      insistenciasVistas.set(c.id, insistencia(c));
    }

    if (primeiraCarga) { primeiraCarga = false; atualizarUrgencia(); return; }

    if (novidade || reforco) {
      alertarChamado(reforco > 0 || novidade > 1);
      if (document.visibilityState !== "visible") perdidosEnquantoFora += novidade;
    }
    atualizarUrgencia();
  }

  function atualizarUrgencia() {
    const n = pendentes().length;
    document.body.classList.toggle("chamando", n > 0);
    if (n > 0) piscarTitulo(`(${n}) CHAMANDO!`);
    else pararTitulo();
  }

  // ---------------------------------------------------------------- desenho

  function desenharCabeca() {
    cabeca.innerHTML = "";

    // Link antigo ou de outro dia: melhor dizer isso do que mostrar um painel
    // vazio que parece funcionar.
    if (!professor) {
      cabeca.append(
        el("h1", { texto: "Painel não encontrado" }),
        aviso("alerta", "Ninguém com esse nome está de prova hoje. Se é o seu dia, comece de novo por “É meu dia de prova”."),
        el("button", { classe: "botao", texto: "Voltar ao início", aoTocar: () => ir("/") })
      );
      return;
    }

    if (professor.ativo === false) {
      cabeca.append(aviso("alerta", "Seu dia está encerrado — os fiscais não veem mais o seu nome."));
    }

    cabeca.append(el("h1", { texto: professor.nome || "Painel" }));
    if (professor.materia) cabeca.append(el("p", { classe: "sub", texto: professor.materia }));

    // O painel é de quem digitou aquele nome; se outra pessoa abriu o link,
    // ela precisa de uma saída óbvia em vez de dar baixa na fila alheia.
    if (identidade.nome && professor.nome && identidade.nome !== professor.nome) {
      cabeca.append(el("div", { classe: "aviso aviso-info" }, [
        document.createTextNode(`Este painel é de ${professor.nome}. `),
        el("button", {
          classe: "link-cabecalho", texto: "Não é você? Voltar ao início",
          aoTocar: () => ir("/")
        })
      ]));
    }
  }

  function desenhar() {
    desenharAbas();
    conteudo.innerHTML = "";
    (aba === "fila" ? desenharFila : desenharHistorico)();
    desenharPe();
  }

  function desenharAbas() {
    abas.innerHTML = "";
    const criar = (id, texto) => el("button", {
      classe: "aba", type: "button",
      "aria-pressed": String(aba === id), texto,
      aoTocar: () => { aba = id; desenhar(); }
    });
    abas.append(
      criar("fila", `Esperando (${pendentes().length})`),
      criar("hist", `Histórico de hoje (${resolvidos().length})`)
    );
  }

  function desenharFila() {
    const lista = pendentes();
    if (!lista.length) {
      conteudo.append(vazio("Ninguém esperando",
        "Quando um fiscal chamar, a turma aparece aqui e o celular apita. Deixe esta tela aberta."));
      return;
    }
    for (const c of lista) conteudo.append(cartaoPendente(c));
  }

  function cartaoPendente(c) {
    const espera = agora() - (c.criadoEm || agora());
    const critico = espera > OPCOES.minutosEsperaCritica * 60000;

    return el("div", { classe: "cartao" + (critico ? " critico" : "") }, [
      el("div", { classe: "cartao-topo" }, [
        el("span", { classe: "cartao-turma", texto: rotuloTurma(c.turma) }),
        insistencia(c) > 1 ? el("span", { classe: "selo", texto: insistencia(c) + "×" }) : null,
        el("span", { classe: "cartao-espera", texto: tempoDecorrido(c.criadoEm) })
      ]),
      el("p", { classe: "cartao-quem", texto: c.fiscal ? "Chamou: " + c.fiscal : "" }),
      el("button", {
        classe: "botao botao-ok", texto: "Já atendi esta turma",
        aoTocar: () => darBaixa(c)
      })
    ]);
  }

  function desenharHistorico() {
    const lista = resolvidos();
    if (!lista.length) {
      conteudo.append(vazio("Nada por aqui ainda", "As turmas que você atender hoje ficam registradas aqui."));
      return;
    }
    for (const c of lista) {
      const cancelado = c.status === "cancelado";
      conteudo.append(el("div", { classe: "cartao " + (cancelado ? "cancelado" : "atendido") }, [
        el("div", { classe: "cartao-topo" }, [
          el("span", { classe: "cartao-turma", texto: rotuloTurma(c.turma) }),
          el("span", {
            classe: "cartao-espera",
            texto: cancelado ? "cancelado" : (c.atendidoEm ? "atendido às " + hora(c.atendidoEm) : "atendido")
          })
        ]),
        el("p", {
          classe: "cartao-quem",
          texto: [c.fiscal ? "Chamou: " + c.fiscal : "", c.atendidoPor ? "Atendeu: " + c.atendidoPor : ""]
                 .filter(Boolean).join(" · ")
        }),
        el("button", {
          classe: "botao botao-secundario", texto: "Reabrir chamado",
          aoTocar: async () => {
            try { await reabrirChamado(profId, c.id); aba = "fila"; snackbar("Chamado devolvido para a fila."); }
            catch (erro) { snackbar("Não deu para reabrir. " + explicarErro(erro), { segundos: 10 }); }
          }
        })
      ]));
    }
  }

  function desenharPe() {
    pe.innerHTML = "";

    if (!telaSuportada() && OPCOES.manterTelaLigada) {
      pe.append(el("p", { classe: "ajuda",
        texto: "Este navegador não deixa manter a tela acesa. Ajuste o tempo de tela do celular para 5 minutos." }));
    }

    pe.append(
      el("p", { classe: "ajuda", texto: "Mantenha esta tela aberta durante a prova. Com o celular bloqueado, o aviso pode não tocar." }),
      el("div", { classe: "rodape" }, [
        el("button", { texto: "🔔 Testar som", aoTocar: () => { desbloquearAudio(); alertarChamado(false); } }),
        document.createTextNode(" · "),
        el("button", { texto: "Ajustes", aoTocar: () => ir("/ajustes") })
      ]),
      el("button", {
        classe: "botao botao-perigo", texto: "Encerrar meu dia",
        aoTocar: encerrar
      })
    );
  }

  // ----------------------------------------------------------------- ações

  async function darBaixa(c) {
    try {
      await marcarAtendido(profId, c.id, identidade.nome || professor?.nome || "");
      snackbar(`${rotuloTurma(c.turma)} — atendido.`, {
        acao: "Desfazer",
        segundos: OPCOES.segundosDesfazer,
        aoAcionar: async () => {
          try { await reabrirChamado(profId, c.id); }
          catch (erro) { snackbar("Não deu para desfazer. " + explicarErro(erro), { segundos: 10 }); }
        }
      });
    } catch (erro) {
      console.error(erro);
      snackbar("Não deu para dar baixa. " + explicarErro(erro), { segundos: 10 });
    }
  }

  async function encerrar() {
    const abertos = pendentes();
    const texto = abertos.length
      ? `Encerrar o dia? ${abertos.length} turma(s) ainda esperando serão canceladas e você sai da lista dos fiscais.`
      : "Encerrar o dia? Você sai da lista que os fiscais veem.";
    if (!confirm(texto)) return;

    try {
      await encerrarDia(profId, abertos.map((c) => c.id));
      identidade.esquecerPainel();
      snackbar("Dia encerrado. Bom descanso!", { segundos: 5 });
      ir("/");
    } catch (erro) {
      console.error(erro);
      snackbar("Não deu para encerrar. " + explicarErro(erro), { segundos: 10 });
    }
  }

  return {
    desmontar() {
      pararProf?.(); pararFila?.();
      clearInterval(relogio); clearInterval(relembrar);
      document.removeEventListener("visibilitychange", aoVoltar);
      document.body.classList.remove("chamando");
      pararTitulo();
      marcarQueQuerTela(false);
      liberarTela();
    }
  };
}
