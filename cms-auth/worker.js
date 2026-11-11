// Serviço de login do backoffice (Decap CMS) com GitHub, para Cloudflare Workers.
//
// O GitHub Pages é estático e não pode guardar o client secret da OAuth App. Este Worker
// guarda-o (como segredo do Cloudflare, nunca no repositório) e faz a troca do código
// OAuth por um token, que entrega à janela do backoffice pelo protocolo que o Decap espera:
//   1. o Decap abre  GET /auth?provider=github&scope=public_repo  numa janela;
//   2. o Worker redireciona para o GitHub com um `state` aleatório (guardado num cookie);
//   3. o GitHub volta a  GET /callback?code=…&state=…;
//   4. o Worker confirma o `state`, troca o código por um token e, opcionalmente,
//      confirma que o utilizador está em ALLOWED_USERS;
//   5. a página devolvida envia "authorizing:github" ao backoffice e, quando este responde,
//      envia "authorization:github:success:{token}" — só para uma origem de ALLOWED_ORIGINS.
//
// Variáveis (Cloudflare → Worker → Settings → Variables and Secrets):
//   GITHUB_CLIENT_ID      (texto)    Client ID da OAuth App
//   GITHUB_CLIENT_SECRET  (segredo)  Client secret da OAuth App
//   ALLOWED_ORIGINS       (texto)    origens do backoffice, separadas por vírgulas
//                                    ex.: https://rafastuff.github.io
//   ALLOWED_USERS         (texto)    opcional: logins GitHub autorizados, ex.: rafaelrvaz25-design
//   ALLOWED_SCOPES        (texto)    opcional, por omissão "public_repo"
//   GITHUB_BASE_URL, GITHUB_API_URL  só para testes locais (por omissão, os do GitHub)

const PROVIDER = 'github';
const STATE_COOKIE = '__Host-cms_oauth_state';

const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

function randomState() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

// Comparação em tempo constante, para o `state` não ser adivinhado por tempo de resposta.
function sameString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

// JSON seguro para pôr dentro de <script> (sem "</script>" possível).
const js = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

// Página que entrega o resultado à janela do backoffice e fecha-se.
// O token só é enviado para uma origem autorizada, e só depois de o backoffice responder.
function resultPage({ origins, status, payload }) {
  const nonce = randomState().slice(0, 32);
  const message = `authorization:${PROVIDER}:${status}:${JSON.stringify(payload)}`;
  const html = `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Backoffice</title></head>
<body><p>${status === 'success' ? 'Sessão iniciada. Esta janela fecha-se sozinha.' : 'Não foi possível iniciar sessão. Pode fechar esta janela.'}</p>
<script nonce="${nonce}">
(function () {
  var origins = ${js(origins)};
  var message = ${js(message)};
  if (!window.opener) return;
  window.addEventListener('message', function (e) {
    if (origins.indexOf(e.origin) === -1 || e.data !== 'authorizing:${PROVIDER}') return;
    window.opener.postMessage(message, e.origin);
  });
  origins.forEach(function (o) { window.opener.postMessage('authorizing:${PROVIDER}', o); });
})();
</script></body></html>`;
  return new Response(html, {
    status: status === 'success' ? 200 : 400,
    headers: {
      ...SECURITY_HEADERS,
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      // o state é de uso único: apaga-se sempre
      'Set-Cookie': `${STATE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}

const failure = (origins, message) => resultPage({ origins, status: 'error', payload: { message, provider: PROVIDER } });

async function handleAuth(url, env, origins) {
  if (url.searchParams.get('provider') !== PROVIDER) return failure(origins, 'Fornecedor de login inválido.');
  const allowedScopes = list(env.ALLOWED_SCOPES || 'public_repo');
  const requested = url.searchParams.get('scope') || allowedScopes[0];
  if (!allowedScopes.includes(requested)) return failure(origins, `Âmbito "${requested}" não autorizado.`);

  const state = randomState();
  const authorize = new URL('/login/oauth/authorize', env.GITHUB_BASE_URL || 'https://github.com');
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', `${url.origin}/callback`);
  authorize.searchParams.set('scope', requested);
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('allow_signup', 'false');
  return new Response(null, {
    status: 302,
    headers: {
      ...SECURITY_HEADERS,
      Location: authorize.toString(),
      'Set-Cookie': `${STATE_COOKIE}=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}

async function handleCallback(request, url, env, origins) {
  if (url.searchParams.get('error')) return failure(origins, 'O acesso foi recusado no GitHub.');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !sameString(state, readCookie(request, STATE_COOKIE))) {
    return failure(origins, 'Pedido de login inválido ou expirado. Tente novamente.');
  }

  const tokenRes = await fetch(new URL('/login/oauth/access_token', env.GITHUB_BASE_URL || 'https://github.com'), {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'rafastuff-cms-auth' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/callback`,
    }),
  });
  const data = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !data.access_token) return failure(origins, 'O GitHub não devolveu uma sessão válida.');

  const allowedUsers = list(env.ALLOWED_USERS).map((u) => u.toLowerCase());
  if (allowedUsers.length) {
    const userRes = await fetch(new URL('/user', env.GITHUB_API_URL || 'https://api.github.com'), {
      headers: { Authorization: `Bearer ${data.access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'rafastuff-cms-auth' },
    });
    const user = await userRes.json().catch(() => ({}));
    if (!userRes.ok || !allowedUsers.includes(String(user.login || '').toLowerCase())) {
      return failure(origins, 'Esta conta GitHub não tem acesso ao backoffice.');
    }
  }
  return resultPage({ origins, status: 'success', payload: { token: data.access_token, provider: PROVIDER } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origins = list(env.ALLOWED_ORIGINS);
    if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: SECURITY_HEADERS });
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !origins.length) {
      return new Response('Serviço de login por configurar.', { status: 503, headers: SECURITY_HEADERS });
    }
    if (url.pathname === '/auth') return handleAuth(url, env, origins);
    if (url.pathname === '/callback') return handleCallback(request, url, env, origins);
    return new Response('Not Found', { status: 404, headers: SECURITY_HEADERS });
  },
};
