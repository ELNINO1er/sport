/* =========================================================
   VOLTA — interactions & motion
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - t, 4);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (window.Lenis && !reduced) {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) { e.preventDefault(); return; }
    const t = $(id); if (!t) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(t, { offset: -10, duration: 1.6 }) : t.scrollIntoView({ behavior: 'smooth' });
  }));

  /* ---------- Notched shapes (clip-path path) ---------- */
  function notchPath(W, H, r, nw, nh, nr, corner) {
    // defined for top-right notch, then mirrored
    const fx = corner.includes('l'), fy = corner.includes('b');
    const P = (x, y) => `${(fx ? W - x : x).toFixed(1)} ${(fy ? H - y : y).toFixed(1)}`;
    return `M ${P(r, 0)} L ${P(W - nw - nr, 0)} Q ${P(W - nw, 0)} ${P(W - nw, nr)} ` +
      `L ${P(W - nw, nh - nr)} Q ${P(W - nw, nh)} ${P(W - nw + nr, nh)} ` +
      `L ${P(W - r, nh)} Q ${P(W, nh)} ${P(W, nh + r)} ` +
      `L ${P(W, H - r)} Q ${P(W, H)} ${P(W - r, H)} ` +
      `L ${P(r, H)} Q ${P(0, H)} ${P(0, H - r)} L ${P(0, r)} Q ${P(0, 0)} ${P(r, 0)} Z`;
  }
  const notched = $$('[data-notch]');
  const applyNotch = el => {
    const W = el.offsetWidth, H = el.offsetHeight;
    if (!W || !H) return;
    const scale = innerWidth < 760 ? .7 : 1;
    const d = el.dataset;
    const nw = Math.min(+d.nw * scale, W * .6), nh = Math.min(+d.nh * scale, H * .3);
    el.style.clipPath = `path('${notchPath(W, H, +d.r, nw, nh, +d.nr || 20, d.notch)}')`;
    el.style.borderRadius = '0';
  };
  const ro = new ResizeObserver(entries => entries.forEach(e => applyNotch(e.target)));
  notched.forEach(el => { applyNotch(el); ro.observe(el); });

  /* ---------- Split words for scroll reveal ---------- */
  function splitWords(el) {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(' '));
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s); }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    return $$('.w', el);
  }
  const wordBlocks = $$('[data-words]').map(el => ({ el, words: splitWords(el) }));

  /* ---------- Hero letters stagger index ---------- */
  $$('.hero__word span').forEach((s, i) => s.style.setProperty('--i', i));
  $$('[data-intro]').forEach(el => el.style.setProperty('--intro', el.dataset.intro));
  $$('.cta__title .line > span').forEach((s, i) => s.style.setProperty('--l', i));

  /* ---------- Fade-up reveals (with sibling stagger) ---------- */
  const fadeIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const sibs = [...el.parentElement.children].filter(c => c.hasAttribute('data-fade'));
      const idx = Math.max(0, sibs.indexOf(el));
      el.style.setProperty('--d', `${Math.min(idx, 6) * 0.09}s`);
      el.classList.add('in');
      fadeIO.unobserve(el);
    });
  }, { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  $$('[data-fade]').forEach(el => fadeIO.observe(el));

  const lineIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); lineIO.unobserve(e.target); }
  }), { threshold: .3 });
  $$('[data-lines]').forEach(el => lineIO.observe(el));

  /* ---------- Counters ---------- */
  // format FCFA : 25000 -> "25 000" (espace insécable fine)
  const fcfa = n => String(Math.round(n / 100) * 100).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  function animateNumber(el, to, dur = 1600, from = 0, fmt = Math.round) {
    const t0 = performance.now();
    const step = now => {
      const p = clamp((now - t0) / dur);
      el.textContent = fmt(lerp(from, to, easeOut(p)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const countIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    animateNumber(el, +el.dataset.count, +el.dataset.countDur || 1600);
    countIO.unobserve(el);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- Scroll-linked updates (single rAF loop) ---------- */
  const heroTitle = $('.hero__title');
  const heroAthlete = $('.hero__athlete');
  const deck = $('[data-tilt]');
  const stage = $('.coaches__stage');
  const parallaxImgs = $$('[data-parallax]');

  function onScroll() {
    const vh = innerHeight;
    const sy = scrollY;

    // hero : pas de parallaxe -> titre, athlète et carte restent parfaitement alignés au défilement
    void heroTitle; void heroAthlete; void sy;

    // word reveal
    wordBlocks.forEach(({ el, words }) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const start = vh * 0.92, end = vh * 0.38;
      const p = clamp((start - r.top) / (start - end + r.height * 0.6));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    });

    // coach deck tilt
    if (deck && stage) {
      const r = stage.getBoundingClientRect();
      const p = clamp((vh - r.top) / (vh + r.height * 0.5));
      deck.style.setProperty('--tilt', `${lerp(24, 9, p).toFixed(2)}deg`);
      deck.style.translate = `0 ${lerp(70, -30, p).toFixed(1)}px`;
    }

    // image parallax
    parallaxImgs.forEach(img => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = (r.top + r.height / 2 - vh / 2) / vh;
      img.style.transform = `translate3d(0, ${(p * +img.dataset.parallax * 100 - 6).toFixed(2)}%, 0)`;
    });
  }

  function raf(time) {
    if (lenis) lenis.raf(time);
    onScroll();
    cursorTick();
    requestAnimationFrame(raf);
  }

  /* ---------- Cursor follower ---------- */
  const cursor = $('.cursor');
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 }, pos = { ...mouse };
  addEventListener('mousemove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    cursor.classList.add('is-visible');
    const t = e.target;
    cursor.classList.toggle('is-hover', !!t.closest('a, button, input, .loc-list li'));
    cursor.classList.toggle('on-dark', !!t.closest('.hero, .cta, .plan--dark, .coach, .fac, .map, .stat-card'));
    cursor.classList.toggle('on-hero', !!t.closest('.hero'));
  }, { passive: true });
  document.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));
  addEventListener('mousedown', () => cursor.classList.add('is-down'));
  addEventListener('mouseup', () => cursor.classList.remove('is-down'));
  function cursorTick() {
    pos.x = lerp(pos.x, mouse.x, 0.14);
    pos.y = lerp(pos.y, mouse.y, 0.14);
    cursor.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
  }

  /* ---------- Coach carousel ---------- */
  const coaches = $$('.coach');
  const dots = $$('.coach-dots i');
  let ci = 0, coachBusy = false;
  function showCoach(next, dir) {
    if (coachBusy || next === ci) return;
    coachBusy = true;
    const cur = coaches[ci], nxt = coaches[next];
    cur.classList.remove('is-active');
    cur.classList.add('is-leaving');
    cur.classList.toggle('to-right', dir < 0);
    nxt.classList.toggle('from-left', dir < 0);
    // force start position, then activate
    nxt.style.transition = 'none';
    void nxt.offsetWidth;
    nxt.style.transition = '';
    nxt.classList.add('is-active');
    nxt.classList.remove('from-left');
    dots.forEach((d, i) => d.classList.toggle('is-active', i === next));
    ci = next;
    setTimeout(() => { cur.classList.remove('is-leaving', 'to-right'); coachBusy = false; }, 900);
  }
  $('[data-coach="next"]').addEventListener('click', () => showCoach((ci + 1) % coaches.length, 1));
  $('[data-coach="prev"]').addEventListener('click', () => showCoach((ci - 1 + coaches.length) % coaches.length, -1));
  // swipe support
  let sx = null;
  deck.addEventListener('pointerdown', e => { sx = e.clientX; });
  deck.addEventListener('pointerup', e => {
    if (sx === null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 40) dx < 0 ? $('[data-coach="next"]').click() : $('[data-coach="prev"]').click();
  });

  /* ---------- Facilities slider ---------- */
  const track = $('.facilities__track');
  const facs = $$('.fac');
  const facPrev = $('[data-fac="prev"]'), facNext = $('[data-fac="next"]');
  let fi = 0;
  function maxFac() {
    const vp = $('.facilities__viewport').getBoundingClientRect();
    const visible = Math.max(1, Math.floor((innerWidth - vp.left) / (facs[0].offsetWidth + 22)));
    return Math.max(0, facs.length - visible);
  }
  function moveFac() {
    fi = clamp(fi, 0, maxFac());
    track.style.transform = `translate3d(${-fi * (facs[0].offsetWidth + 22)}px, 0, 0)`;
    facPrev.disabled = fi === 0;
    facNext.disabled = fi >= maxFac();
  }
  facPrev.addEventListener('click', () => { fi--; moveFac(); });
  facNext.addEventListener('click', () => { fi++; moveFac(); });
  addEventListener('resize', moveFac);
  moveFac();

  /* ---------- Schedule ---------- */
  const days = [['Lun', 28], ['Mar', 29], ['Mer', 30], ['Jeu', 1], ['Ven', 2], ['Sam', 3], ['Dim', 4]];
  const pool = [
    ['HIIT Intense', 'HIIT', 'Yao Kouassi'],
    ['Circuit Kettlebell', 'Conditionnement', 'Serge Bamba'],
    ['Afro Dance Cardio', 'Cardio', 'Aïcha Koné'],
    ['Bases de la Force', 'Force', 'Serge Bamba'],
    ['Boxe Fitness', 'Boxe', 'Aïcha Koné'],
    ['Muscu Express', 'Force', 'Yao Kouassi'],
    ['Initiation Haltéro', 'Force', 'Serge Bamba'],
    ['Mobilité & Étirements', 'Mobilité', 'Aïcha Koné'],
    ['Traîneau & Sprint', 'Conditionnement', 'Yao Kouassi'],
  ];
  const times = ['05:30', '06:30', '12:15', '17:30', '18:30', '19:30'];
  const spotsTable = [[6, 2, 7, 3, 8, 4], [5, 9, 3, 6, 2, 7], [8, 4, 6, 1, 5, 9], [6, 2, 7, 3, 8, 4], [3, 7, 5, 9, 4, 2], [10, 6, 8, 4], [9, 5, 7, 6]];
  const daysEl = $('.days');
  const pill = $('.days__pill');
  const rowsEl = $('.timetable__rows');
  days.forEach(([d, n], i) => {
    const b = document.createElement('button');
    b.setAttribute('role', 'tab');
    b.innerHTML = `${d} <span>${n}</span>`;
    b.addEventListener('click', () => selectDay(i));
    daysEl.appendChild(b);
  });
  const dayBtns = $$('button', daysEl);
  let curDay = -1;
  function placePill() {
    const b = dayBtns[curDay]; if (!b) return;
    pill.style.width = b.offsetWidth + 'px';
    pill.style.transform = `translateX(${b.offsetLeft}px)`;
  }
  function renderRows(i) {
    const spots = spotsTable[i];
    const html = spots.map((s, k) => {
      const c = pool[(k + ((i + 4) % 7) * 2) % pool.length];
      const t = i >= 5 ? ['08:00', '09:30', '11:00', '16:00'][k] : times[k];
      return `<div class="row" style="--r:${k}">
        <span class="row__time">${t}</span>
        <span class="row__class"><b>${c[0]}</b><small>${c[1]} · 60 min</small></span>
        <span class="row__coach">${c[2]}</span>
        <span class="row__spots ${s <= 3 ? 'low' : ''}">${s} ${s > 1 ? 'places restantes' : 'place restante'}</span>
        <button class="row__book">Réserver</button>
      </div>`;
    }).join('');
    rowsEl.innerHTML = html;
  }
  function selectDay(i) {
    if (i === curDay) return;
    const first = curDay === -1;
    curDay = i;
    dayBtns.forEach((b, k) => { b.classList.toggle('is-active', k === i); b.setAttribute('aria-selected', k === i); });
    placePill();
    if (first) { renderRows(i); return; }
    const h = rowsEl.offsetHeight;
    rowsEl.style.height = h + 'px';
    $$('.row', rowsEl).forEach(r => r.classList.add('out'));
    setTimeout(() => {
      renderRows(i);
      rowsEl.style.height = 'auto';
      const nh = rowsEl.offsetHeight;
      rowsEl.style.height = h + 'px';
      void rowsEl.offsetHeight;
      rowsEl.style.height = nh + 'px';
      setTimeout(() => { rowsEl.style.height = ''; }, 650);
    }, 320);
  }
  rowsEl.addEventListener('click', e => {
    const b = e.target.closest('.row__book'); if (!b) return;
    b.classList.toggle('booked');
    b.textContent = b.classList.contains('booked') ? 'Réservé ✓' : 'Réserver';
  });
  selectDay(3);
  addEventListener('resize', placePill);

  /* ---------- Pricing toggle ---------- */
  const toggleBtns = $$('[data-billing]');
  const tPill = $('.toggle__pill');
  function placeTogglePill(b) {
    tPill.style.width = b.offsetWidth + 'px';
    tPill.style.transform = `translateX(${b.offsetLeft - 5}px)`;
  }
  toggleBtns.forEach(b => b.addEventListener('click', () => {
    if (b.classList.contains('is-active')) return;
    toggleBtns.forEach(x => x.classList.toggle('is-active', x === b));
    placeTogglePill(b);
    const yearly = b.dataset.billing === 'yearly';
    $$('[data-price]').forEach(el => {
      const base = +el.dataset.price;
      const to = yearly ? Math.round(base * 0.8) : base;
      const from = +(el.dataset.cur || base);
      el.dataset.cur = to;
      animateNumber(el, to, 700, from, fcfa);
    });
    $$('.plan__note').forEach(n => n.textContent = yearly ? 'Par mois, facturé annuellement' : 'Par mois, sans engagement');
  }));
  const placeActiveToggle = () => placeTogglePill($('.toggle .is-active'));
  addEventListener('resize', placeActiveToggle);

  /* ---------- Locations ---------- */
  const locs = [
    { name: 'VOLTA Cocody', tag: 'Club phare · Cocody', address: 'Rue des Jardins, Deux-Plateaux, Cocody — Abidjan', hours: 'Membres 24h/24<br>Encadré de 5h30 à 22h', site: 'Espace récupération, piste de traîneau, parking', x: 72, y: 24 },
    { name: 'VOLTA Plateau', tag: 'Quartier des affaires · Plateau', address: 'Avenue Chardy, Plateau — Abidjan', hours: 'Membres 24h/24<br>Encadré de 5h30 à 21h', site: 'Cours express à midi, douches, consigne', x: 47, y: 45 },
    { name: 'VOLTA Marcory', tag: 'Zone 4 · Marcory', address: 'Rue Paul Langevin, Zone 4, Marcory — Abidjan', hours: 'Membres 24h/24<br>Encadré de 6h à 22h', site: 'Studio de boxe, bain froid, sauna', x: 64, y: 77 },
    { name: 'VOLTA Yopougon', tag: 'Yopougon', address: 'Carrefour Siporex, Yopougon — Abidjan', hours: 'Membres 24h/24<br>Encadré de 6h à 21h', site: 'Studio de spinning, poids libres, parking', x: 15, y: 35 },
  ];
  const marker = $('.map__marker'), mapTag = $('.map__tag'), info = $('.loc-info');
  $$('.loc-list li').forEach(li => li.addEventListener('click', () => {
    if (li.classList.contains('is-active')) return;
    $$('.loc-list li').forEach(x => x.classList.toggle('is-active', x === li));
    const L = locs[+li.dataset.loc];
    marker.style.left = L.x + '%'; marker.style.top = L.y + '%';
    mapTag.textContent = L.tag;
    info.classList.add('swap');
    setTimeout(() => {
      $('h3', info).textContent = L.name;
      $('[data-f="address"]', info).textContent = L.address;
      $('[data-f="hours"]', info).innerHTML = L.hours;
      $('[data-f="site"]', info).textContent = L.site;
      info.classList.remove('swap');
    }, 350);
  }));

  /* ---------- Vidéo du hero ----------
     WebM VP9 avec canal alpha : Chrome, Edge, Firefox, Opera.
     Safari n'affiche pas la transparence VP9 -> on montre l'image détourée. */
  const heroVideo = $('.hero__video');
  if (heroVideo) {
    const isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
    const toPoster = () => {
      const img = new Image();
      img.src = heroVideo.getAttribute('poster');
      img.alt = 'Athlète faisant des pompes';
      heroVideo.replaceWith(img);
    };
    if (isSafari || !heroVideo.canPlayType('video/webm; codecs="vp9"')) toPoster();
    else {
      heroVideo.playbackRate = 0.9;
      const p = heroVideo.play();
      if (p && p.catch) p.catch(() => {});
      // pause quand le hero n'est plus visible (économie batterie)
      new IntersectionObserver(([e]) => { e.isIntersecting ? heroVideo.play().catch(() => {}) : heroVideo.pause(); })
        .observe($('.hero'));
    }
  }

  /* ---------- Titre du hero : occupe toute la largeur (comme « BUILD FASTER ») ---------- */
  function fitTitle() {
    const t = $('.hero__title');
    if (!t) return;
    t.style.fontSize = '100px';
    const words = $$('.hero__word', t);
    const cs = getComputedStyle(t);
    const avail = t.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    let fs;
    if (innerWidth < 760) {                                     // mobile : 2 lignes
      fs = 100 * avail / Math.max(...words.map(w => w.scrollWidth));
    } else {                                                    // desktop : 1 ligne, écart ≈ 0,3 em
      fs = 100 * avail / (words.reduce((s, w) => s + w.scrollWidth, 0) + 48);
    }
    t.style.fontSize = fs.toFixed(2) + 'px';
  }
  fitTitle();
  addEventListener('resize', fitTitle);
  document.fonts && document.fonts.ready.then(fitTitle);

  /* ---------- Boot ---------- */
  const boot = () => {
    document.documentElement.classList.add('is-loaded');
    document.body.classList.add('is-loaded');
    placePill(); placeActiveToggle(); moveFac();
    notched.forEach(applyNotch);
  };
  if (document.readyState === 'complete') boot(); else addEventListener('load', boot);
  document.fonts && document.fonts.ready.then(() => { placePill(); placeActiveToggle(); });
  requestAnimationFrame(raf);
})();
