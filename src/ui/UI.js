/** Everything in HTML around the 3D scene: intro, edges, detail panel and index. */
export class UI {
  constructor({ site, months, entries }) {
    this.site = site;
    this.months = months;
    this.entries = entries;
    this.handlers = {};
    this.fallbackMode = false;
    this.hintGone = false;
    this.atEnd = false;

    const $ = (s) => document.querySelector(s);
    this.el = {
      intro: $('.intro'),
      loader: $('.loader'),
      loaderFill: $('.loader-fill'),
      loaderValue: $('.loader-value'),
      start: $('[data-action="start"]'),
      railList: $('.rail-months'),
      railFill: $('.rail-fill'),
      hint: $('.hint'),
      restart: $('[data-action="restart"]'),
      panel: $('.panel'),
      panelDate: $('.panel-date'),
      panelTitle: $('.panel-title'),
      panelThai: $('.panel-thai'),
      panelText: $('.panel-text'),
      railLine: $('.rail-line'),
      panelLink: $('.panel-link'),
      prev: $('[data-action="prev"]'),
      next: $('[data-action="next"]'),
      index: $('.index'),
      indexGrid: $('.index-grid'),
      indexNote: $('.index-note'),
      indexClose: $('[data-action="index-close"]'),
    };

    this.fillSite();
    this.buildRail();
    this.buildIndex();
    this.bindEvents();
  }

  on(name, fn) {
    this.handlers[name] = fn;
    return this;
  }

  emit(name, ...args) {
    this.handlers[name]?.(...args);
  }

  fillSite() {
    document.title = this.site.title;
    document.querySelectorAll('[data-site]').forEach((el) => {
      const key = el.dataset.site;
      if (key === 'contact') el.href = this.site.contact;
      else if (this.site[key]) el.textContent = this.site[key];
    });
  }

  buildRail() {
    this.railButtons = this.months.map((m, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rail-btn';
      btn.setAttribute('aria-label', m.name);
      btn.innerHTML = `<span class="rail-full" aria-hidden="true">${m.name.slice(0, 3)}</span><span class="rail-short" aria-hidden="true">${m.name[0]}</span>`;
      btn.addEventListener('click', () => this.emit('month', i));
      li.append(btn);
      this.el.railList.append(li);
      return btn;
    });
  }

  buildIndex(withText = false) {
    const grid = this.el.indexGrid;
    grid.innerHTML = '';
    this.months.forEach((month, m) => {
      const section = document.createElement('section');
      section.className = 'index-month';
      const h = document.createElement('h3');
      h.textContent = month.name;
      const ol = document.createElement('ol');
      for (const entry of this.entries.filter((e) => e.monthIndex === m)) {
        const item = entry.data;
        const li = document.createElement('li');
        const el = document.createElement(withText ? 'article' : 'button');
        el.className = `index-item is-${entry.kind}`;
        if (!withText) {
          el.type = 'button';
          el.dataset.item = String(entry.globalIndex);
        }
        const date = document.createElement('span');
        date.className = 'index-item-date';
        date.textContent = item.date;
        const title = document.createElement('span');
        title.className = 'index-item-title';
        title.textContent = item.title;
        el.append(date, title);
        if (item.thai) {
          const thai = document.createElement('span');
          thai.className = 'index-item-thai';
          thai.lang = 'th';
          thai.textContent = item.thai;
          el.append(thai);
        }
        if (withText && item.text) {
          const p = document.createElement('p');
          p.className = 'index-item-text';
          p.textContent = item.text;
          el.append(p);
        }
        li.append(el);
        ol.append(li);
      }
      section.append(h, ol);
      grid.append(section);
    });
  }

  /** Small marks on the progress line for special days; the birthday gets a ring. */
  setMarkers(list) {
    this.el.railLine.querySelectorAll('.rail-mark').forEach((n) => n.remove());
    for (const m of list) {
      const mark = document.createElement('span');
      mark.className = `rail-mark is-${m.kind}`;
      mark.style.left = `${m.progress * 100}%`;
      mark.title = m.title;
      this.el.railLine.append(mark);
    }
  }

  bindEvents() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action], [data-item]');
      if (!target) return;
      if (target.dataset.item !== undefined) {
        this.emit('item', Number(target.dataset.item));
        return;
      }
      switch (target.dataset.action) {
        case 'start':
          this.emit('start');
          break;
        case 'index':
          this.openIndex();
          break;
        case 'index-close':
          this.closeIndex();
          break;
        case 'close':
          this.emit('close');
          break;
        case 'prev':
          this.emit('prev');
          break;
        case 'next':
          this.emit('next');
          break;
        case 'restart':
          this.emit('restart');
          break;
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!this.el.index.hidden && !this.fallbackMode) this.closeIndex();
        else if (!this.el.panel.hidden) this.emit('close');
      } else if (e.key === 'Tab' && !this.el.index.hidden && !this.fallbackMode) {
        this.trapFocus(e, this.el.index);
      }
    });
  }

  trapFocus(e, container) {
    const focusable = [...container.querySelectorAll('button, a[href]')].filter((el) => !el.disabled);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // ------------------------------------------------------------------ intro

  setLoad(p) {
    const pct = Math.round(p * 100);
    this.el.loaderFill.style.transform = `scaleX(${p})`;
    this.el.loaderValue.textContent = `${pct}%`;
    this.el.loader.setAttribute('aria-valuenow', String(pct));
  }

  ready() {
    this.el.loader.hidden = true;
    this.el.start.hidden = false;
    this.el.start.focus({ preventScroll: true });
  }

  hideIntro() {
    document.body.classList.add('is-started', 'is-entering');
    this.el.intro.classList.add('is-leaving');
    setTimeout(() => (this.el.intro.hidden = true), 1200);
    setTimeout(() => document.body.classList.remove('is-entering'), 3000);
  }

  // ------------------------------------------------------------------ edges

  setMonth(i) {
    this.railButtons.forEach((b, j) => {
      if (i === j) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }

  setProgress(p) {
    this.el.railFill.style.transform = `scaleX(${p})`;
    const atEnd = p > 0.985;
    if (atEnd !== this.atEnd) {
      this.atEnd = atEnd;
      this.el.restart.hidden = !atEnd;
      this.el.hint.hidden = atEnd;
    }
  }

  hideHint() {
    if (this.hintGone) return;
    this.hintGone = true;
    this.el.hint.classList.add('is-hidden');
  }

  setTheme(theme) {
    const s = document.documentElement.style;
    for (const [k, v] of Object.entries(theme)) s.setProperty(`--${k}`, v);
  }

  // ------------------------------------------------------------------ detail panel

  openPanel(item, { hasPrev, hasNext }) {
    const d = item.data;
    const { panel } = this.el;
    this.el.panelDate.textContent = d.date;
    this.el.panelTitle.textContent = d.title;
    this.el.panelThai.textContent = d.thai || '';
    this.el.panelThai.hidden = !d.thai;
    panel.classList.toggle('is-birthday', item.kind === 'birthday');
    this.el.panelText.textContent = d.text || '';
    this.el.panelText.hidden = !d.text;
    this.el.panelLink.hidden = !d.link;
    if (d.link) this.el.panelLink.href = d.link;
    this.el.prev.disabled = !hasPrev;
    this.el.next.disabled = !hasNext;

    if (panel.hidden) {
      this.returnFocus = document.activeElement;
      panel.hidden = false;
      requestAnimationFrame(() => panel.classList.add('is-open'));
    } else {
      panel.classList.remove('is-swapping');
      void panel.offsetWidth; // restart the swap animation
      panel.classList.add('is-swapping');
    }
    document.body.classList.add('is-open');
    // Keep keyboard focus on Previous/Next if that's how we got here.
    if (!panel.contains(document.activeElement) || document.activeElement.disabled) {
      this.el.panelTitle.focus({ preventScroll: true });
    }
  }

  closePanel() {
    const { panel } = this.el;
    panel.classList.remove('is-open', 'is-swapping');
    document.body.classList.remove('is-open');
    setTimeout(() => {
      if (!panel.classList.contains('is-open')) panel.hidden = true;
    }, 450);
    if (panel.contains(document.activeElement)) {
      const back = this.returnFocus && document.body.contains(this.returnFocus) ? this.returnFocus : null;
      if (back && back !== document.body) back.focus({ preventScroll: true });
      else document.activeElement.blur();
    }
  }

  // ------------------------------------------------------------------ index

  openIndex() {
    const { index } = this.el;
    this.indexReturnFocus = document.activeElement;
    index.hidden = false;
    requestAnimationFrame(() => index.classList.add('is-open'));
    this.el.indexClose.focus({ preventScroll: true });
    this.emit('index-open');
  }

  closeIndex() {
    const { index } = this.el;
    if (index.hidden) return;
    index.classList.remove('is-open');
    this.emit('index-close');
    setTimeout(() => {
      if (!index.classList.contains('is-open')) index.hidden = true;
    }, 400);
    this.indexReturnFocus?.focus?.({ preventScroll: true });
  }

  /** No WebGL: show the year as a plain, readable list instead. */
  fallback() {
    this.fallbackMode = true;
    this.buildIndex(true);
    this.el.intro.hidden = true;
    this.el.indexNote.hidden = false;
    this.el.indexClose.hidden = true;
    this.el.index.hidden = false;
    this.el.index.classList.add('is-open');
    document.body.classList.add('is-fallback');
  }
}
