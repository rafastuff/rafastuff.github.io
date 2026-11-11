// Arranque do backoffice e regras próprias do portefólio (Decap CMS 3.17).
/* global CMS */
(function () {
  if (!window.CMS) return;

  // Regra de segurança: um projeto novo (criado do zero ou duplicado) é sempre gravado
  // em «Rascunho», qualquer que seja a visibilidade no formulário ou no projeto original.
  // Só depois de existir é que a visibilidade pode passar a Público ou Não listado,
  // numa gravação seguinte, por decisão explícita.
  CMS.registerEventListener({
    name: 'preSave',
    handler: ({ entry }) => {
      if (entry.get('collection') !== 'projetos' || !entry.get('newRecord')) return undefined;
      const data = entry.get('data');
      if (data.get('visibilidade') === 'rascunho') return undefined;
      return data.set('visibilidade', 'rascunho');
    },
  });

  // Em localhost, o backoffice usa o servidor local (`npm run cms`), que grava no Git
  // deste computador sem login. No site publicado, usa sempre o GitHub com login.
  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  CMS.init({ config: { local_backend: local } });
})();
