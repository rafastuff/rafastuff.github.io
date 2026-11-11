// Adaptador de conteúdos (prova de conceito do backoffice, ramo cms-poc).
//
// Os projetos podem estar em dois formatos durante a migração:
// - YAML em content/projetos/<id>.yml, editado no Decap CMS (/admin);
// - o formato antigo: entrada em src/data/projects.js + Markdown em content/*.md.
// Um projeto em YAML substitui a entrada antiga com o mesmo slug.
//
// O YAML é convertido no mesmo Markdown que os ficheiros antigos usam e lido pelo mesmo
// parseCaseStudy, por isso as páginas recebem exatamente a mesma estrutura de antes
// (tempo de leitura, variantes mobile, [por confirmar], números em destaque).
//
// Corre só no build (server components), por isso pode usar fs.
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { parseCaseStudy, loadCaseStudy } from './caseStudy.js';
import { projects as legacyProjects } from '../data/projects.js';

const DIR = path.join(process.cwd(), 'content', 'projetos');

export const VISIBILIDADES = ['publico', 'nao_listado', 'rascunho', 'arquivado'];
// Com CMS_PREVIEW=1 (só para pré-visualizar localmente), os rascunhos também ganham página.
// O build de produção nunca define esta variável.
const PREVIEW = process.env.CMS_PREVIEW === '1';

// Rótulos da ficha, pela ordem em que aparecem no site (Facts.jsx).
export const FICHA = [
  ['papel', 'Papel'],
  ['cliente', 'Cliente'],
  ['setor', 'Setor'],
  ['duracao', 'Duração'],
  ['equipa', 'Equipa'],
  ['impacto', 'Impacto'],
];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(id, msg) {
  throw new Error(`content/projetos/${id}.yml: ${msg}`);
}

// Imagem referida no conteúdo: tem de existir em public/ e ter um caminho seguro.
function checkImage(id, where, src, required) {
  if (!src) { if (required) fail(id, `${where}: falta a imagem`); return; }
  if (/[\s()]/.test(src)) fail(id, `${where}: o caminho da imagem não pode ter espaços nem parênteses (${src})`);
  const rel = String(src).split('?')[0].replace(/^\//, '');
  if (rel.includes('..') || !rel.startsWith('images/')) fail(id, `${where}: a imagem tem de estar em public/images/ (${src})`);
  if (!fs.existsSync(path.join(process.cwd(), 'public', rel))) fail(id, `${where}: a imagem não existe em public/ (${src})`);
}

// Validação: um erro aqui faz falhar o build, em vez de publicar uma página partida.
function validate(id, p) {
  if (!SLUG.test(id)) fail(id, `o nome do ficheiro tem de ser um slug (a-z, 0-9 e hífenes)`);
  if (!p || typeof p !== 'object') fail(id, 'ficheiro vazio ou inválido');
  if (!SLUG.test(p.slug || '')) fail(id, `slug inválido: "${p.slug}"`);
  // O nome do ficheiro é o ID estável do projeto e o slug é o endereço. Têm de ser iguais:
  // o Decap cria o ficheiro a partir do slug e nunca o renomeia, por isso um slug diferente
  // significa um endereço mudado depois de criado, ou um duplicado com o slug do original
  // (o Decap gravaria «gallo-1.yml» com o slug «gallo»).
  if (p.slug !== id) fail(id, `o endereço (slug "${p.slug}") tem de ser igual ao nome do ficheiro ("${id}"). O endereço escolhe-se ao criar o projeto e não muda depois.`);
  if (!VISIBILIDADES.includes(p.visibilidade)) fail(id, `visibilidade inválida: "${p.visibilidade}"`);
  if (typeof p.ordem !== 'number') fail(id, 'a ordem tem de ser um número');
  for (const f of ['titulo', 'categoria', 'titulo_pagina']) if (!p[f]) fail(id, `falta o campo ${f}`);
  for (const f of ['papel', 'cliente', 'setor']) if (!p.ficha?.[f]) fail(id, `falta o campo ficha.${f}`);
  checkImage(id, 'capa', p.capa?.imagem, true);
  if (!Array.isArray(p.secoes) || !p.secoes.length) fail(id, 'o projeto precisa de pelo menos uma secção');
  p.secoes.forEach((s, i) => {
    const where = `secção ${i + 1}`;
    if (!s.titulo) fail(id, `${where}: falta o título`);
    for (const b of s.blocos || []) {
      if (b.tipo === 'texto') {
        if (/^#{1,2} /m.test(b.corpo || '')) fail(id, `${where}: um bloco de texto não pode ter títulos # ou ## (usar ### ou uma secção nova)`);
      } else if (b.tipo === 'figura') {
        checkImage(id, `${where}: figura`, b.imagem, true);
        checkImage(id, `${where}: figura (telemóvel)`, b.imagem_mobile, false);
        if (!b.legenda) fail(id, `${where}: figura sem legenda`);
      } else if (b.tipo === 'numeros') {
        for (const it of b.itens || []) {
          if (String(it.valor ?? '').includes('|')) fail(id, `${where}: um número não pode conter "|"`);
        }
      } else fail(id, `${where}: tipo de bloco desconhecido "${b.tipo}"`);
    }
  });
}

function readYamlProjects() {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR)
    .filter((f) => f.endsWith('.yml'))
    .map((f) => {
      const id = f.replace(/\.yml$/, '');
      let data;
      try {
        data = YAML.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
      } catch (e) {
        fail(id, `o ficheiro não é YAML válido (${e.message.split('\n')[0]})`);
      }
      validate(id, data);
      return data && { id, data };
    });
}

const oneLine = (s) => String(s ?? '').replace(/\s*\n\s*/g, ' ').trim();

// YAML → o Markdown dos case studies (o formato que parseCaseStudy lê).
export function projectToMarkdown(p) {
  const out = [`# Case study: ${p.titulo}`, '', `## ${oneLine(p.titulo_pagina)}`, ''];
  if (p.descricao) out.push(String(p.descricao).trim(), '');
  out.push('### Ficha rápida');
  for (const [key, label] of FICHA) {
    if (p.ficha?.[key]) out.push(`- **${label}:** ${oneLine(p.ficha[key])}`);
  }
  out.push('', '---');
  for (const s of p.secoes) {
    out.push('', `## ${oneLine(s.titulo)}`, '');
    const parts = [];
    if (s.subtitulo) parts.push(`### ${oneLine(s.subtitulo)}`);
    for (const b of s.blocos || []) {
      if (b.tipo === 'texto') parts.push(String(b.corpo ?? '').trim());
      if (b.tipo === 'figura') parts.push(`![${oneLine(b.legenda)}](${b.imagem})`);
      if (b.tipo === 'numeros') {
        parts.push([':::stats', ...(b.itens || []).map((it) => `${oneLine(it.valor)} | ${oneLine(it.descricao)}`), ':::'].join('\n'));
      }
    }
    out.push(parts.filter(Boolean).join('\n\n'));
  }
  return out.join('\n') + '\n';
}

// Lista única dos projetos, ordenada por `ordem`. Cada projeto tem os campos que os
// componentes já usavam (slug, title, tag, client, color, cover) e a sua origem.
export function getProjects() {
  const yaml = readYamlProjects();
  const yamlSlugs = new Set(yaml.map((y) => y.data.slug));
  const list = [
    ...legacyProjects
      .map((p, i) => ({ ...p, id: p.slug, visibilidade: 'publico', ordem: (i + 1) * 10, source: { kind: 'md', file: p.file } }))
      .filter((p) => !yamlSlugs.has(p.slug)),
    ...yaml.map(({ id, data }) => ({
      id,
      slug: data.slug,
      title: data.titulo,
      tag: data.categoria,
      client: data.ficha.cliente,
      year: data.ano ?? null,
      color: data.capa?.cor_fundo || null,
      cover: data.capa?.imagem ? data.capa.imagem.replace(/^\//, '') : null,
      images: {},
      visibilidade: data.visibilidade,
      ordem: data.ordem,
      seo: data.seo || null,
      source: { kind: 'yaml', data },
    })),
  ];
  // IDs e slugs únicos, sem distinguir maiúsculas (alguns sistemas de ficheiros também não distinguem).
  for (const field of ['id', 'slug']) {
    const seen = new Map();
    for (const p of list) {
      const key = String(p[field]).toLowerCase();
      if (seen.has(key)) throw new Error(`${field === 'id' ? 'ID' : 'Slug'} repetido: "${p[field]}" (${seen.get(key)} e ${p.id})`);
      seen.set(key, p.id);
    }
  }
  return list.sort((a, b) => a.ordem - b.ordem);
}

// Projetos nas listagens (homepage, numeração, «Próximo projeto», sitemap): só os públicos.
export const getListedProjects = () => getProjects().filter((p) => p.visibilidade === 'publico');

// Projetos com página: públicos e não listados (e rascunhos, só em pré-visualização local).
export const getPagedProjects = () => getProjects().filter(
  (p) => p.visibilidade === 'publico' || p.visibilidade === 'nao_listado' || (PREVIEW && p.visibilidade === 'rascunho'),
);

// O que os cartões e a página precisam do projeto (só dados simples, passam para o cliente).
export const toCard = ({ slug, title, tag, client, color, cover, images }) => ({ slug, title, tag, client, color, cover, images: images || {} });

// Texto do case study, na estrutura que o componente CaseStudy recebe.
export function loadStudy(project) {
  if (project.source.kind === 'md') return loadCaseStudy(project.source.file);
  const data = project.source.data;
  const study = parseCaseStudy(projectToMarkdown(data));
  // Campos das figuras que o Markdown não guarda: texto alternativo e imagem mobile explícita.
  data.secoes.forEach((s, i) => {
    const figures = (s.blocos || []).filter((b) => b.tipo === 'figura');
    const blocks = study.sections[i].blocks.filter((b) => b.type === 'figure');
    figures.forEach((f, j) => {
      if (f.imagem_mobile) blocks[j].srcMobile = f.imagem_mobile;
      if (f.alt) blocks[j].alt = f.alt;
    });
  });
  return study;
}
