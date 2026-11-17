/* Para Karen — navegación por láminas, el "No" que se escapa y la lluvia final */
(() => {
  const telefono = document.getElementById('telefono');
  const laminas = [...document.querySelectorAll('.lamina')];
  const progreso = document.getElementById('progreso');
  const lluvia = document.getElementById('lluvia');
  const btnSi = document.getElementById('btn-si');
  const btnNo = document.getElementById('btn-no');
  const pista = document.getElementById('pista');
  const decision = document.getElementById('decision');
  const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const IDX_PREGUNTA = laminas.findIndex(l => l.dataset.lamina === 'pregunta');
  const IDX_FINAL = laminas.length - 1;
  let actual = 0;
  let bloqueado = false;

  /* ---------- progreso: un punto por lámina de la propuesta ---------- */
  laminas.forEach(() => progreso.appendChild(document.createElement('i')));
  const puntos = [...progreso.children];
  function pintarProgreso() {
    puntos.forEach((p, i) => {
      p.classList.toggle('actual', i === actual);
      p.classList.toggle('hecho', i < actual);
    });
    progreso.classList.toggle('oculto', actual === 0 || actual === IDX_FINAL);
  }

  /* ---------- cambiar de lámina ---------- */
  function ir(destino) {
    if (bloqueado || destino === actual || destino < 0 || destino >= laminas.length) return;
    bloqueado = true;
    const dir = destino > actual ? 1 : -1;
    const sale = laminas[actual];
    const entra = laminas[destino];
    telefono.style.setProperty('--dir', dir);
    sale.classList.add('saliendo');
    sale.classList.remove('activa');
    // la que entra arranca del lado correcto antes de animarse
    entra.classList.remove('saliendo');
    void entra.offsetWidth;
    entra.classList.add('activa');
    actual = destino;
    pintarProgreso();
    if (destino === IDX_PREGUNTA) reiniciarDecision();
    if (destino !== IDX_FINAL) lluvia.replaceChildren();
    setTimeout(() => { sale.classList.remove('saliendo'); bloqueado = false; }, 520);
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ir]');
    if (!b) return;
    const a = b.dataset.ir;
    if (a === 'sig') ir(actual + 1);
    else if (a === 'ant') ir(actual - 1);
    else if (a === 'inicio') ir(0);
  });

  // en escritorio: flechas del teclado (nunca saltan la pregunta)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' && actual < IDX_PREGUNTA) ir(actual + 1);
    if (e.key === 'ArrowLeft' && actual > 0 && actual < IDX_FINAL) ir(actual - 1);
  });

  /* ---------- el "No" que se escapa ---------- */
  const frases = [
    '¿Segura? Piénsalo bien…',
    'Ese botón no funciona jaja',
    'Casi, pero no.',
    'Ándale, di que sí.',
    'Te va a gustar, lo prometo.',
    'El «Sí» está aquí abajito.',
    'No te voy a dejar jajaja',
  ];
  let intentos = 0;
  let ultimoEscape = 0;

  function reiniciarDecision() {
    intentos = 0;
    pista.innerHTML = '&nbsp;';
    btnNo.classList.remove('suelto');
    btnNo.removeAttribute('style');
    btnSi.removeAttribute('style');
    if (btnNo.parentElement !== decision) decision.appendChild(btnNo);
  }

  function escapar(e) {
    if (e) e.preventDefault();
    if (actual !== IDX_PREGUNTA) return;
    // un mismo toque dispara pointerdown y click: solo cuenta una vez
    if (performance.now() - ultimoEscape < 350) return;
    ultimoEscape = performance.now();
    const lamina = laminas[IDX_PREGUNTA];
    const caja = lamina.getBoundingClientRect();
    const escala = caja.width / lamina.offsetWidth || 1;

    if (!btnNo.classList.contains('suelto')) {
      // lo sacamos de la fila sin que brinque: parte de donde estaba
      const r = btnNo.getBoundingClientRect();
      const anchoSi = btnSi.getBoundingClientRect().width;
      btnSi.style.flex = `0 0 ${anchoSi / escala}px`;
      lamina.appendChild(btnNo);
      btnNo.classList.add('suelto');
      btnNo.style.setProperty('--nx', `${(r.left - caja.left) / escala}px`);
      btnNo.style.setProperty('--ny', `${(r.top - caja.top) / escala}px`);
      void btnNo.offsetWidth;
      requestAnimationFrame(() => { btnSi.style.flex = '1 1 100%'; });
    }

    const w = btnNo.offsetWidth, h = btnNo.offsetHeight;
    const W = lamina.offsetWidth, H = lamina.offsetHeight;
    const margen = 18;
    const si = btnSi.getBoundingClientRect();
    const siTop = (si.top - caja.top) / escala - 16;
    const ahoraX = parseFloat(btnNo.style.getPropertyValue('--nx')) || 0;
    const ahoraY = parseFloat(btnNo.style.getPropertyValue('--ny')) || 0;
    const minY = 70, maxY = Math.max(minY + 10, siTop - h);
    let x = ahoraX, y = ahoraY;
    // un lugar nuevo, lejos del anterior y nunca encima del "Sí"
    for (let i = 0; i < 24; i++) {
      x = margen + Math.random() * (W - w - margen * 2);
      y = minY + Math.random() * (maxY - minY);
      if (Math.hypot(x - ahoraX, y - ahoraY) > 150) break;
    }
    btnNo.style.setProperty('--nx', `${x}px`);
    btnNo.style.setProperty('--ny', `${y}px`);
    btnNo.style.setProperty('--nr', `${(Math.random() * 16 - 8).toFixed(1)}deg`);

    pista.textContent = frases[intentos % frases.length];
    intentos++;
    // el "Sí" crece un poquito cada vez
    const crece = Math.min(intentos, 5);
    btnSi.style.minHeight = `${58 + crece * 5}px`;
    btnSi.style.fontSize = `${1.15 + crece * 0.09}rem`;
    if (navigator.vibrate) navigator.vibrate(12);
  }

  btnNo.addEventListener('pointerdown', escapar);
  btnNo.addEventListener('click', escapar);
  btnNo.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover)').matches) escapar(); });

  btnSi.addEventListener('click', () => {
    // el toque que espantó al "No" puede caer sobre el "Sí" que crece: no cuenta
    if (performance.now() - ultimoEscape < 600) return;
    btnNo.style.opacity = '0';
    ir(IDX_FINAL);
    setTimeout(celebrar, 250);
  });

  /* ---------- lluvia de corazones ---------- */
  const colores = ['#D6294B', '#F0627E', '#FF9DB0', '#A3142F', '#FFC2CC', '#E8B04A'];
  function gota(retraso) {
    const c = document.createElement('i');
    const t = 12 + Math.random() * 26;
    c.style.cssText = `--x:${(Math.random() * 104 - 2).toFixed(1)}%;--t:${t.toFixed(0)}px;` +
      `--c:${colores[Math.floor(Math.random() * colores.length)]};` +
      `--d:${(3.2 + Math.random() * 3.4).toFixed(2)}s;--r:${retraso.toFixed(2)}s;` +
      `--dx:${(Math.random() * 120 - 60).toFixed(0)}px;` +
      `--g0:${(Math.random() * 60 - 30).toFixed(0)}deg;--g1:${(Math.random() * 240 - 120).toFixed(0)}deg`;
    c.addEventListener('animationend', () => c.remove());
    lluvia.appendChild(c);
  }
  let goteo = null;
  function celebrar() {
    clearInterval(goteo);
    lluvia.replaceChildren();
    const cuantos = sinMovimiento ? 14 : 70;
    for (let i = 0; i < cuantos; i++) gota(Math.random() * 2.2);
    if (navigator.vibrate) navigator.vibrate([30, 60, 30]);
    if (sinMovimiento) return;
    // después del estallido, una llovizna suave mientras siga en el final
    goteo = setInterval(() => {
      if (actual !== IDX_FINAL) { clearInterval(goteo); return; }
      if (!document.hidden) gota(0);
    }, 420);
  }

  // precarga los GIFs para que cada lámina entre ya animada
  ['corazon.webp', 'besito.webp', 'sticker.png'].forEach(n => { const i = new Image(); i.src = `assets/gifs/${n}`; });

  pintarProgreso();
})();
