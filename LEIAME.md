# Painel de Chamados — Dias de Prova

Substitui as marcações no grupo do WhatsApp em dia de prova por uma **fila**.

- O **fiscal** escolhe a turma em que está, escolhe o professor e toca em um botão.
- O **professor da prova** vê todos os chamados numa tela só e vai desmarcando conforme atende.

A diferença em relação ao WhatsApp é que a fila é **estado, não mensagem**: se o celular dormir ou
a internet cair, ao voltar ele mostra a fila completa e atual. Nada se perde no meio de outras
conversas.

---

## Como funciona no dia

1. Todo mundo abre o mesmo link.
2. Quem está **de prova** toca em **“É meu dia de prova”**, escreve nome e matéria, e deixa o
   painel aberto. Podem ser vários professores no mesmo dia — cada um tem a sua própria fila.
3. Quem está **fiscalizando** toca em **“Sou fiscal de sala”**, escolhe a turma, escolhe o
   professor e toca em **“Solicitar presença”**.
4. O painel do professor apita, vibra e mostra o cartão da turma.
5. O professor vai até a sala e toca em **“Já atendi esta turma”**.
6. No fim, toca em **“Encerrar meu dia”**. No dia seguinte a lista começa vazia sozinha.

Detalhes que evitam confusão:

- **Chamar duas vezes a mesma turma não cria dois cartões.** Vira um reforço: o cartão ganha um
  selo “2×”, sobe para o topo da fila e o professor é avisado de novo.
- **Deu baixa sem querer?** Aparece um **Desfazer** por 10 segundos, e depois disso o chamado
  continua recuperável na aba **Histórico de hoje**, no botão “Reabrir chamado”.
- **Nada é apagado.** Encerrar o dia cancela o que estava pendente, mas o histórico do dia
  permanece.

> **Aviso honesto sobre o alerta sonoro:** com a tela do celular bloqueada, no iPhone o som **não
> toca** (o iOS suspende o áudio das páginas) e o Safari não vibra. Por isso o painel pede para
> manter a tela aberta — ele também tenta impedir que a tela apague sozinha. Ao voltar, o painel
> avisa quantos chamados chegaram enquanto você esteve fora, então nenhum some.

---

## Instalação — parte 1: Firebase (uma vez só, ~10 minutos)

É o serviço que sincroniza os celulares. O plano gratuito basta com folga: são 100 conexões
simultâneas e o colégio usa algo perto de 30.

1. Abra <https://console.firebase.google.com> e entre com uma conta Google.
2. **Adicionar projeto** → nome `provas-cfc` → **desmarque o Google Analytics** → **Criar**.
3. No menu lateral: **Criar → Realtime Database → Criar banco de dados**.
   - Local: **us-central1**.
   - Modo: **iniciar no modo bloqueado**.
4. Abra a aba **Regras** desse banco, apague tudo o que estiver lá, cole o conteúdo do arquivo
   **`regras-firebase.json`** deste repositório e clique em **Publicar**.
5. No menu lateral: **Authentication → Vamos começar → aba Sign-in method → Anônimo → Ativar →
   Salvar**.
6. Ainda em Authentication: **Settings → Domínios autorizados → Adicionar domínio** e escreva
   `SEU-USUARIO.github.io`.
   *Não pule este passo:* sem ele o site funciona no computador de teste e falha no celular dos
   professores, sem dar um erro que explique o motivo.
7. Vá em **⚙ Configurações do projeto → Seus apps →** ícone **`</>`** (Web) → apelido `site` →
   **não** marque Hosting → **Registrar app**.
8. Copie o bloco `firebaseConfig` que aparecer e cole em **`config.js`**, no lugar dos
   `"COLE_AQUI"`. Confira que o campo `databaseURL` existe; se não vier, pegue o endereço na aba
   Realtime Database (termina em `.firebasedatabase.app`).

## Instalação — parte 2: GitHub Pages (~3 minutos)

1. O repositório precisa ser **público** (o Pages de repositório privado é pago).
2. Envie os arquivos para a branch principal, mantendo tudo **na raiz** do repositório.
3. No GitHub: **Settings → Pages**.
4. Em **Source** escolha `Deploy from a branch`; em **Branch** escolha a branch principal e a pasta
   **`/ (root)`**; clique em **Save**.
5. Espere 1 ou 2 minutos. O endereço aparece no topo da página, no formato
   `https://SEU-USUARIO.github.io/sistemaprovascfc/`.
6. Abra o endereço no celular e use **Compartilhar → Adicionar à tela inicial**. Assim o site abre
   em tela cheia e vira “o aplicativo”.
7. Mande o link **uma vez** no grupo do WhatsApp e fixe a mensagem.

---

## Testar antes de configurar o Firebase

Sem as chaves, o site entra sozinho em **MODO DEMO** (faixa laranja no topo): tudo funciona, mas os
dados ficam só naquele aparelho. Dá para conferir o fluxo inteiro abrindo **duas abas** do mesmo
navegador — uma como professor, outra como fiscal.

Para rodar na sua máquina:

```sh
python3 -m http.server 8000
# abra http://127.0.0.1:8000
```

O modo demo também é a rede de segurança: se as chaves estiverem erradas ou o Firebase sair do ar,
o site cai nele em vez de mostrar uma tela branca. A tela **Ajustes** mostra, no diagnóstico, em
que modo o site está e por quê.

---

## Mudar as turmas

Abra **`config.js`** e edite a lista `TURMAS`. O `id` é o que vai gravado (só letras e números, sem
acento e sem espaço) e o `rotulo` é o que aparece na tela:

```js
export const TURMAS = [
  { id: "6A", rotulo: "6º A" },
  { id: "8B", rotulo: "8º B" },
  { id: "1EMA", rotulo: "1ª série A" }
];
```

No mesmo arquivo, `OPCOES` ajusta o tempo do “Desfazer”, de quanto em quanto tempo o painel volta a
apitar e a partir de quantos minutos de espera o cartão fica vermelho.

---

## Sobre segurança

O site é público e a configuração do Firebase fica visível no código — isso é normal em site
estático e não é o ponto fraco. Quem protege os dados são as regras do `regras-firebase.json`:
exigem login (anônimo, invisível para o professor), validam o formato de tudo o que entra e
**proíbem apagar qualquer coisa**.

Isso barra robô e curioso da internet. Não barra alguém do colégio que tenha o link e queira
atrapalhar — para uma equipe de professores, isso se resolve conversando, não com senha. Se um dia
aparecer abuso de verdade, o caminho é ativar o **App Check com reCAPTCHA v3** no Firebase, que é
gratuito e não muda nada na tela.

---

## Perguntas rápidas

**Dois professores podem ver o mesmo painel?** Podem — no celular e no computador, por exemplo. Os
dois veem a mesma fila e qualquer um dá baixa; o outro vê “Atendeu: Fulano” em vez de o cartão
simplesmente sumir.

**Marquei “é meu dia de prova” sem querer.** Toque em **Encerrar meu dia**: você sai da lista dos
fiscais na hora.

**Recarreguei a página, criei um professor duplicado?** Não. O identificador vem do nome, então
recarregar (ou abrir em outro aparelho com o mesmo nome) volta para o mesmo painel.

**Atualizei o site e o celular de um professor mostra a versão antiga.** O GitHub Pages guarda os
arquivos por até 10 minutos. Peça para fechar e reabrir depois desse tempo.

**Precisa instalar alguma coisa?** Não. Não há npm, build nem GitHub Actions — são arquivos
estáticos servidos direto do repositório.
