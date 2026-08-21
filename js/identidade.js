// Quem está usando este aparelho. Fica no localStorage para que ninguém
// precise redigitar o nome toda vez que abre o site.
//
// O nome é COMPARTILHADO pelos dois papéis de propósito: é a mesma pessoa, que
// pode ser fiscal de manhã e estar de prova à tarde.

const P = "cfc.";

function ler(chave, padrao = "") {
  try { return localStorage.getItem(P + chave) ?? padrao; }
  catch { return padrao; }
}

function gravar(chave, valor) {
  try {
    if (valor === null || valor === undefined || valor === "") localStorage.removeItem(P + chave);
    else localStorage.setItem(P + chave, String(valor));
  } catch { /* modo privado do Safari: seguimos sem memória */ }
}

export const identidade = {
  get nome()        { return ler("nome"); },
  set nome(v)       { gravar("nome", v.trim()); },

  get materia()     { return ler("materia"); },
  set materia(v)    { gravar("materia", v.trim()); },

  get turma()       { return ler("turma"); },
  set turma(v)      { gravar("turma", v); },

  get somLigado()   { return ler("som", "1") === "1"; },
  set somLigado(v)  { gravar("som", v ? "1" : "0"); },

  get vibrarLigado()  { return ler("vibrar", "1") === "1"; },
  set vibrarLigado(v) { gravar("vibrar", v ? "1" : "0"); },

  /**
   * Atalho para o painel: só vale se tiver sido salvo HOJE. Assim o professor
   * que volta no mesmo dia cai direto no painel, e no dia seguinte recomeça
   * pela tela inicial em vez de abrir um painel de ontem.
   */
  painelDeHoje(diaAtual) {
    return ler("profDia") === diaAtual ? ler("profId") : "";
  },
  guardarPainel(profId, diaAtual) {
    gravar("profId", profId);
    gravar("profDia", diaAtual);
  },
  esquecerPainel() {
    gravar("profId", null);
    gravar("profDia", null);
  }
};

/**
 * Transforma "Ana Paula Souza" em "ana-paula-souza".
 *
 * Esse identificador é derivado do nome, e não sorteado, por dois motivos
 * práticos: recarregar a página não cria um segundo "Ana Paula" na lista dos
 * fiscais, e o professor reabre o MESMO painel em outro aparelho apenas
 * digitando o mesmo nome.
 */
export function apelido(nome) {
  return String(nome)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // tira acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}
