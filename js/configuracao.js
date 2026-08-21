// Porta de entrada da configuração.
//
// Nenhum outro módulo importa config.js diretamente, e isso é de propósito.
// Um `import` estático de um arquivo com problema faz o navegador abandonar
// TODO o grafo de módulos antes de executar qualquer linha — o site fica numa
// tela em branco sem uma única mensagem, e nem o tratamento de erro do app
// chega a rodar. Como config.js é justamente o arquivo que uma pessoa edita à
// mão, colando um bloco vindo do console do Firebase, ele é carregado aqui por
// `import()` dentro de try/catch, com valores de reserva e um diagnóstico
// legível.

const TURMAS_PADRAO = [
  { id: "6A", rotulo: "6º A" }, { id: "6B", rotulo: "6º B" },
  { id: "6C", rotulo: "6º C" }, { id: "6D", rotulo: "6º D" },
  { id: "7A", rotulo: "7º A" }, { id: "7B", rotulo: "7º B" },
  { id: "7C", rotulo: "7º C" }, { id: "7D", rotulo: "7º D" }
];

const OPCOES_PADRAO = {
  fusoHorario: "America/Sao_Paulo",
  segundosDesfazer: 10,
  segundosRelembrar: 30,
  minutosEsperaCritica: 10,
  manterTelaLigada: true,
  segundosEsperaEnvio: 8
};

// Ligações vivas: quem importa lê o valor já corrigido depois do carregamento.
export let firebaseConfig = null;
export let TURMAS = TURMAS_PADRAO;
export let OPCOES = OPCOES_PADRAO;

/** "" quando está tudo certo; senão, a explicação em português do problema. */
export let problemaConfig = "";

/** true quando as chaves do Firebase foram preenchidas de verdade. */
export let configPreenchida = false;

export async function carregarConfiguracao() {
  let mod;
  try {
    mod = await import("../config.js");
  } catch (erro) {
    problemaConfig =
      "O arquivo config.js tem um erro de digitação e o navegador não conseguiu lê-lo. " +
      "Detalhe técnico: " + (erro?.message || erro);
    return resumo();
  }

  // Turmas e ajustes: se vierem quebrados, o site continua de pé com o padrão.
  if (Array.isArray(mod.TURMAS) && mod.TURMAS.length) {
    TURMAS = mod.TURMAS.filter((t) => t && t.id && t.rotulo);
    if (!TURMAS.length) {
      TURMAS = TURMAS_PADRAO;
      problemaConfig = "A lista TURMAS do config.js está sem os campos id e rotulo. Usando a lista padrão.";
    }
  }
  if (mod.OPCOES && typeof mod.OPCOES === "object") {
    OPCOES = { ...OPCOES_PADRAO, ...mod.OPCOES };
  }

  const fb = mod.firebaseConfig;

  if (!fb || typeof fb !== "object") {
    // O tropeço mais provável de todos, então vale identificá-lo com precisão
    // e dizer a correção exata em vez de um "erro de configuração".
    problemaConfig = (await pareceFaltarExport())
      ? 'No config.js, a linha do firebaseConfig está escrita como "const firebaseConfig = {" e ' +
        'precisa ser "export const firebaseConfig = {". O console do Firebase mostra o bloco sem ' +
        'a palavra export, e ela some quando o bloco é colado por cima.'
      : "O config.js não está exportando firebaseConfig.";
    return resumo();
  }

  const faltando = ["apiKey", "authDomain", "databaseURL", "projectId", "appId"]
    .filter((c) => typeof fb[c] !== "string" || !fb[c] || fb[c].startsWith("COLE_AQUI"));

  firebaseConfig = fb;
  configPreenchida = faltando.length === 0;

  if (!configPreenchida && faltando.length < 5) {
    // Metade preenchido é engano, não "ainda não configurei".
    problemaConfig = "Faltam campos no firebaseConfig do config.js: " + faltando.join(", ") + ".";
  }
  return resumo();
}

/**
 * Lê o próprio config.js como texto para distinguir "esqueceu o export" de
 * "apagou o bloco". O arquivo já está no cache do navegador, então não custa
 * nada, e a diferença é o que transforma o conserto em uma linha.
 */
async function pareceFaltarExport() {
  try {
    const url = new URL("../config.js", import.meta.url);
    const texto = await (await fetch(url)).text();
    return /(^|\n)\s*const\s+firebaseConfig\s*=/.test(texto);
  } catch {
    return false;
  }
}

function resumo() {
  return { firebaseConfig, TURMAS, OPCOES, problemaConfig, configPreenchida };
}
