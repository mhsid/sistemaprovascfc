// Backend de MODO DEMO.
//
// Existe para que o site funcione por inteiro antes de haver qualquer projeto
// Firebase configurado — dá para testar as duas pontas em duas abas do mesmo
// navegador. Também é o paraquedas: se o Firebase falhar ao iniciar, o app cai
// aqui em vez de mostrar tela branca.
//
// Implementa exatamente a mesma interface primitiva que js/firebase.js, então
// js/dados.js e as telas não sabem qual dos dois está em uso.

const CHAVE = "cfc.demo";
const CANAL = "cfc-demo";

function lerBanco() {
  try { return JSON.parse(localStorage.getItem(CHAVE) || "{}"); }
  catch { return {}; }
}

function gravarBanco(banco) {
  try { localStorage.setItem(CHAVE, JSON.stringify(banco)); } catch { /* sem espaço */ }
}

function pegar(obj, caminho) {
  let no = obj;
  for (const parte of caminho.split("/")) {
    if (no === null || typeof no !== "object") return null;
    no = no[parte];
  }
  return no === undefined ? null : no;
}

function pôr(obj, caminho, valor) {
  const partes = caminho.split("/");
  const folha = partes.pop();
  let no = obj;
  for (const parte of partes) {
    if (no[parte] === null || typeof no[parte] !== "object") no[parte] = {};
    no = no[parte];
  }
  if (valor === null || valor === undefined) delete no[folha];
  else no[folha] = valor;
}

export function criarBackendDemo() {
  const ouvintes = new Set();
  let canal = null;
  try { canal = new BroadcastChannel(CANAL); } catch { /* navegador antigo */ }

  function avisarLocalmente() {
    const banco = lerBanco();
    for (const { caminho, cb } of ouvintes) {
      try { cb(pegar(banco, caminho)); } catch (e) { console.error(e); }
    }
  }

  function propagar() {
    avisarLocalmente();
    try { canal?.postMessage("mudou"); } catch { /* ignorado */ }
  }

  if (canal) canal.onmessage = avisarLocalmente;
  // Rede de segurança para navegadores sem BroadcastChannel: o evento
  // "storage" só dispara nas OUTRAS abas, que é justamente o que falta.
  window.addEventListener("storage", (e) => {
    if (e.key === CHAVE) avisarLocalmente();
  });

  return {
    modo: "demo",

    ouvir(caminho, cb) {
      const inscricao = { caminho, cb };
      ouvintes.add(inscricao);
      // Entrega o valor atual já, como o Firebase faz.
      queueMicrotask(() => { try { cb(pegar(lerBanco(), caminho)); } catch (e) { console.error(e); } });
      return () => ouvintes.delete(inscricao);
    },

    async lerUmaVez(caminho) {
      return pegar(lerBanco(), caminho);
    },

    async gravar(caminho, valor) {
      const banco = lerBanco();
      pôr(banco, caminho, valor);
      gravarBanco(banco);
      propagar();
    },

    async atualizarVarios(remendos) {
      const banco = lerBanco();
      for (const [caminho, valor] of Object.entries(remendos)) pôr(banco, caminho, valor);
      gravarBanco(banco);
      propagar();
    },

    async empurrar(caminho, valor) {
      // Id parecido com o do Firebase: cresce com o tempo, então ordena sozinho.
      const id = "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const banco = lerBanco();
      pôr(banco, caminho + "/" + id, valor);
      gravarBanco(banco);
      propagar();
      return id;
    },

    ouvirConexao(cb) {
      queueMicrotask(() => cb(true));
      return () => {};
    },

    // Sem servidor: o relógio possível é o do próprio aparelho.
    marcaTempo() { return Date.now(); },
    deslocamentoDoServidor() { return Promise.resolve(0); }
  };
}
