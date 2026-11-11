# Testes do login do backoffice contra o ambiente de cms-auth/teste/servidores.mjs.
#   python3 cms-auth/teste/login.py <cenário> [origem] [permissao]
# A API do GitHub (api.github.com) é simulada no browser: só se verifica que o Decap
# recebeu o token e o usa, e como reage a contas sem permissão ou a tokens inválidos.
import sys, json
from playwright.sync_api import sync_playwright

cenario = sys.argv[1]
origem = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:4830'
push = (sys.argv[3] if len(sys.argv) > 3 else 'push') == 'push'
TOKEN = 'gho_TOKEN_DE_TESTE'
R = {'cenario': cenario, 'origem': origem}

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
    ctx = b.new_context()
    api_calls = []
    def api(route):
        req = route.request
        auth = req.headers.get('authorization', '')
        api_calls.append((req.url.replace('https://api.github.com', ''), auth[:28]))
        ok = TOKEN in auth and not R.get('revogado')
        if not ok:
            return route.fulfill(status=401, json={'message': 'Bad credentials'})
        if req.url.endswith('/user'):
            return route.fulfill(json={'login': 'rafaelrvaz25-design', 'name': 'Rafa', 'avatar_url': ''})
        if req.url.endswith('/repos/rafastuff/rafastuff.github.io'):
            return route.fulfill(json={'full_name': 'rafastuff/rafastuff.github.io', 'owner': {'login': 'rafastuff'}, 'permissions': {'admin': push, 'push': push, 'pull': True}})
        if '/branches/' in req.url:
            return route.fulfill(json={'name': 'fonte', 'commit': {'sha': 'a' * 40}})
        if '/git/trees/' in req.url:
            return route.fulfill(json={'sha': 'a' * 40, 'tree': [], 'truncated': False})
        return route.fulfill(status=404, json={'message': 'Not Found'})
    ctx.route('https://api.github.com/**', api)
    pg = ctx.new_page()
    pg.goto(origem + '/admin.html', wait_until='networkidle'); pg.wait_for_timeout(1500)
    R['antes_do_login'] = pg.inner_text('body')[:80].replace('\n', ' | ')
    R['pedidos_api_antes_do_login'] = len(api_calls)
    with ctx.expect_page() as pop:
        pg.get_by_role('button').filter(has_text='Login').first.click()
    popup = pop.value
    try:
        popup.wait_for_load_state(); R['janela_login'] = popup.inner_text('body')[:120]
    except Exception:
        R['janela_login'] = '(fechou-se sozinha)'
    pg.wait_for_timeout(4000)
    R['depois_do_login'] = pg.inner_text('body')[:160].replace('\n', ' | ')
    R['token_guardado'] = pg.evaluate("() => { try { return !!JSON.parse(localStorage.getItem('decap-cms-user')||'null')?.token } catch(e) { return false } }")
    R['pedidos_api'] = api_calls[:4]
    if R['token_guardado'] and push:
        # sessão revogada/expirada: o GitHub passa a recusar o token guardado
        R['revogado'] = True
        pg.reload(wait_until='networkidle'); pg.wait_for_timeout(3000)
        R['apos_revogar_token'] = pg.inner_text('body')[:120].replace('\n', ' | ')
        R['token_apos_revogar'] = pg.evaluate("() => !!localStorage.getItem('decap-cms-user')")
    b.close()
print(json.dumps(R, ensure_ascii=False, indent=1))
