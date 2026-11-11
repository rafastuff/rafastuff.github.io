# Login do backoffice (GitHub + Cloudflare Workers)

O GitHub Pages é estático e não pode guardar o *client secret* de uma aplicação OAuth.
Por isso o login passa por um pequeno serviço próprio, `cms-auth/worker.js`, alojado
no plano gratuito do Cloudflare Workers.

Quem consegue **gravar** é decidido pelo GitHub: só contas com permissão de escrita no
repositório `rafastuff/rafastuff.github.io`. A página `/admin` é pública, mas sem login
e sem essa permissão não lê nem grava nada.

## Como funciona

1. Em `/admin`, «Entrar com o GitHub» abre uma janela em `https://<worker>/auth`.
2. O Worker redireciona para o GitHub com um código `state` aleatório (contra CSRF).
3. Autorizas no GitHub. O GitHub volta a `https://<worker>/callback`.
4. O Worker confirma o `state`, troca o código por um token e confirma que o login
   está em `ALLOWED_USERS`.
5. O token é entregue à janela do backoffice, e só se a origem estiver em `ALLOWED_ORIGINS`.

O token fica no browser (`localStorage`, chave `decap-cms-user`) até carregares em
«Terminar sessão». O Worker não guarda tokens.

## Permissões

- Âmbito pedido: **`public_repo`** (repositórios públicos). O Worker recusa qualquer
  pedido de âmbito maior (`repo`).
- Limitação do GitHub: uma OAuth App não se restringe a um só repositório. O token dá
  escrita a todos os repositórios públicos a que a tua conta tem acesso. Por isso: sem
  scripts de terceiros no `/admin`, Decap com versão fixa e hash de integridade, CSP, e
  terminar sessão quando acabares.

## Configurar (passos manuais, só tu podes fazer)

### 1. Criar a conta Cloudflare (gratuita)

https://dash.cloudflare.com/sign-up. Não é preciso domínio nem cartão.
Limites do plano gratuito: 100 000 pedidos por dia; um login usa 2.

### 2. Criar o Worker

Numa pasta com este repositório:

```sh
cd cms-auth
npx wrangler login          # abre o browser para autorizar o wrangler na tua conta
npx wrangler deploy         # publica o Worker; mostra o endereço, ex.:
                            # https://rafastuff-cms-auth.<a-tua-conta>.workers.dev
```

### 3. Criar a OAuth App no GitHub

Na organização: https://github.com/organizations/rafastuff/settings/applications/new
(ou na tua conta: Settings → Developer settings → OAuth Apps → New OAuth App).

| Campo | Valor |
| --- | --- |
| Application name | Backoffice rafastuff |
| Homepage URL | `https://rafastuff.github.io` |
| Authorization callback URL | `https://rafastuff-cms-auth.<a-tua-conta>.workers.dev/callback` |
| Enable Device Flow | desligado |

Depois de criar: copia o **Client ID** e carrega em **Generate a new client secret**.
Se a página mostrar a opção de tokens com validade, ativa-a: a sessão passa a expirar
(o Decap pede novo login quando expirar).

### 4. Guardar as variáveis no Worker (o segredo nunca vai para o repositório)

```sh
cd cms-auth
npx wrangler secret put GITHUB_CLIENT_SECRET    # cola o client secret quando pedir
```

E em `cms-auth/wrangler.toml`, descomenta e preenche (não são segredos):

```toml
GITHUB_CLIENT_ID = "o Client ID"
ALLOWED_USERS = "o-teu-login-github"
```

Volta a publicar: `npx wrangler deploy`.

### 5. Apontar o backoffice para o Worker

Em `public/admin/config.yml`, troca
`base_url: https://SUBSTITUIR-PELO-ENDERECO-DO-WORKER.workers.dev` pelo endereço do
passo 2. O workflow deixa de mostrar o aviso sobre `base_url`.

### 6. Primeiro login

Se o GitHub mostrar a organização `rafastuff` na página de autorização com um botão
**Grant**, carrega nele: as organizações podem bloquear OAuth Apps até serem aprovadas.
Também se aprova em https://github.com/organizations/rafastuff/settings/oauth_application_policy.

## Revogar o acesso

| Situação | O que fazer |
| --- | --- |
| Perdeste o computador ou suspeitas de fuga do token | GitHub → Settings → Applications → Authorized OAuth Apps → Backoffice rafastuff → **Revoke**. O backoffice volta ao ecrã de login (testado). |
| Revogar todas as sessões de todos | Página da OAuth App → **Revoke all user tokens** |
| O client secret foi exposto | Página da OAuth App → gerar novo secret, apagar o antigo, `npx wrangler secret put GITHUB_CLIENT_SECRET` |
| Desligar o login por completo | Cloudflare → Workers → rafastuff-cms-auth → apagar ou desativar; ou `npx wrangler secret delete GITHUB_CLIENT_SECRET` (o Worker responde «Serviço de login por configurar», testado) |

Revogar o login não afeta o site publicado.

## Testar localmente (sem credenciais reais)

```sh
node cms-auth/teste/servidores.mjs ok          # Worker + GitHub simulado + página com o Decap
python3 cms-auth/teste/login.py ok             # precisa de Playwright e Chrome
```

Outros cenários: `recusa`, `state-errado`, `outro-utilizador`; origem não autorizada:
`python3 cms-auth/teste/login.py ok http://localhost:4831`; conta sem escrita:
`python3 cms-auth/teste/login.py ok http://localhost:4830 sem-push`.
