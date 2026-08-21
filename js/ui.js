// Pecinhas de interface compartilhadas pelas telas.

/** Cria um elemento. `props` aceita texto, classe, atributos e onClick. */
export function el(tag, props = {}, filhos = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "texto") n.textContent = v;
    else if (k === "html") n.innerHTML = v;
    else if (k === "classe") n.className = v;
    else if (k === "aoTocar") n.addEventListener("click", v);
    else n.setAttribute(k, v === true ? "" : String(v));
  }
  for (const f of [].concat(filhos)) {
    if (f) n.appendChild(typeof f === "string" ? document.createTextNode(f) : f);
  }
  return n;
}

export function definirTitulo(texto) {
  document.getElementById("titulo-tela").textContent = texto;
}

export function mostrarVoltar(mostrar) {
  document.getElementById("btn-inicio").hidden = !mostrar;
}

export function definirConexao(estado, texto) {
  const p = document.getElementById("pilula-conexao");
  p.dataset.estado = estado;
  p.textContent = texto;
}

// --------------------------------------------------------------- snackbar

let apagarSnack = null;

/**
 * Mensagem rápida no rodapé, opcionalmente com uma ação (o "Desfazer").
 * Devolve uma função que fecha a mensagem antes da hora.
 */
export function snackbar(texto, { acao = "", aoAcionar = null, segundos = 4 } = {}) {
  const caixa = document.getElementById("snackbar");
  const btn = document.getElementById("snackbar-acao");

  document.getElementById("snackbar-texto").textContent = texto;
  btn.hidden = !acao;
  btn.textContent = acao;
  btn.onclick = acao ? () => { fechar(); aoAcionar?.(); } : null;
  caixa.hidden = false;

  clearTimeout(apagarSnack);
  apagarSnack = setTimeout(fechar, segundos * 1000);

  function fechar() {
    clearTimeout(apagarSnack);
    caixa.hidden = true;
    btn.onclick = null;
  }
  return fechar;
}

export function aviso(tipo, texto) {
  return el("div", { classe: `aviso aviso-${tipo}`, texto });
}

export function vazio(titulo, explicacao) {
  return el("div", { classe: "vazio" }, [
    el("strong", { texto: titulo }),
    el("span", { texto: explicacao })
  ]);
}
