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
//
//    ATENÇÃO: a linha abaixo PRECISA começar com "export const". O console do
//    Firebase mostra o bloco escrito só como "const firebaseConfig = {" — se
//    você colar por cima e o "export" sumir, o site para de abrir.
// -----------------------------------------------------------------------------
export const firebaseConfig = {
    apiKey: "AIzaSyA6s_Auach16SoWUZfI9CxyXMiuhuJRb0E",
    authDomain: "requisicao-prova-cfc.firebaseapp.com",
    databaseURL: "https://requisicao-prova-cfc-default-rtdb.firebaseio.com",
    projectId: "requisicao-prova-cfc",
    storageBucket: "requisicao-prova-cfc.firebasestorage.app",
    messagingSenderId: "659648714425",
    appId: "1:659648714425:web:0cec8977f220233fe1ed68"
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
