// Valida os conteúdos antes do build. Sai com 1 se encontrar um erro.
//   node scripts/validar-conteudos.mjs
// - cada content/projetos/*.yml: YAML válido, campos obrigatórios, visibilidade conhecida,
//   slug igual ao nome do ficheiro, imagens existentes em public/images/ (src/lib/content.js);
// - IDs e slugs únicos entre todos os projetos (YAML e formato antigo);
// - a configuração do backoffice está coerente com o site (visibilidades e pasta dos conteúdos).
import fs from 'fs';
import YAML from 'yaml';
import { getProjects, VISIBILIDADES } from '../src/lib/content.js';

const errors = [];
const warnings = [];

let projects = [];
try {
  projects = getProjects();
} catch (e) {
  errors.push(e.message);
}

const config = YAML.parse(fs.readFileSync('public/admin/config.yml', 'utf8'));
const collection = config.collections?.find((c) => c.name === 'projetos');
if (!collection) errors.push('public/admin/config.yml: falta a coleção "projetos"');
else {
  if (collection.folder !== 'content/projetos') errors.push('public/admin/config.yml: a coleção "projetos" tem de usar content/projetos');
  const options = collection.fields.find((f) => f.name === 'visibilidade')?.options?.map((o) => o.value) || [];
  if (options.join() !== VISIBILIDADES.join()) errors.push(`public/admin/config.yml: as visibilidades do editor (${options}) não são as do site (${VISIBILIDADES})`);
  if (collection.fields.find((f) => f.name === 'visibilidade')?.default !== 'rascunho') errors.push('public/admin/config.yml: a visibilidade por omissão tem de ser "rascunho"');
  if (collection.delete !== false) warnings.push('public/admin/config.yml: apagar projetos está ligado (recomendado: delete: false)');
}
if (config.local_backend) errors.push('public/admin/config.yml: local_backend não pode estar ligado no ficheiro (cms.js liga-o só em localhost)');
if (/SUBSTITUIR/.test(config.backend?.base_url || '')) warnings.push('public/admin/config.yml: backend.base_url ainda não tem o endereço do serviço de login (o login real não funciona)');

const counts = projects.reduce((a, p) => ({ ...a, [p.visibilidade]: (a[p.visibilidade] || 0) + 1 }), {});
console.log(`Projetos: ${projects.length} ${JSON.stringify(counts)}`);
for (const w of warnings) console.log(`AVISO: ${w}`);
if (errors.length) {
  console.log(`FALHOU (${errors.length}):\n- ${errors.join('\n- ')}`);
  // No GitHub Actions, cada erro aparece também como anotação na página da execução.
  if (process.env.GITHUB_ACTIONS) for (const e of errors) console.log(`::error title=Validação::${e.replace(/\n/g, ' ')}`);
  process.exitCode = 1;
} else console.log('OK: conteúdos válidos, IDs e slugs únicos, configuração coerente.');
