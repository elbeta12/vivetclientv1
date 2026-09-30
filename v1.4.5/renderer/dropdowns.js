// Vivet Client - renderer/dropdowns.js
// Reemplaza la lista nativa que abren los <select> (imposible de estilizar en
// Chromium) por un menú propio. El <select> original NO se toca: sigue siendo
// la fuente de verdad, así que app.js / optimizations.js siguen leyendo
// `.value` y escuchando `change` como siempre. Si el código cambia el valor
// o las opciones por programa (countrySelect.value = ..., innerHTML = ...),
// el botón se sincroniza solo.
// Se carga DESPUÉS de app.js (ver index.html). Estilos: final de style.css.

(() => {
  const CHEVRON =
    '<svg class="dd-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';
  const CHECK =
    '<svg class="dd-check" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
    'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  const valueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');

  let openState = null; // { close }

  function enhance(sel) {
    if (sel.dataset.dd) return;
    sel.dataset.dd = '1';

    const wrap = document.createElement('div');
    wrap.className = 'dd';
    if (sel.style.width === '100%') wrap.classList.add('dd-block');
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add('dd-native');
    sel.tabIndex = -1;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dd-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    if (sel.title) btn.title = sel.title;
    btn.innerHTML = '<span class="dd-label"></span>' + CHEVRON;
    wrap.appendChild(btn);
    const labelEl = btn.firstElementChild;

    function sync() {
      const o = sel.options[sel.selectedIndex];
      labelEl.textContent = o ? o.textContent : '';
      btn.disabled = sel.disabled;
    }

    // Cambios por programa: `.value = x` no dispara eventos, así que se
    // intercepta el setter en esta instancia.
    Object.defineProperty(sel, 'value', {
      configurable: true,
      get() { return valueDesc.get.call(this); },
      set(v) { valueDesc.set.call(this, v); sync(); },
    });
    new MutationObserver(sync).observe(sel, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ['disabled'],
    });
    sel.addEventListener('change', sync);
    sync();

    function open() {
      if (openState) openState.close();
      if (btn.disabled) return;

      const menu = document.createElement('div');
      menu.className = 'dd-menu';
      menu.setAttribute('role', 'listbox');
      const items = [];
      [...sel.options].forEach((o, i) => {
        if (o.hidden) return;
        const it = document.createElement('div');
        it.className = 'dd-item' + (o.disabled ? ' disabled' : '') + (i === sel.selectedIndex ? ' selected' : '');
        it.setAttribute('role', 'option');
        it.dataset.i = String(i);
        it.innerHTML = '<span class="dd-item-text"></span>' + CHECK;
        it.firstElementChild.textContent = o.textContent;
        menu.appendChild(it);
        if (!o.disabled) items.push(it);
      });
      if (!items.length) return;
      document.body.appendChild(menu);

      // Posición: debajo del botón, o arriba si no hay lugar.
      const r = btn.getBoundingClientRect();
      const gap = 6, margin = 12;
      const below = window.innerHeight - r.bottom - margin;
      const above = r.top - margin;
      const up = below < 180 && above > below;
      const maxH = Math.max(120, Math.min(320, (up ? above : below) - gap));
      menu.style.minWidth = r.width + 'px';
      menu.style.maxHeight = maxH + 'px';
      menu.style.left = Math.min(r.left, window.innerWidth - menu.offsetWidth - margin) + 'px';
      menu.style.left = Math.max(margin, parseFloat(menu.style.left)) + 'px';
      if (up) menu.style.bottom = (window.innerHeight - r.top + gap) + 'px';
      else menu.style.top = (r.bottom + gap) + 'px';
      menu.classList.toggle('up', up);

      btn.setAttribute('aria-expanded', 'true');
      wrap.classList.add('open');

      let active = Math.max(0, items.findIndex((it) => it.classList.contains('selected')));
      function setActive(n, scroll = true) {
        active = (n + items.length) % items.length;
        items.forEach((it, k) => it.classList.toggle('active', k === active));
        if (scroll) items[active].scrollIntoView({ block: 'nearest' });
      }
      setActive(active);

      function choose(it) {
        const idx = Number(it.dataset.i);
        const changed = idx !== sel.selectedIndex;
        sel.selectedIndex = idx;
        sync();
        close();
        btn.focus();
        if (changed) {
          sel.dispatchEvent(new Event('input', { bubbles: true }));
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      let typed = '', typedT = null;
      function onKey(e) {
        switch (e.key) {
          case 'ArrowDown': e.preventDefault(); setActive(active + 1); break;
          case 'ArrowUp': e.preventDefault(); setActive(active - 1); break;
          case 'Home': e.preventDefault(); setActive(0); break;
          case 'End': e.preventDefault(); setActive(items.length - 1); break;
          case 'Enter': case ' ': e.preventDefault(); choose(items[active]); break;
          case 'Escape': e.preventDefault(); close(); btn.focus(); break;
          case 'Tab': close(); break;
          default:
            // Escribir para saltar a una opción (útil en la lista de países).
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
              typed += e.key.toLowerCase();
              clearTimeout(typedT); typedT = setTimeout(() => { typed = ''; }, 700);
              const hit = items.findIndex((it) => it.textContent.trim().toLowerCase().startsWith(typed));
              if (hit >= 0) setActive(hit);
            }
        }
      }
      const onDown = (e) => { if (!menu.contains(e.target) && !btn.contains(e.target)) close(); };
      const onScroll = (e) => { if (!menu.contains(e.target)) close(); };
      menu.addEventListener('click', (e) => {
        const it = e.target.closest('.dd-item');
        if (it && !it.classList.contains('disabled')) choose(it);
      });
      menu.addEventListener('mousemove', (e) => {
        const it = e.target.closest('.dd-item');
        const k = it ? items.indexOf(it) : -1;
        if (k >= 0 && k !== active) setActive(k, false);
      });
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('pointerdown', onDown, true);
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', close);
      window.addEventListener('blur', close);

      function close() {
        document.removeEventListener('keydown', onKey, true);
        document.removeEventListener('pointerdown', onDown, true);
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', close);
        window.removeEventListener('blur', close);
        clearTimeout(typedT);
        menu.remove();
        btn.setAttribute('aria-expanded', 'false');
        wrap.classList.remove('open');
        if (openState && openState.close === close) openState = null;
      }
      openState = { close };
    }

    btn.addEventListener('click', () => (wrap.classList.contains('open') ? openState?.close() : open()));
    btn.addEventListener('keydown', (e) => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); open(); }
    });
  }

  document.querySelectorAll('select').forEach(enhance);
})();