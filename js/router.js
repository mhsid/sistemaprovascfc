// Roteador por hash (#/fiscal, #/painel/ana-paula-souza, #/eu?depois=/fiscal).
//
// Tem que ser por hash: o GitHub Pages não sabe reescrever URLs, então um
// caminho de verdade (/fiscal) devolveria 404 se o professor recarregasse.

const rotas = [];
let atual = null;   // o que a tela em exibição devolveu (pode ter desmontar())

export function registrar(padrao, montar) {
  const nomes = [];
  const regex = new RegExp("^" + padrao.replace(/:([a-zA-Z]+)/g, (_, n) => {
    nomes.push(n);
    return "([^/?]+)";
  }) + "$");
  rotas.push({ regex, nomes, montar });
}

export function ir(caminho, substituir = false) {
  const alvo = "#" + caminho;
  if (location.hash === alvo) { resolver(); return; }
  if (substituir) location.replace(alvo);
  else location.hash = alvo;
}

/** Só o caminho, sem a parte depois do "?". */
export function caminhoAtual() {
  return partir().caminho;
}

function partir() {
  const bruto = location.hash.slice(1) || "/";
  const corte = bruto.indexOf("?");
  return corte === -1
    ? { caminho: bruto, consulta: "" }
    : { caminho: bruto.slice(0, corte), consulta: bruto.slice(corte + 1) };
}

async function resolver() {
  const { caminho, consulta } = partir();

  if (atual && typeof atual.desmontar === "function") {
    try { atual.desmontar(); } catch (e) { console.error(e); }
  }
  atual = null;

  const app = document.getElementById("app");
  app.innerHTML = "";
  window.scrollTo(0, 0);

  for (const rota of rotas) {
    const m = caminho.match(rota.regex);
    if (!m) continue;

    // Parâmetros do caminho (:profId) e da consulta (?depois=) chegam juntos.
    const params = {};
    for (const [k, v] of new URLSearchParams(consulta)) params[k] = v;
    rota.nomes.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });

    atual = (await rota.montar(app, params)) || null;
    return;
  }

  // Rota desconhecida (link antigo, digitação errada): volta ao início.
  ir("/", true);
}

export function iniciarRoteador() {
  window.addEventListener("hashchange", resolver);
  if (!location.hash) location.replace("#/");
  resolver();
}
