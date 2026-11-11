# Ativar a publicação em produção (fase posterior, com aprovação)

Hoje (Fase 2) nada disto está ativo. O site em https://rafastuff.github.io continua a
ser servido pelo GitHub Pages a partir do ramo `main` (ficheiros estáticos, commit
`af41e1c`). O backoffice publica para o ramo `fonte`, que não está ligado ao site.

## Ramos

| Ramo | Conteúdo | Papel |
| --- | --- | --- |
| `main` | Site estático publicado (`af41e1c`) | Produção atual. Não mexer até à ativação. |
| `publicado-legado` | Igual ao `main` (mesma árvore Git) | Cópia de segurança para rollback. Nunca apagar. |
| `fonte` | Código Next.js, conteúdos, backoffice, workflow; histórico do `portfolio-v2` | Fonte de verdade. Passa a ser o `main` na ativação. |
| `cms/…` | Rascunhos do backoffice | Criados e apagados pelo Decap. |

## Proteções recomendadas (a configurar por ti, antes da ativação)

O Decap publica fazendo merge de um pull request pela API do GitHub, com a tua conta.
Regras compatíveis com isso, numa *ruleset* em Settings → Rules → Rulesets, para `main`:

| Regra | Valor | Porquê |
| --- | --- | --- |
| Require a pull request before merging | ligado, **0 aprovações** | O Decap publica sempre por pull request. Com 1 aprovação ficarias bloqueado, porque não podes aprovar o teu próprio pull request. |
| Require status checks to pass | `Validar e gerar o site` | Publicar só funciona com o check verde. Se carregares em Publicar antes de o check terminar, o Decap mostra um erro e basta tentar outra vez. |
| Require branches to be up to date | **desligado** | O Decap não atualiza o ramo do rascunho; ficarias impedido de publicar depois de outra publicação. |
| Require linear history | ligado | Compatível: o backoffice usa *squash merges*. |
| Block force pushes | ligado | |
| Restrict deletions | ligado | |
| Bypass list | **vazia** | Importante: como dono do repositório, sem isto as regras não se aplicam à tua conta, e o Decap trabalha com a tua conta. |

Para `publicado-legado`: só «Restrict deletions» e «Block force pushes».

Consequência a conhecer: com estas regras ninguém (nem tu) faz push direto para `main`.
Alterações de código passam por pull request, como as do backoffice.

**Estas regras não puderam ser testadas nesta fase** (ver o relatório da Fase 2). O teste
está descrito em «Teste das proteções», abaixo.

## Passos da ativação

1. Login real configurado e testado (docs/autenticacao.md), com `branch: fonte`.
2. Criar a ruleset acima para `fonte` e fazer o «Teste das proteções».
3. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
   (A partir deste momento o site deixa de vir do ramo `main` estático. Fazer os passos
   3 a 6 seguidos, numa altura calma.)
4. Settings → Secrets and variables → Actions → Variables: `PUBLICAR_PRODUCAO` = `sim`.
5. Tornar `fonte` o novo `main`: pull request de `fonte` para `main` não funciona
   (históricos diferentes), por isso: Settings → Branches → mudar o ramo por omissão para
   `fonte`, apagar a proteção antiga se existir, e renomear `main` → `publicado-antigo`
   e `fonte` → `main` (Settings → Branches → renomear). O `publicado-legado` fica intacto.
6. Em `public/admin/config.yml`: `branch: main`. O push dispara o workflow e a publicação.
7. Verificar o site (as 5 páginas) e `node scripts/comparar-html.mjs` no artefacto.
8. Mover a ruleset de `fonte` para `main`.

Se algo correr mal em qualquer passo: docs/rollback.md, secção 1.

## Teste das proteções (antes do passo 3)

Com login real e a ruleset aplicada a `fonte`:

1. No backoffice, mudar uma palavra no Gallo e Guardar → aparece um pull request.
2. Mudar para «Pronto a publicar» e Publicar **antes** de o check terminar → esperado:
   erro do Decap a dizer que o check é obrigatório; nada muda em `fonte`.
3. Esperar o check verde e Publicar → esperado: merge em `fonte` num só commit.
4. Num rascunho, pôr uma imagem inexistente (ou slug diferente do ficheiro) → check
   vermelho → Publicar recusado.
5. `git push origin fonte` direto de um computador → esperado: recusado.
