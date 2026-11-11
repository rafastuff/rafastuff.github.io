# Backoffice: como usar

O backoffice é o Decap CMS 3.17.3, em português de Portugal. Edita os projetos em
`content/projetos/*.yml` e guarda tudo no GitHub (`rafastuff/rafastuff.github.io`).

- **No site** (depois de configurado o login, docs/autenticacao.md):
  https://rafastuff.github.io/admin/ → «Entrar com o GitHub».
  Na Fase 2 ainda não existe: o site publicado continua a ser o antigo.
- **No teu computador** (já funciona): ver «Usar localmente», abaixo.

Usar só em computador; no telemóvel a barra de cima fica cortada.

## Dois eixos que não se misturam

| Eixo | Onde | Valores |
| --- | --- | --- |
| **Visibilidade do projeto** | primeiro campo do formulário | Público · Não listado · Rascunho · Arquivado |
| **Estado das alterações** | botão «Estado» no topo | Em edição → Em revisão → Pronto a publicar |

Um projeto Público pode ter alterações «Em edição» que ainda não estão no site.
Guardar nunca muda o site; só **Publicar** muda.

Um projeto novo, ou um duplicado, é sempre gravado como **Rascunho**, mesmo que o
formulário diga outra coisa. Para o pôr no site: abrir de novo, escolher Público ou
Não listado, Guardar e Publicar.

## Tarefas

**Corrigir uma palavra**: Projetos → projeto → seta à esquerda da secção → editar →
**Guardar** → Estado: **Pronto a publicar** → **Publicar** → **Publicar agora** → OK.

**Desistir de alterações**: **Descartar alterações não publicadas** (o site não muda).

**Criar projeto**: «＋ Projeto» (ou, num projeto aberto, Publicado → **Duplicar**).
O **endereço (slug)** escolhe-se aqui e não muda depois: tem de ser único e passa a ser
o nome do ficheiro. Se duplicares sem mudar o endereço, a publicação é bloqueada com
uma mensagem a explicar.

**Secções e blocos**: «Acrescentar secção»; dentro, «Acrescentar bloco»: Texto, Figura
ou Números em destaque. Arrastar pela barra `═` para reordenar.

**Imagens**: num bloco Figura, «Escolher imagem» → «Carregar imagem». As novas vão para
`public/images/uploads/`. Legenda obrigatória; texto alternativo opcional (sem ele,
usa a legenda).

**Ordem dos projetos**: campo Ordem (10, 20, 30…; 25 fica entre 20 e 30).

**Texto**: Markdown — `**negrito**`, linha começada por `- ` para listas,
`[texto](endereço)` para ligações, linha em branco entre parágrafos.

## O que é verificado antes de publicar

O workflow «Site» (GitHub → Actions) corre em cada gravação e bloqueia a publicação se:
YAML inválido, campo obrigatório em falta, visibilidade desconhecida, slug inválido,
repetido ou diferente do nome do ficheiro, imagem inexistente, página de um rascunho
no site gerado, não listado sem `noindex` ou presente em listagens e sitemap, ligação
interna partida. O erro aparece na página da execução, com o ficheiro e o motivo.

## Usar localmente

Precisa de Node.js 20 ou mais recente.

```sh
git clone -b fonte https://github.com/rafastuff/rafastuff.github.io.git portfolio
cd portfolio
npm install
npm run dev     # terminal 1: o site em http://localhost:4000
npm run cms     # terminal 2: servidor local do backoffice (grava no Git deste computador)
```

Abrir http://localhost:4000/admin/index.html → **Entrar** (sem palavra-passe; só em
localhost). «Publicar» faz commit no ramo local `fonte`; nada vai para o GitHub sem
`git push`.

Cuidados no modo local: não deixar ficheiros alterados à mão por gravar no Git (senão
«Guardar» falha), e não fazer `git pull` com rascunhos abertos. No Windows, em vez de
`npm run cms`: `set MODE=git && npx decap-server`.

Desfazer testes locais: `git reset --hard origin/fonte` e
`git branch | grep cms/ | xargs git branch -D`.

## Para quem desenvolve

```sh
node scripts/validar-conteudos.mjs     # conteúdos e configuração
BASE_PATH= npx next build
node scripts/validar-out.mjs           # visibilidade, sitemap, noindex, imagens
node scripts/verificar-ligacoes.mjs    # ligações e recursos internos
node scripts/comparar-html.mjs         # HTML das 5 páginas igual à linha de base de 11 nov 2026
node scripts/migrar.mjs <slug>         # migrar um projeto antigo para YAML (Fase 3)
python3 scripts/capturas.py <pasta>    # capturas desktop/mobile (Playwright)
```
