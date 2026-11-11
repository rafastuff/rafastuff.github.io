// Integridade do site gerado em out/: cada ligação e recurso interno (href, src, srcset)
// de cada página HTML tem de existir em out/. Sai com 1 se faltar alguma coisa.
//   node scripts/verificar-ligacoes.mjs
import fs from 'fs';
import path from 'path';

const OUT = path.join(process.cwd(), 'out');
const BASE = process.env.BASE_PATH || '';
const pages = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) walk(full);
    else if (f.name.endsWith('.html')) pages.push(full);
  }
})(OUT);

// Um caminho do site existe se for um ficheiro, ou uma pasta com index.html.
function exists(urlPath) {
  let p = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length) || '/';
  const file = path.join(OUT, p);
  if (!file.startsWith(OUT)) return false;
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return true;
  return fs.existsSync(path.join(file, 'index.html'));
}

const missing = [];
let checked = 0;
for (const page of pages) {
  // o backoffice carrega bibliotecas de fora e tem caminhos próprios: fica fora desta verificação
  if (path.relative(OUT, page).startsWith('admin/')) continue;
  const html = fs.readFileSync(page, 'utf8');
  const refs = new Set();
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) refs.add(m[1]);
  for (const m of html.matchAll(/\s(?:srcset|srcSet)="([^"]+)"/g)) for (const part of m[1].split(',')) refs.add(part.trim().split(/\s+/)[0]);
  for (const ref of refs) {
    if (!ref.startsWith('/') || ref.startsWith('//')) continue; // externos, mailto:, âncoras
    checked++;
    if (!exists(ref)) missing.push(`${path.relative(OUT, page)} → ${ref}`);
  }
}

console.log(`Páginas: ${pages.length}; ligações e recursos internos verificados: ${checked}`);
if (missing.length) {
  console.log(`FALHOU (${missing.length} em falta):\n- ${missing.slice(0, 50).join('\n- ')}`);
  process.exitCode = 1;
} else console.log('OK: todas as ligações e recursos internos existem.');
