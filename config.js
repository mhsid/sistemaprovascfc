// =============================================================================
//  CONFIGURAÇÃO — este é o ÚNICO arquivo que você precisa editar.
// =============================================================================

// -----------------------------------------------------------------------------
// 1) CHAVES DO FIREBASE
//
//    Enquanto os campos estiverem com "COLE_AQUI", o site funciona em MODO DEMO
//    (os dados ficam só no aparelho, nada é compartilhado). Isso serve para
//    testar. Para valer no dia da prova, siga o LEIAME.md e cole aqui o bloco
//    que o Firebase mostrar em:
//      Console → ⚙ Configurações do projeto → Seus apps → Web → SDK
// -----------------------------------------------------------------------------
export const firebaseConfig = {
  apiKey:      "COLE_AQUI",
  authDomain:  "COLE_AQUI",
  databaseURL: "COLE_AQUI",   // precisa terminar com .firebasedatabase.app
  projectId:   "COLE_AQUI",
  appId:       "COLE_AQUI"
};

// -----------------------------------------------------------------------------
// 2) TURMAS DO COLÉGIO
//
//    id     → só letras e números, sem espaço e sem acento (é o que vai no banco)
//    rotulo → o que aparece na tela para o professor
//
//    Para adicionar uma turma, copie uma linha e mude os dois valores.
// -----------------------------------------------------------------------------
export const TURMAS = [
  { id: "6A", rotulo: "6º A" },
  { id: "6B", rotulo: "6º B" },
  { id: "6C", rotulo: "6º C" },
  { id: "6D", rotulo: "6º D" },
  { id: "7A", rotulo: "7º A" },
  { id: "7B", rotulo: "7º B" },
  { id: "7C", rotulo: "7º C" },
  { id: "7D", rotulo: "7º D" }
];

// -----------------------------------------------------------------------------
// 3) AJUSTES FINOS — pode deixar como está.
// -----------------------------------------------------------------------------
export const OPCOES = {
  // Fuso usado para saber que dia é hoje.
  fusoHorario: "America/Sao_Paulo",

  // Quantos segundos o botão "Desfazer" fica na tela depois de dar baixa.
  segundosDesfazer: 10,

  // De quantos em quantos segundos o painel volta a apitar enquanto
  // houver alguma turma esperando.
  segundosRelembrar: 30,

  // Depois de quantos minutos de espera o cartão da turma fica vermelho.
  minutosEsperaCritica: 10,

  // Impedir que a tela do celular apague enquanto o painel estiver aberto.
  manterTelaLigada: true,

  // Quantos segundos esperar a confirmação do servidor antes de avisar
  // ao fiscal que a rede está ruim.
  segundosEsperaEnvio: 8
};
