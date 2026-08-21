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

import { firebaseConfig } from "../config.js";
import { criarBackendDemo } from "./demo.js";
import { definirDeslocamento, formatarDia } from "./dia.js";

let back = null;   // backend em uso
let dia = "";      // "AAAA-MM-DD" fixado no início da sessão
let motivoDemo = "";

/**
 * Escolhe o backend e descobre o dia. Cai no modo demo tanto quando o config
 * ainda não foi preenchido quanto quando o Firebase falha — uma configuração
 * errada degrada para algo utilizável em vez de virar tela branca.
 */
export async function iniciarDados() {
  try {
    const fb = await import("./firebase.js");
    if (!fb.configPreenchida(firebaseConfig)) {
      motivoDemo = "O config.js ainda está sem as chaves do Firebase.";
    } else {
      back = await fb.criarBackendFirebase(firebaseConfig);
      definirDeslocamento(await back.deslocamentoDoServidor());
    }
  } catch (erro) {
    console.error("Firebase indisponível:", erro);
    motivoDemo = erro?.message || String(erro);
  }

  if (!back) back = criarBackendDemo();
  dia = formatarDia();
  return { modo: back.modo, dia, motivoDemo };
}

export function modoAtual()  { return back ? back.modo : "demo"; }
export function diaAtual()   { return dia; }
export function porqueDemo() { return motivoDemo; }
export function uidAtual()   { return back?.uid || "(anônimo local)"; }

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
