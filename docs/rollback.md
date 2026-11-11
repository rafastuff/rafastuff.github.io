# Recuperação (rollback)

Antes de qualquer comando que mude um ramo, confirma o estado:

```sh
git fetch origin
git status                  # sem alterações por gravar
git log --oneline -5 origin/main origin/fonte
```

Nada aqui apaga ramos nem reescreve histórico. Todas as recuperações acrescentam um
commit novo (revert) ou mudam qual ramo o GitHub Pages serve.

## 1. Restaurar a versão do site publicada antes do backoffice

O site de 11 nov 2026 (commit `af41e1c`) está guardado no ramo **`publicado-legado`**,
no GitHub. Foi verificado a partir de um clone novo:

- tem a mesma árvore Git que o `main` atual (`185cd24…`);
- 14 ficheiros amostrados (as 5 páginas, imagens, scripts) são byte a byte iguais aos
  servidos em https://rafastuff.github.io;
- servido localmente, dá as mesmas 60 capturas que a linha de base (só o relógio muda).

**Hoje não há nada a restaurar**: o `main` e o GitHub Pages não foram alterados.

Depois da ativação, se o site ficar mal:

1. Settings → Pages → Build and deployment → Source: **Deploy from a branch**.
2. Branch: **`publicado-legado`**, pasta **/ (root)** → Save.
3. Esperar 1 a 2 minutos e abrir https://rafastuff.github.io.

Para voltar ao site gerado pelo backoffice: Source: **GitHub Actions** e, em Actions →
Site, «Re-run all jobs» da última execução bem-sucedida do `main`.

## 2. Reverter uma alteração editorial

| Quando | Como |
| --- | --- |
| Ainda não publicada | No backoffice: **Descartar alterações não publicadas**. Apaga o rascunho (ramo e pull request); o site não muda. |
| Já publicada | No GitHub, abrir o pull request publicado (Pull requests → Closed) → **Revert** → criar o pull request → esperar o check verde → **Merge**. O site volta ao estado anterior no deploy seguinte. |
| Já publicada, sem pull request à mão | `git log --oneline -- content/projetos/<id>.yml`, depois `git revert <commit>` num ramo novo e pull request. |
| Recuperar só um texto antigo | GitHub → `content/projetos/<id>.yml` → History → copiar o trecho → colar no backoffice → Guardar → Publicar. |

Validado: na Prova de Conceito (revert local, ficheiro igual byte a byte) e na Fase 2 com
um commit inválido real no ramo `fonte`, bloqueado pelo workflow e revertido.

## 3. Desativar temporariamente o backoffice

O site continua online em todos os casos. Por ordem de rapidez:

1. **Desligar o login**: `cd cms-auth && npx wrangler secret delete GITHUB_CLIENT_SECRET`
   (ou desativar o Worker no Cloudflare). O login passa a responder «Serviço de login por
   configurar» (testado). Para reativar: `npx wrangler secret put GITHUB_CLIENT_SECRET`.
2. **Terminar sessões já abertas**: página da OAuth App no GitHub → **Revoke all user
   tokens**. Um backoffice aberto volta ao ecrã de login (testado com um token revogado).
3. **Retirar a página `/admin` do site**: pull request que apaga `public/admin/`. Os
   conteúdos e o site não são afetados.

## 4. Recuperar de uma falha de deploy

| Falha | O que acontece | O que fazer |
| --- | --- | --- |
| Conteúdo inválido (YAML, campo, imagem, slug) | O job «Validar e gerar o site» falha; «Publicar» não corre. O site fica como estava. | Ver o erro em Actions (diz o ficheiro e o problema), corrigir no backoffice ou reverter (secção 2). |
| O build do Next.js falha | Igual: nada é publicado. | Igual. |
| A publicação falha a meio | O GitHub Pages mantém a versão anterior. | Actions → a execução → «Re-run failed jobs». |
| Publicado conteúdo válido mas errado | O site mostra-o. | Secção 2 (revert) ou secção 1 (voltar ao `publicado-legado`). |

## 5. Restaurar uma configuração anterior que funcionava

- **Backoffice, workflow, validações**: estão versionados no repositório.
  `git log --oneline -- public/admin .github scripts src/lib` para encontrar o commit e
  `git revert <commit>` (num pull request, depois da ativação).
- **Serviço de login**: `cd cms-auth && npx wrangler deployments list` e
  `npx wrangler rollback <id-da-versão>`; ou voltar a publicar uma versão anterior de
  `cms-auth/worker.js` com `npx wrangler deploy`.
- **Versão do Decap**: está fixa em `public/admin/index.html` (versão e hash de
  integridade). Para voltar atrás, repor a linha anterior desse ficheiro.

## 6. Onde está cada cópia

| O quê | Onde | Depende de ficheiros locais? |
| --- | --- | --- |
| Site publicado a 11 nov 2026 | ramo `publicado-legado` (e, até à ativação, `main`) | Não |
| Código e conteúdos, com histórico desde o início | ramo `fonte` | Não |
| Histórico original e o link antigo | repositório `rafaelrvaz25-design/portfolio-v2` (`main`, `cms-poc`, `gh-pages`) | Não. Não apagar: o `gh-pages` serve os redirecionamentos do link antigo, `/alpha/` e `/webflow/`. |
