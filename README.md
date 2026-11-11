# Rafael Vaz · Portfolio

Site em Next.js 13 (export estático), com Locomotive Scroll, GSAP e Framer Motion, publicado
em https://rafastuff.github.io. Os conteúdos dos projetos editam-se num backoffice (Decap CMS).

> **Estado (Fase 2, 11 nov 2026):** este ramo (`fonte`) é a futura fonte de verdade. O site
> publicado ainda vem do ramo `main` (ficheiros estáticos), com cópia em `publicado-legado`.
> Ver `docs/ativacao.md`.

## Onde está o quê
- `content/projetos/*.yml`: projetos editados no backoffice (hoje, só o Gallo).
- `content/*.md` + `src/data/projects.js`: projetos ainda no formato antigo (FPF, RRS, Monday).
  `src/lib/content.js` junta os dois formatos. As secções "Por confirmar" e
  "Imagens necessárias" dos `.md` são notas e não aparecem no site.
- `public/admin/`: backoffice (configuração, tradução pt-PT, regras, pré-visualização).
- `cms-auth/`: serviço de login com GitHub (Cloudflare Worker).
- `.github/workflows/site.yml`: validação, build e (quando ativada) publicação.
- `scripts/`: migração, validações e comparação com a linha de base.

## Documentação
- `docs/backoffice.md`: usar o backoffice (também localmente).
- `docs/autenticacao.md`: configurar e revogar o login.
- `docs/ativacao.md`: proteções do repositório e passos para ativar a produção.
- `docs/rollback.md`: recuperação.

## Comandos
- `npm install`
- `npm run dev` (abre em http://localhost:4000)
- `npm run cms` (servidor local do backoffice)
- `BASE_PATH= npm run build` (gera o site estático em `out/`)

## Histórico
Este repositório inclui o histórico do `rafaelrvaz25-design/portfolio-v2`, onde o site foi
desenvolvido. Esse repositório continua a servir o link antigo (ramo `gh-pages`, com
redirecionamentos, `/alpha/` e `/webflow/`) e não deve ser apagado.

## As três versões publicadas
- `/` · versão atual (tipografia Archivo, scroller de projetos)
- `/alpha/` · primeira versão, com o visual do template (commit `cec8fdf`)
- `/webflow/` · remake do site Webflow "Rafa Stuff" (2022), em `remake-webflow/`

O remake é HTML estático gerado por `node remake-webflow/build.mjs` a partir dos mesmos `content/*.md`.
Para a alpha: `git worktree add <pasta> cec8fdf`, copiar `content/*.md` atuais e `BASE_PATH=/portfolio-v2/alpha npm run build`.

## Fontes
- Títulos: **Mattone** (Collletttivo, Nunzio Mazzaferro), SIL Open Font License 1.1. Ficheiros em `src/fonts/mattone/` (com a licença).
- Corpo: Inter.

## Logo
- O novo Rv. foi vetorizado a partir da imagem do Rafa (potrace) para `src/data/logoNew.js`: `sharp` (desenho fiel, usado no header via `common/RvMark`) e `round` (cantos arredondados, usado no 3D).
- O Rv. 3D do hero é `components/LogoMaterial3D` com `variant="prata"` (há também `cromado` e `vidro`, testados e não usados).
  Leve (cerca de 21 mil triângulos), resolução limitada a 1.5x, só desenha quando está no ecrã.
  Nos primeiros 2 s mede a fluidez: abaixo de 35 fps, ou com "reduzir movimento", poupança de dados ou sem WebGL, mostra `public/logo-static/prata.webp`.
  `?noprobe` desliga a medição; `?capture` fixa a pose (foi assim que se geraram as imagens estáticas).
