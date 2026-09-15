'use strict';
(function () {
  const sel = (q, r = document) => r.querySelector(q);
  const all = (q, r = document) => Array.from(r.querySelectorAll(q));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function initFiltros() {
    const raiz = sel('[data-moveis]');
    if (!raiz) return;
    const cartoes = all('[data-peca]', raiz);
    const extras = all('[data-extra]', raiz);
    const conta = sel('[data-conta]', raiz);
    const vazio = sel('[data-vazio]', raiz);
    const grupos = all('.filtro', raiz);
    const estado = { tipologia: 'todas', modulos: 'todos', ordem: 'relevante' };

    function fecha(exceto) {
      grupos.forEach(g => {
        if (g === exceto) return;
        g.classList.remove('is-open');
        sel('.filtro_btn', g).setAttribute('aria-expanded', 'false');
      });
    }

    function aplica() {
      let visiveis = 0;
      cartoes.forEach(item => {
        const okTipo = estado.tipologia === 'todas' || item.dataset.tipologia === estado.tipologia;
        const okMod = estado.modulos === 'todos' || item.dataset.faixa === estado.modulos;
        const dentro = okTipo && okMod;
        item.classList.toggle('is-out', !dentro);
        if (dentro) visiveis += 1;
      });
      const dentro = cartoes.filter(item => !item.classList.contains('is-out'));
      if (estado.ordem === 'menor') dentro.sort((a, b) => a.dataset.area - b.dataset.area);
      else if (estado.ordem === 'maior') dentro.sort((a, b) => b.dataset.area - a.dataset.area);
      else dentro.sort((a, b) => a.dataset.ordem - b.dataset.ordem);
      dentro.forEach((item, i) => { item.style.order = i; });
      extras.forEach((item, i) => {
        item.style.order = 900 + i;
        item.classList.toggle('is-out', visiveis === 0);
      });
      if (conta) conta.textContent = String(visiveis).padStart(2, '0');
      if (vazio) vazio.classList.toggle('is-on', visiveis === 0);
    }

    grupos.forEach(grupo => {
      const campo = grupo.dataset.filtro;
      const botao = sel('.filtro_btn', grupo);
      const valor = sel('[data-valor]', grupo);
      const opcoes = all('[data-opcao]', grupo);
      botao.addEventListener('click', () => {
        const abrir = !grupo.classList.contains('is-open');
        fecha(grupo);
        grupo.classList.toggle('is-open', abrir);
        botao.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      });
      opcoes.forEach(opcao => {
        opcao.addEventListener('click', () => {
          estado[campo] = opcao.dataset.opcao;
          opcoes.forEach(o => o.setAttribute('aria-selected', o === opcao ? 'true' : 'false'));
          all('[data-valor]', grupo).forEach(n => { n.textContent = opcao.textContent; });
          grupo.classList.remove('is-open');
          botao.setAttribute('aria-expanded', 'false');
          aplica();
        });
      });
      if (valor) valor.textContent = sel('[aria-selected="true"]', grupo)?.textContent || valor.textContent;
    });

    const limpar = sel('[data-limpar]', raiz);
    if (limpar) limpar.addEventListener('click', () => {
      estado.tipologia = 'todas';
      estado.modulos = 'todos';
      estado.ordem = 'relevante';
      grupos.forEach(grupo => {
        const opcoes = all('[data-opcao]', grupo);
        opcoes.forEach((o, i) => o.setAttribute('aria-selected', i === 0 ? 'true' : 'false'));
        all('[data-valor]', grupo).forEach(n => { n.textContent = opcoes[0].textContent; });
      });
      fecha(null);
      aplica();
    });

    document.addEventListener('click', event => {
      if (!event.target.closest('.filtro')) fecha(null);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') fecha(null);
    });

    const busca = new URLSearchParams(location.search).get('tipologia');
    if (busca) {
      const grupo = sel('.filtro[data-filtro="tipologia"]', raiz);
      const opcao = grupo && sel(`[data-opcao="${CSS.escape(busca)}"]`, grupo);
      if (opcao) opcao.click(); else aplica();
    } else {
      aplica();
    }
  }

  function initTabs() {
    all('[data-tabs]').forEach(raiz => {
      const gatilhos = all('[data-tab-trigger]', raiz);
      const conteudos = all('[data-tab-content]', raiz);
      const barra = sel('[data-tab-hilight]', raiz);
      if (!gatilhos.length) return;
      function mostra(i) {
        gatilhos.forEach((g, k) => g.setAttribute('aria-selected', k === i ? 'true' : 'false'));
        conteudos.forEach((c, k) => c.classList.toggle('is-on', k === i));
        if (barra) {
          const alvo = gatilhos[i];
          barra.style.width = alvo.offsetWidth + 'px';
          barra.style.transform = 'translateX(' + alvo.offsetLeft + 'px)';
        }
      }
      gatilhos.forEach((g, i) => g.addEventListener('click', () => mostra(i)));
      mostra(0);
      window.addEventListener('resize', () => {
        const ativo = gatilhos.findIndex(g => g.getAttribute('aria-selected') === 'true');
        mostra(ativo < 0 ? 0 : ativo);
      });
    });
  }

  function initFazer() {
    const area = sel('[data-fazer]');
    if (!area) return;
    const slides = all('[data-fazer-slide]', area);
    const abas = all('[data-fazer-tab]', area);
    const barra = sel('[data-fazer-hilight]', area);
    if (!slides.length) return;
    let atual = -1;

    function mostra(i) {
      if (i === atual) return;
      atual = i;
      slides.forEach((s, k) => s.classList.toggle('is-on', k === i));
      abas.forEach((a, k) => a.setAttribute('aria-selected', k === i ? 'true' : 'false'));
      if (barra && abas[i]) barra.style.transform = 'translateY(' + abas[i].offsetTop + 'px)';
    }

    function ler() {
      const box = area.getBoundingClientRect();
      const curso = area.offsetHeight - window.innerHeight;
      const andado = clamp(-box.top / (curso || 1), 0, 0.9999);
      mostra(Math.floor(andado * slides.length));
    }

    abas.forEach((aba, i) => aba.addEventListener('click', () => {
      const curso = area.offsetHeight - window.innerHeight;
      const topo = area.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: topo + (curso * (i + 0.5)) / slides.length, behavior: 'smooth' });
    }));

    mostra(0);
    window.addEventListener('scroll', ler, { passive: true });
    window.addEventListener('resize', ler);
    ler();
  }

  function start() {
    initFiltros();
    initTabs();
    initFazer();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
