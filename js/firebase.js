// Backend real: Firebase Realtime Database, com login anônimo.
//
// O SDK vem do CDN em versão fixa — sem npm, sem bundler, sem GitHub Actions.
// A configuração do Firebase é pública por natureza num site estático; quem
// protege os dados são as regras em regras-firebase.json, não o segredo dessas
// chaves.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getDatabase, ref, get, set, update, push, onValue, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

/** true quando o config.js ainda está com os "COLE_AQUI" de fábrica. */
export function configPreenchida(cfg) {
  const obrigatorios = ["apiKey", "authDomain", "databaseURL", "projectId", "appId"];
  return obrigatorios.every((c) => {
    const v = cfg?.[c];
    return typeof v === "string" && v.length > 0 && !v.startsWith("COLE_AQUI");
  });
}

export async function criarBackendFirebase(cfg) {
  const app = initializeApp(cfg);
  const auth = getAuth(app);
  const db = getDatabase(app);

  // Todo o acesso exige estar autenticado, então nada acontece antes disto.
  const uid = await entrar(auth);

  return {
    modo: "firebase",
    uid,

    ouvir(caminho, cb) {
      return onValue(
        ref(db, caminho),
        (snap) => cb(snap.val()),
        (erro) => console.error("Falha ao ouvir " + caminho, erro)
      );
    },

    async lerUmaVez(caminho) {
      return (await get(ref(db, caminho))).val();
    },

    async gravar(caminho, valor) {
      await set(ref(db, caminho), valor);
    },

    // As chaves são caminhos completos a partir da raiz. Assim "encerrar meu
    // dia" muda o professor e cancela os chamados pendentes num único envio
    // atômico: ou tudo funciona, ou nada muda.
    async atualizarVarios(remendos) {
      await update(ref(db), remendos);
    },

    async empurrar(caminho, valor) {
      const novo = push(ref(db, caminho));
      await set(novo, valor);
      return novo.key;
    },

    ouvirConexao(cb) {
      return onValue(ref(db, ".info/connected"), (snap) => cb(snap.val() === true));
    },

    marcaTempo() { return serverTimestamp(); },

    // Diferença entre o relógio do servidor e o do aparelho. Sem isto, um
    // celular com a data errada gravaria num outro dia e sumiria da vista de
    // todos sem dar nenhum erro.
    deslocamentoDoServidor() {
      return new Promise((resolve) => {
        let respondeu = false;
        const parar = onValue(ref(db, ".info/serverTimeOffset"), (snap) => {
          respondeu = true;
          parar();
          resolve(typeof snap.val() === "number" ? snap.val() : 0);
        }, () => { respondeu = true; parar(); resolve(0); });
        setTimeout(() => { if (!respondeu) { parar(); resolve(0); } }, 4000);
      });
    }
  };
}

function entrar(auth) {
  return new Promise((resolve, reject) => {
    const parar = onAuthStateChanged(auth, (usuario) => {
      if (usuario) { parar(); resolve(usuario.uid); }
    }, (erro) => { parar(); reject(erro); });

    signInAnonymously(auth).catch((erro) => {
      parar();
      // Os dois tropeços clássicos, ditos com todas as letras para não virar
      // meia hora de tentativa e erro no dia da prova.
      if (erro?.code === "auth/operation-not-allowed") {
        reject(new Error(
          "O login anônimo não está ativado. No console do Firebase: " +
          "Authentication → Sign-in method → Anônimo → Ativar."
        ));
      } else if (erro?.code === "auth/unauthorized-domain") {
        reject(new Error(
          "Este endereço não está autorizado. No console do Firebase: " +
          "Authentication → Settings → Domínios autorizados → adicionar " +
          location.hostname + "."
        ));
      } else {
        reject(erro);
      }
    });

    setTimeout(() => reject(new Error("O Firebase não respondeu a tempo.")), 15000);
  });
}
