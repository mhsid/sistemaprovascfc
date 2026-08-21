// Camada de dados: o contrato único que as telas enxergam.
//
// Aqui mora toda a modelagem. As telas nunca falam com o Firebase nem com o
// modo demo diretamente, então trocar de backend não muda uma linha de tela.
//
// Formato no banco:
//   dias/AAAA-MM-DD/professores/{apelido}   -> quem está de prova hoje
//   dias/AAAA-MM-DD/chamados/{apelido}/{id} -> a fila daquele professor
//
// "chamados" é irmão de "professores", e não filho, porque o fiscal precisa
// ouvir só a lista de nomes (um nó minúsculo) sem baixar a fila de todo mundo.

import { firebaseConfig, configPreenchida, problemaConfig } from "./configuracao.js";
import { criarBackendDemo } from "./demo.js";
import { definirDeslocamento, formatarDia } from "./dia.js";

let back = null;   // backend em uso
let dia = "";      // "AAAA-MM-DD" fixado no início da sessão
let motivoDemo = "";
let falhou = false;  // configurado, mas não deu para conectar

/**
 * Escolhe o backend e descobre o dia.
 *
 * A distinção importante é entre "ainda não configuraram" e "configuraram e
 * quebrou". O primeiro caso é o modo demo legítimo. O segundo precisa gritar:
 * cair calado no demo faria o professor achar que está tudo certo enquanto
 * ninguém enxerga os chamados de ninguém — pior do que o site não abrir.
 */
export async function iniciarDados() {
  try {
    if (!configPreenchida) {
      motivoDemo = problemaConfig || "O config.js ainda está sem as chaves do Firebase.";
      falhou = !!problemaConfig;
    } else {
      const fb = await import("./firebase.js");
      back = await fb.criarBackendFirebase(firebaseConfig);
      definirDeslocamento(await back.deslocamentoDoServidor());

      // Sonda de permissão. Sem ela o site parece pronto — pílula verde,
      // nenhuma faixa — e só revela que as regras não foram publicadas quando
      // o professor tenta entrar na lista, no meio da prova. Descobrir isso
      // na hora de abrir o site é a diferença entre um susto e um problema.
      try {
        await back.lerUmaVez(`dias/${formatarDia()}/professores`);
      } catch (erro) {
        back = null;
        throw erro;
      }
    }
  } catch (erro) {
    console.error("Firebase indisponível:", erro);
    motivoDemo = explicarErro(erro);
    falhou = true;
  }

  if (!back) back = criarBackendDemo();
  dia = formatarDia();
  return { modo: back.modo, dia, motivoDemo, falhou };
}

/** true quando o site deveria estar conectado e não está. */
export function houveFalha() { return falhou; }

export function modoAtual()  { return back ? back.modo : "demo"; }
export function diaAtual()   { return dia; }
export function porqueDemo() { return motivoDemo; }
export function uidAtual()   { return back?.uid || "(anônimo local)"; }

/**
 * Traduz o erro do Firebase para algo acionável.
 *
 * O SDK devolve só "Permission denied", e a mensagem genérica que existia
 * aqui antes ("confira a conexão") mandava a pessoa olhar justamente onde o
 * problema não está: numa recusa de permissão a conexão está perfeita. Quem
 * monta isto sozinho perde uma manhã por causa dessa diferença.
 */
export function explicarErro(erro) {
  const texto = String(erro?.code || "") + " " + String(erro?.message || erro || "");

  if (/permission[_ ]denied/i.test(texto)) {
    return "O Firebase recusou o acesso. Quase sempre é porque as regras do banco ainda não " +
           "foram publicadas: no console do Firebase, abra Realtime Database → aba Regras, " +
           "cole o conteúdo do arquivo regras-firebase.json e clique em Publicar.";
  }
  if (/network|unavailable|offline|timeout|failed to fetch/i.test(texto)) {
    return "Sem conexão com o servidor. Confira a internet e tente de novo.";
  }
  if (/disconnected|max retries/i.test(texto)) {
    return "A conexão com o servidor caiu. Tente de novo em alguns segundos.";
  }
  return "Não deu certo. Detalhe técnico: " + (erro?.message || erro);
}

const raizProfessores = () => `dias/${dia}/professores`;
const raizChamados    = (profId) => `dias/${dia}/chamados/${profId}`;

// ---------------------------------------------------------------- professores

/** Ouve, em tempo real, quem está de prova hoje. Devolve o cancelador. */
export function ouvirProfessoresAtivos(cb) {
  return back.ouvir(raizProfessores(), (valor) => {
    const lista = Object.entries(valor || {})
      .map(([id, p]) => ({ id, ...p }))
      .filter((p) => p && p.ativo)
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
    cb(lista);
  });
}

export function ouvirProfessor(profId, cb) {
  return back.ouvir(`${raizProfessores()}/${profId}`, cb);
}

/**
 * Entra na lista de hoje. É idempotente: se o professor já está lá, reassume o
 * painel existente em vez de criar um segundo. Se ele havia encerrado o dia e
 * voltou, reativa — sem reescrever "criadoEm", que as regras protegem contra
 * alteração.
 */
export async function registrarProfessor(profId, nome, materia) {
  const caminho = `${raizProfessores()}/${profId}`;
  const atual = await back.lerUmaVez(caminho);

  if (atual) {
    const remendos = {};
    remendos[`${caminho}/ativo`] = true;
    remendos[`${caminho}/encerradoEm`] = null;
    if (atual.nome !== nome) remendos[`${caminho}/nome`] = nome;
    if (atual.materia !== materia) remendos[`${caminho}/materia`] = materia;
    await back.atualizarVarios(remendos);
  } else {
    await back.gravar(caminho, {
      nome, materia,
      ativo: true,
      criadoEm: back.marcaTempo(),
      encerradoEm: null
    });
  }
  return profId;
}

/**
 * Encerra o dia do professor e cancela o que ficou pendente, num envio só.
 * Repare que nada é apagado: os chamados viram "cancelado" e continuam no
 * histórico.
 */
export async function encerrarDia(profId, idsPendentes = []) {
  const remendos = {};
  remendos[`${raizProfessores()}/${profId}/ativo`] = false;
  remendos[`${raizProfessores()}/${profId}/encerradoEm`] = back.marcaTempo();
  for (const id of idsPendentes) {
    remendos[`${raizChamados(profId)}/${id}/status`] = "cancelado";
  }
  await back.atualizarVarios(remendos);
}

// ------------------------------------------------------------------- chamados

/** Ouve a fila de um professor. Entrega todos os chamados do dia, ordenados. */
export function ouvirChamados(profId, cb) {
  return back.ouvir(raizChamados(profId), (valor) => {
    const lista = Object.entries(valor || {})
      .map(([id, c]) => ({ id, ...c }))
      .sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0));
    cb(lista);
  });
}

/** Lê a fila uma vez só — usado antes de chamar, para não duplicar a turma. */
export async function lerChamados(profId) {
  const valor = await back.lerUmaVez(raizChamados(profId));
  return Object.entries(valor || {}).map(([id, c]) => ({ id, ...c }));
}

export async function criarChamado(profId, turmaId, fiscal) {
  return back.empurrar(raizChamados(profId), {
    turma: turmaId,
    fiscal,
    status: "pendente",
    criadoEm: back.marcaTempo(),
    ultimoEm: back.marcaTempo(),
    insistencias: 1,
    atendidoEm: null,
    atendidoPor: null
  });
}

/**
 * Segunda chamada da mesma turma. De propósito NÃO cria outro cartão: soma uma
 * insistência e reposiciona o chamado no topo. A fila continua legível e o
 * professor entende que aquela sala está apertando.
 */
export async function reforcarChamado(profId, chamadoId, insistenciasAtuais = 1) {
  const base = `${raizChamados(profId)}/${chamadoId}`;
  await back.atualizarVarios({
    [`${base}/insistencias`]: Math.min(Number(insistenciasAtuais) + 1, 20),
    [`${base}/ultimoEm`]: back.marcaTempo()
  });
}

export async function marcarAtendido(profId, chamadoId, quemAtendeu) {
  const base = `${raizChamados(profId)}/${chamadoId}`;
  await back.atualizarVarios({
    [`${base}/status`]: "atendido",
    [`${base}/atendidoEm`]: back.marcaTempo(),
    [`${base}/atendidoPor`]: quemAtendeu || null
  });
}

/** Volta o chamado para a fila. É escrita de verdade, então o outro aparelho
 *  que estiver no mesmo painel também vê o cartão reaparecer. */
export async function reabrirChamado(profId, chamadoId) {
  const base = `${raizChamados(profId)}/${chamadoId}`;
  await back.atualizarVarios({
    [`${base}/status`]: "pendente",
    [`${base}/atendidoEm`]: null,
    [`${base}/atendidoPor`]: null
  });
}

export function ouvirConexao(cb) {
  return back.ouvirConexao(cb);
}
