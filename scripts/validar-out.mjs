// Verifica o site gerado em out/ contra a visibilidade de cada projeto. Sai com 1 se falhar.
//   node scripts/validar-out.mjs
// - público: tem página, cartão na homepage, entrada no sitemap, sem noindex;
// - não listado: tem página com <meta robots noindex> (sem nofollow), e não aparece na
//   homepage, no sitemap nem no «Próximo projeto» de nenhuma página;
// - rascunho e arquivado: não há página nem nenhuma referência ao slug no site gerado.
// Verifica também que todas as imagens referidas nas páginas existem em out/.
import fs from 'fs';
import path from 'path';
import { getProjects } from '../src/lib/content.js';

const OUT = path.join(process.cwd(), 'out');
const read = (p) => fs.readFileSync(path.join(OUT, p), 'utf8');
const errors = [];
const ok = (cond, msg) => { if (!cond) errors.push(msg); };

const allHtml = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) walk(full);
    else if (/\.(html|txt|xml)$/.test(f.name)) allHtml.push(path.relative(OUT, full));
  }
})(OUT);

const home = read('index.html');
const sitemap = fs.existsSync(path.join(OUT, 'sitemap.xml')) ? read('sitemap.xml') : '';
ok(sitemap, 'falta out/sitemap.xml');

const projects = getProjects();
const pageFile = (slug) => `projetos/${slug}/index.html`;
const hrefTo = (slug) => new RegExp(`href="[^"]*/projetos/${slug}/?"`);
const robots = (html) => (html.match(/<meta name="robots" content="([^"]*)"/) || [])[1] || null;

for (const p of projects) {
  const file = pageFile(p.slug);
  const exists = fs.existsSync(path.join(OUT, file));
  const inSitemap = sitemap.includes(`/projetos/${p.slug}/`);
  const onHome = hrefTo(p.slug).test(home);
  const tag = `${p.slug} (${p.visibilidade})`;
  if (p.visibilidade === 'publico') {
    ok(exists, `${tag}: falta a página`);
    ok(onHome, `${tag}: não aparece na homepage`);
    ok(inSitemap, `${tag}: não está no sitemap`);
    if (exists) ok(!robots(read(file)), `${tag}: não devia ter meta robots`);
  } else if (p.visibilidade === 'nao_listado') {
    ok(exists, `${tag}: falta a página`);
    ok(!onHome, `${tag}: aparece na homepage`);
    ok(!inSitemap, `${tag}: está no sitemap`);
    if (exists) ok(robots(read(file)) === 'noindex', `${tag}: meta robots devia ser "noindex" (é "${robots(read(file))}")`);
    for (const other of projects.filter((o) => o !== p && o.visibilidade !== 'rascunho' && o.visibilidade !== 'arquivado')) {
      const f = pageFile(other.slug);
      if (fs.existsSync(path.join(OUT, f))) ok(!hrefTo(p.slug).test(read(f)), `${tag}: ligado a partir de ${f}`);
    }
  } else {
    ok(!exists, `${tag}: tem página publicada`);
    const leaks = allHtml.filter((f) => read(f).includes(`/projetos/${p.slug}/`) || read(f).includes(`"${p.slug}"`));
    ok(!leaks.length, `${tag}: referido em ${leaks.join(', ')}`);
  }
}

// Nenhuma página de projeto pode existir sem um projeto público ou não listado por trás
// (apanha páginas de rascunhos, de projetos apagados ou de builds antigos).
const allowedPages = new Set(projects.filter((p) => p.visibilidade === 'publico' || p.visibilidade === 'nao_listado').map((p) => p.slug));
const projDir = path.join(OUT, 'projetos');
if (fs.existsSync(projDir)) {
  for (const d of fs.readdirSync(projDir)) {
    if (!allowedPages.has(d)) ok(false, `out/projetos/${d}/: página sem projeto público ou não listado correspondente`);
  }
}

// Imagens referidas nas páginas HTML (src, srcset) existem em out/.
for (const f of allHtml.filter((f) => f.endsWith('.html'))) {
  const html = read(f);
  for (const m of html.matchAll(/(?:src|srcSet|srcset)="([^"]+)"/g)) {
    const url = m[1].split('?')[0];
    if (!url.startsWith('/images/')) continue;
    ok(fs.existsSync(path.join(OUT, url)), `${f}: imagem em falta ${url}`);
  }
}

const counts = projects.reduce((a, p) => ({ ...a, [p.visibilidade]: (a[p.visibilidade] || 0) + 1 }), {});
console.log(`Projetos: ${JSON.stringify(counts)}; ficheiros verificados: ${allHtml.length}`);
if (errors.length) {
  console.log(`FALHOU (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else console.log('OK: visibilidades, sitemap, noindex e imagens corretos.');
