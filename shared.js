// Shared utilities for the RRV site

// === Tweaks panel (palette switching) ===
(function tweaks() {
  let active = false;
  let panel = null;

  const PALETTES = [
    { id: 'palace', name: 'Palace', desc: 'Ochre, oxblood, paper' },
    { id: 'ink',    name: 'Ink',    desc: 'Deeper ink, richer reds' },
    { id: 'dusk',   name: 'Dusk',   desc: 'Dark mode, paintings glow' },
    { id: 'ivory',  name: 'Ivory',  desc: 'Bright ivory, museum bright' }
  ];

  const DEFAULTS = /*EDITMODE-BEGIN*/{
    "palette": "palace",
    "ornaments": true,
    "density": "comfortable"
  }/*EDITMODE-END*/;

  // Load persisted state
  let state = { ...DEFAULTS };
  try {
    const saved = localStorage.getItem('rrv-tweaks');
    if (saved) state = { ...state, ...JSON.parse(saved) };
  } catch {}

  function apply() {
    document.body.setAttribute('data-palette', state.palette);
    document.body.setAttribute('data-density', state.density);
    document.body.classList.toggle('no-ornaments', !state.ornaments);
    try { localStorage.setItem('rrv-tweaks', JSON.stringify(state)); } catch {}
  }
  apply();

  function build() {
    panel = document.createElement('div');
    panel.id = 'tweaks-panel';
    panel.innerHTML = `
      <div class="tw-head">
        <span class="tw-title">Tweaks</span>
        <button class="tw-close" aria-label="Close">&times;</button>
      </div>
      <div class="tw-section">
        <div class="tw-label">Palette</div>
        <div class="tw-palettes">
          ${PALETTES.map(p => `
            <button class="tw-pal ${p.id === state.palette ? 'on' : ''}" data-pal="${p.id}">
              <span class="tw-swatch tw-sw-${p.id}"></span>
              <span class="tw-pal-text">
                <span class="tw-pal-name">${p.name}</span>
                <span class="tw-pal-desc">${p.desc}</span>
              </span>
            </button>
          `).join('')}
        </div>
      </div>
      <div class="tw-section">
        <div class="tw-label">Ornaments</div>
        <label class="tw-toggle">
          <input type="checkbox" ${state.ornaments ? 'checked' : ''} data-key="ornaments">
          <span>Show ornamental dividers & flourishes</span>
        </label>
      </div>
      <div class="tw-section">
        <div class="tw-label">Density</div>
        <div class="tw-radio">
          ${['airy','comfortable','dense'].map(d => `
            <label class="${d === state.density ? 'on' : ''}">
              <input type="radio" name="dens" value="${d}" ${d === state.density ? 'checked' : ''}>
              <span>${d}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    panel.querySelector('.tw-close').addEventListener('click', deactivate);
    panel.querySelectorAll('.tw-pal').forEach(b => b.addEventListener('click', () => {
      state.palette = b.dataset.pal;
      apply();
      panel.querySelectorAll('.tw-pal').forEach(x => x.classList.toggle('on', x.dataset.pal === state.palette));
      persist({ palette: state.palette });
    }));
    panel.querySelector('[data-key="ornaments"]').addEventListener('change', e => {
      state.ornaments = e.target.checked;
      apply();
      persist({ ornaments: state.ornaments });
    });
    panel.querySelectorAll('input[name="dens"]').forEach(r => r.addEventListener('change', e => {
      state.density = e.target.value;
      apply();
      panel.querySelectorAll('.tw-radio label').forEach(l =>
        l.classList.toggle('on', l.querySelector('input').value === state.density));
      persist({ density: state.density });
    }));
  }

  function persist(edits) {
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*'); } catch {}
  }

  function activate() {
    active = true;
    if (!panel) build();
    panel.classList.add('show');
  }
  function deactivate() {
    active = false;
    if (panel) panel.classList.remove('show');
    try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch {}
  }

  window.addEventListener('message', e => {
    if (!e.data) return;
    if (e.data.type === '__activate_edit_mode') activate();
    if (e.data.type === '__deactivate_edit_mode') deactivate();
  });
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch {}
})();

// === Mobile nav drawer ===
(function navDrawer() {
  function close() {
    document.body.classList.remove('nav-open');
    const btn = document.querySelector('[data-nav-toggle]');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-nav-toggle]');
    if (btn) {
      const open = !document.body.classList.contains('nav-open');
      document.body.classList.toggle('nav-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      return;
    }
    if (e.target.closest('.nav-links a')) close();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) close();
  });
})();

// === Public theme toggle (light/dark) ===
(function themeToggle() {
  const KEY = 'rrv-tweaks';
  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch { return {}; }
  }
  function write(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  }
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    const state = read();
    const next = (state.palette === 'dusk') ? 'palace' : 'dusk';
    state.palette = next;
    write(state);
    document.body.setAttribute('data-palette', next);
    btn.setAttribute('aria-label', next === 'dusk' ? 'Switch to light mode' : 'Switch to dark mode');
  });
})();

// === Reveal on scroll ===
(function reveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  // Stagger children of any [data-stagger] container
  document.querySelectorAll('[data-stagger]').forEach(parent => {
    [...parent.querySelectorAll('.reveal')].forEach((el, i) => el.style.setProperty('--i', i));
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  els.forEach(el => io.observe(el));
})();

// === Word-split for .split-words headings ===
(function splitWords() {
  document.querySelectorAll('.split-words').forEach(el => {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    let i = 0;
    const walk = (parent) => {
      const nodes = Array.from(parent.childNodes);
      nodes.forEach(node => {
        if (node.nodeType === 3) {
          // text node, split into word spans
          const words = node.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          words.forEach(w => {
            if (w === '') return;
            const span = document.createElement('span');
            if (/^\s+$/.test(w)) {
              span.className = 'word space';
              span.innerHTML = '&nbsp;';
            } else {
              span.className = 'word';
              span.textContent = w;
            }
            span.style.animationDelay = (0.1 + (i++) * 0.06) + 's';
            frag.appendChild(span);
          });
          parent.replaceChild(frag, node);
        } else if (node.nodeType === 1) {
          // element, recurse, don't destroy
          walk(node);
        }
      });
    };
    walk(el);
  });
})();

// === Mouse parallax, uses CSS variables to compose with existing transforms ===
(function parallax() {
  const els = document.querySelectorAll('[data-parallax]');
  if (!els.length) return;
  // Inject a base style so parallax composes with existing transforms via CSS var
  els.forEach(el => {
    el.style.setProperty('--px', '0px');
    el.style.setProperty('--py', '0px');
    // Skip if element has a running CSS animation that affects transform
    const anims = el.getAnimations ? el.getAnimations() : [];
    const animatedTransform = anims.some(a => {
      const props = a.effect?.getKeyframes?.() || [];
      return props.some(k => 'transform' in k);
    });
    if (animatedTransform) {
      el.dataset.parallaxAnimated = '1';
      return;
    }
    // Prepend translate via a wrapper transform
    const existing = getComputedStyle(el).transform;
    if (existing && existing !== 'none') {
      el.style.transform = `translate(var(--px), var(--py)) ${existing}`;
    } else {
      el.style.transform = `translate(var(--px), var(--py))`;
    }
  });
  let mx = 0, my = 0, tx = 0, ty = 0, raf;
  function onMove(e) {
    mx = (e.clientX / window.innerWidth - 0.5);
    my = (e.clientY / window.innerHeight - 0.5);
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    tx += (mx - tx) * 0.08;
    ty += (my - ty) * 0.08;
    els.forEach(el => {
      const f = parseFloat(el.dataset.parallax) || 1;
      el.style.setProperty('--px', (tx * f * 22).toFixed(2) + 'px');
      el.style.setProperty('--py', (ty * f * 22).toFixed(2) + 'px');
    });
    if (Math.abs(mx - tx) > 0.001 || Math.abs(my - ty) > 0.001) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = null;
    }
  }
  window.addEventListener('mousemove', onMove, { passive: true });
})();

// === Floating gold particles, disabled ===
// (function particles() { ... })();

// === Scroll-driven background parallax for ornaments ===
(function scrollOrnaments() {
  const els = document.querySelectorAll('[data-scroll-y]');
  if (!els.length) return;
  let raf;
  function update() {
    const y = window.scrollY;
    els.forEach(el => {
      const f = parseFloat(el.dataset.scrollY) || 0.1;
      el.style.transform = `translateY(${y * f}px)`;
    });
    raf = null;
  }
  window.addEventListener('scroll', () => {
    if (!raf) raf = requestAnimationFrame(update);
  }, { passive: true });
})();

// === Mark active nav link ===
(function navActive() {
  const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (href === here || (here === '' && href === 'index.html')) a.classList.add('active');
  });
})();
