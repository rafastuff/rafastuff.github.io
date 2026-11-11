// Ambiente de teste local do login, sem credenciais reais:
// - o Worker (worker.js) a correr em Node, em http://localhost:8787
// - um GitHub simulado em http://localhost:8790 (autorização, troca do código, /user)
// - uma página do backoffice com o Decap real, em http://localhost:4830/admin.html
//   (e a mesma página numa origem NÃO autorizada, em http://localhost:4831/admin.html)
//
//   node cms-auth/teste/servidores.mjs [cenário]
// Cenários do GitHub simulado: ok (por omissão), recusa, state-errado, outro-utilizador.
import http from 'http';
import worker from '../worker.js';

const scenario = process.argv[2] || 'ok';
const CLIENT_ID = 'teste-client-id';
const CLIENT_SECRET = 'teste-client-secret'; // só para este teste local, não é uma credencial real
const TOKEN = 'gho_TOKEN_DE_TESTE';

const env = {
  GITHUB_CLIENT_ID: CLIENT_ID,
  GITHUB_CLIENT_SECRET: CLIENT_SECRET,
  ALLOWED_ORIGINS: 'http://localhost:4830',
  ALLOWED_USERS: 'rafaelrvaz25-design',
  ALLOWED_SCOPES: 'public_repo',
  GITHUB_BASE_URL: 'http://localhost:8790',
  GITHUB_API_URL: 'http://localhost:8790',
};

// Adapta o Worker (API fetch) a um servidor HTTP de Node.
http.createServer(async (req, res) => {
  const request = new Request(`http://localhost:8787${req.url}`, { method: req.method, headers: req.headers });
  const response = await worker.fetch(request, env);
  const headers = Object.fromEntries(response.headers);
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
  console.log(`[worker] ${req.method} ${req.url.split('?')[0]} → ${response.status}`);
}).listen(8787);

// GitHub simulado.
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost:8790');
  if (url.pathname === '/login/oauth/authorize') {
    const back = new URL(url.searchParams.get('redirect_uri'));
    if (url.searchParams.get('client_id') !== CLIENT_ID) { res.writeHead(400); return res.end('client_id errado'); }
    if (scenario === 'recusa') back.searchParams.set('error', 'access_denied');
    else {
      back.searchParams.set('code', 'codigo-de-teste');
      back.searchParams.set('state', scenario === 'state-errado' ? 'state-forjado' : url.searchParams.get('state'));
    }
    console.log(`[github] authorize scope=${url.searchParams.get('scope')} → ${back.pathname}`);
    res.writeHead(302, { Location: back.toString() });
    return res.end();
  }
  if (url.pathname === '/login/oauth/access_token' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const b = JSON.parse(body);
      const ok = b.client_id === CLIENT_ID && b.client_secret === CLIENT_SECRET && b.code === 'codigo-de-teste';
      console.log(`[github] access_token → ${ok ? 'token' : 'erro'}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(ok ? { access_token: TOKEN, token_type: 'bearer', scope: 'public_repo' } : { error: 'bad_verification_code' }));
    });
    return;
  }
  if (url.pathname === '/user') {
    const ok = req.headers.authorization === `Bearer ${TOKEN}`;
    res.writeHead(ok ? 200 : 401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(ok ? { login: scenario === 'outro-utilizador' ? 'alguem-de-fora' : 'rafaelrvaz25-design' } : { message: 'Bad credentials' }));
  }
  res.writeHead(404); res.end();
}).listen(8790);

// Página do backoffice com o Decap real e uma configuração mínima apontada para o Worker local.
const ADMIN = `<!doctype html><html><head><meta charset="utf-8"><title>teste login</title></head><body>
<script>window.CMS_MANUAL_INIT = true;</script>
<script src="https://unpkg.com/decap-cms@3.17.3/dist/decap-cms.js"></script>
<script>
CMS.init({ config: {
  load_config_file: false,
  backend: { name: 'github', repo: 'rafastuff/rafastuff.github.io', branch: 'fonte', base_url: 'http://localhost:8787', auth_scope: 'public_repo' },
  media_folder: 'public/images/uploads', public_folder: '/images/uploads',
  collections: [{ name: 'projetos', label: 'Projetos', folder: 'content/projetos', extension: 'yml', format: 'yml', fields: [{ name: 'titulo', label: 'Título', widget: 'string' }] }],
} });
</script></body></html>`;
for (const port of [4830, 4831]) {
  http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(ADMIN); }).listen(port);
}
console.log(`pronto (cenário: ${scenario})`);
