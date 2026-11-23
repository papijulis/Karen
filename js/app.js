/* Encuesta para Karen — pregunta, calendario, plan, nota y envío por Web3Forms */
(() => {
  'use strict';

  /* ================= configuración ================= */
  const CONFIG = {
    // clave pública de Web3Forms: solo permite mandar correos a la cuenta que la creó
    accessKey: '33f88b1f-8af0-41a8-8939-38e388ed51f0',
    endpoint: 'https://api.web3forms.com/submit',
    semana: [2026, 10, 23],               // lunes 23 de noviembre de 2026 (mes base 0)
    dias: {                               // días libres y sus horarios
      '2026-11-24': ['Noche'],
      '2026-11-25': ['Tarde', 'Noche'],
    },
  };
  const CLAVE_PENDIENTE = 'karen-encuesta-pendiente';

  /* ================= utilidades ================= */
  const $ = (id) => document.getElementById(id);
  const NOMBRES_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const NOMBRES_LARGOS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const deIso = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); };
  const nombreDia = (d) => NOMBRES_LARGOS[(d.getDay() + 6) % 7];
  const lista = (xs) => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`;
  const escapar = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const guardar = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* modo privado */ } };
  const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= estado ================= */
  const respuestas = {
    intentosNo: 0,
    horarios: new Set(),   // 'YYYY-MM-DD|Noche'
    planes: new Set(),     // 'Sushi'
  };

  /* ================= navegación ================= */
  const lienzo = $('lienzo');
  const pantallas = [...document.querySelectorAll('.pantalla')];
  const indice = (nombre) => pantallas.findIndex((p) => p.dataset.pantalla === nombre);
  const I = { pregunta: indice('pregunta'), cuando: indice('cuando'), plan: indice('plan'), nota: indice('nota'), final: indice('final') };
  const barra = $('barra');
  const atras = $('atras');
  const pasos = $('pasos');
  let actual = 0;
  let enTransicion = false;

  for (let i = 0; i < I.final; i++) pasos.appendChild(document.createElement('i'));
  function pintarBarra() {
    [...pasos.children].forEach((p, i) => {
      p.classList.toggle('actual', i === actual);
      p.classList.toggle('hecho', i < actual);
    });
    barra.classList.toggle('oculta', actual === I.final);
    atras.classList.toggle('oculto', actual === I.pregunta || actual === I.final);
  }

  const alEntrar = {};
  function ir(destino) {
    if (enTransicion || destino === actual || destino < 0 || destino >= pantallas.length) return false;
    enTransicion = true;
    const sale = pantallas[actual];
    const entra = pantallas[destino];
    lienzo.style.setProperty('--dir', destino > actual ? 1 : -1);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    sale.classList.add('saliendo');
    sale.classList.remove('activa');
    entra.classList.remove('saliendo');
    void entra.offsetWidth;
    entra.classList.add('activa');
    actual = destino;
    pintarBarra();
    if (alEntrar[entra.dataset.pantalla]) alEntrar[entra.dataset.pantalla]();
    setTimeout(() => { sale.classList.remove('saliendo'); enTransicion = false; }, 520);
    return true;
  }

  // Safari < 16 no conoce overflow: clip; si algo desplaza el lienzo, lo regresamos
  lienzo.addEventListener('scroll', () => { lienzo.scrollLeft = 0; lienzo.scrollTop = 0; });

  atras.addEventListener('click', () => ir(actual - 1));
  document.querySelectorAll('[data-siguiente]').forEach((b) => b.addEventListener('click', () => {
    if (!b.disabled) ir(actual + 1);
  }));

  /* ================= 1 · la pregunta (el "No" se escapa) ================= */
  const btnSi = $('btn-si');
  const btnNo = $('btn-no');
  const pista = $('pista');
  const decision = $('decision');
  const frases = [
    '¿Segura? Piénsalo bien…',
    'Ese botón no funciona jaja',
    'Casi, pero no.',
    'Ándale, di que sí.',
    'Te va a gustar, lo prometo.',
    'El «Sí» está aquí abajito.',
    'No te voy a dejar jajaja',
  ];
  let ultimoEscape = 0;

  function acomodarNo() {
    btnNo.classList.remove('suelto');
    btnNo.removeAttribute('style');
    btnSi.removeAttribute('style');
    if (btnNo.parentElement !== decision) decision.appendChild(btnNo);
    pista.innerHTML = '&nbsp;';
  }
  alEntrar.pregunta = acomodarNo;

  function escaparNo(e) {
    if (e) e.preventDefault();
    if (actual !== I.pregunta || enTransicion) return;
    if (performance.now() - ultimoEscape < 350) return;   // pointerdown + click del mismo toque
    ultimoEscape = performance.now();

    const zona = pantallas[I.pregunta];
    const caja = zona.getBoundingClientRect();
    const escala = caja.width / zona.offsetWidth || 1;

    if (!btnNo.classList.contains('suelto')) {
      const r = btnNo.getBoundingClientRect();
      btnSi.style.flex = `0 0 ${btnSi.getBoundingClientRect().width / escala}px`;
      zona.appendChild(btnNo);
      btnNo.classList.add('suelto');
      btnNo.style.setProperty('--nx', `${(r.left - caja.left) / escala}px`);
      btnNo.style.setProperty('--ny', `${(r.top - caja.top) / escala}px`);
      void btnNo.offsetWidth;
      requestAnimationFrame(() => { btnSi.style.flex = '1 1 100%'; });
    }

    const w = btnNo.offsetWidth, h = btnNo.offsetHeight;
    const W = zona.offsetWidth;
    const margen = 18;
    const siArriba = (btnSi.getBoundingClientRect().top - caja.top) / escala - 18;
    const x0 = parseFloat(btnNo.style.getPropertyValue('--nx')) || 0;
    const y0 = parseFloat(btnNo.style.getPropertyValue('--ny')) || 0;
    const minY = 76, maxY = Math.max(minY + 10, siArriba - h);
    let x = x0, y = y0;
    for (let i = 0; i < 24; i++) {
      x = margen + Math.random() * (W - w - margen * 2);
      y = minY + Math.random() * (maxY - minY);
      if (Math.hypot(x - x0, y - y0) > 150) break;
    }
    btnNo.style.setProperty('--nx', `${x}px`);
    btnNo.style.setProperty('--ny', `${y}px`);
    btnNo.style.setProperty('--nr', `${(Math.random() * 16 - 8).toFixed(1)}deg`);

    pista.textContent = frases[respuestas.intentosNo % frases.length];
    respuestas.intentosNo++;
    const crece = Math.min(respuestas.intentosNo, 5);
    btnSi.style.minHeight = `${58 + crece * 5}px`;
    btnSi.style.fontSize = `${1.15 + crece * 0.09}rem`;
    if (navigator.vibrate) navigator.vibrate(12);
  }
  btnNo.addEventListener('pointerdown', escaparNo);
  btnNo.addEventListener('click', escaparNo);
  btnNo.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover)').matches) escaparNo(); });

  btnSi.addEventListener('click', () => {
    if (performance.now() - ultimoEscape < 600) return;   // el toque que espantó al "No" no cuenta
    ir(I.cuando);
  });

  /* ================= 2 · calendario ================= */
  const semana = $('semana');
  const horariosDia = $('horarios-dia');
  const chips = $('chips');
  const elegidos = $('elegidos');
  const sigCuando = pantallas[I.cuando].querySelector('[data-siguiente]');
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const ICONOS = {
    Tarde: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>',
    Noche: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>',
  };
  const PALOMITA = '<svg class="palomita" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  let diaEnfocado = null;

  const diasLibres = Object.keys(CONFIG.dias).filter((k) => deIso(k) >= hoy);
  for (let i = 0; i < 7; i++) {
    const d = new Date(CONFIG.semana[0], CONFIG.semana[1], CONFIG.semana[2] + i);
    const k = iso(d);
    const libre = diasLibres.includes(k);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dia' + (libre ? ' libre' : '');
    b.dataset.dia = k;
    b.disabled = !libre;
    b.setAttribute('aria-label', `${nombreDia(d)} ${d.getDate()}${libre ? '' : ', no disponible'}`);
    b.innerHTML = `<span class="dia-nombre">${NOMBRES_CORTOS[i]}</span><span class="dia-num">${d.getDate()}</span>` +
      (libre ? '<span class="marca"></span>' : (k === iso(hoy) ? '<span class="hoy">hoy</span>' : ''));
    if (libre) b.addEventListener('click', () => enfocarDia(k));
    semana.appendChild(b);
  }

  function etiqueta(clave) {
    const [k, h] = clave.split('|');
    const d = deIso(k);
    return `${nombreDia(d)} ${d.getDate()} · ${h.toLowerCase()}`;
  }
  function ordenados() {
    // en el orden del calendario, no en el orden en que los tocó
    return Object.entries(CONFIG.dias).flatMap(([k, hs]) => hs.map((h) => `${k}|${h}`)).filter((c) => respuestas.horarios.has(c));
  }

  function enfocarDia(k) {
    diaEnfocado = k;
    const d = deIso(k);
    horariosDia.textContent = `${nombreDia(d)} ${d.getDate()} de noviembre`;
    chips.replaceChildren(...CONFIG.dias[k].map((h) => {
      const clave = `${k}|${h}`;
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'chip';
      c.dataset.horario = clave;
      c.setAttribute('aria-pressed', String(respuestas.horarios.has(clave)));
      c.innerHTML = `${ICONOS[h] || ''}<span>${h}</span>${PALOMITA}`;
      c.addEventListener('click', () => {
        if (respuestas.horarios.has(clave)) respuestas.horarios.delete(clave); else respuestas.horarios.add(clave);
        c.setAttribute('aria-pressed', String(respuestas.horarios.has(clave)));
        pintarCalendario();
      });
      return c;
    }));
    pintarCalendario();
  }

  function pintarCalendario() {
    semana.querySelectorAll('.dia.libre').forEach((b) => {
      b.classList.toggle('enfocado', b.dataset.dia === diaEnfocado);
      b.classList.toggle('con-horario', [...respuestas.horarios].some((c) => c.startsWith(b.dataset.dia)));
      b.setAttribute('aria-pressed', String(b.dataset.dia === diaEnfocado));
    });
    const xs = ordenados();
    elegidos.innerHTML = xs.length
      ? `Elegiste ${lista(xs.map((c) => `<strong>${etiqueta(c)}</strong>`))}.`
      : 'Aún no eliges horario.';
    sigCuando.disabled = xs.length === 0;
  }

  if (diasLibres.length) enfocarDia(diasLibres[0]);
  else {
    horariosDia.textContent = 'Ups, estos días ya pasaron. Escríbeme por chat y vemos otro 🙈';
    pintarCalendario();
  }

  /* ================= 3 · qué hacemos ================= */
  const sigPlan = pantallas[I.plan].querySelector('[data-siguiente]');
  const ORDEN_PLANES = [...document.querySelectorAll('.plan')].map((b) => b.dataset.plan);
  document.querySelectorAll('.plan').forEach((b) => b.addEventListener('click', () => {
    const p = b.dataset.plan;
    if (respuestas.planes.has(p)) respuestas.planes.delete(p); else respuestas.planes.add(p);
    b.setAttribute('aria-pressed', String(respuestas.planes.has(p)));
    sigPlan.disabled = respuestas.planes.size === 0;
  }));
  const planesOrdenados = () => ORDEN_PLANES.filter((p) => respuestas.planes.has(p));

  /* ================= 4 · nota y resumen ================= */
  const mensaje = $('mensaje');
  const btnEnviar = $('enviar');

  function htmlResumen(conMensaje) {
    const filas = [
      ['Salir', 'Sí 💖'],
      ['Cuándo', ordenados().map(etiqueta).join(', ')],
      ['Plan', planesOrdenados().join(', ')],
    ];
    if (conMensaje && mensaje.value.trim()) filas.push(['Mensaje', mensaje.value.trim()]);
    return `<dl>${filas.map(([t, v]) => `<div class="fila"><dt>${t}</dt><dd>${escapar(v)}</dd></div>`).join('')}</dl>`;
  }
  alEntrar.nota = () => { $('resumen').innerHTML = htmlResumen(false); };

  // iOS deja la página corrida después de cerrar el teclado
  mensaje.addEventListener('blur', () => setTimeout(() => window.scrollTo(0, 0), 60));

  /* ================= 5 · envío ================= */
  const estado = $('estado');
  const estadoTexto = $('estado-texto');
  const respaldo = $('respaldo');
  let envio = null;          // payload en curso
  let enviando = false;
  let enviado = false;

  function armarPayload() {
    const n = respuestas.intentosNo;
    const fecha = new Date().toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
    return {
      access_key: CONFIG.accessKey,
      subject: '💌 Karen respondió tu encuesta',
      from_name: 'Encuesta para Karen',
      '¿Sale contigo?': n ? `Sí 💖 (intentó darle al "No" ${n} ${n === 1 ? 'vez' : 'veces'} 😂)` : 'Sí 💖',
      'Cuándo': ordenados().map(etiqueta).join(', '),
      'Plan': planesOrdenados().join(', '),
      'Mensaje': mensaje.value.trim() || '(no escribió nada)',
      'Enviado': fecha,
    };
  }

  async function mandar(payload) {
    const ctrl = new AbortController();
    const reloj = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const datos = await r.json().catch(() => ({}));
      if (!r.ok || !datos.success) throw new Error(datos.message || `HTTP ${r.status}`);
    } finally {
      clearTimeout(reloj);
    }
  }

  function pintarEstado(tipo, texto) {
    estado.dataset.estado = tipo;
    estadoTexto.textContent = texto;
    respaldo.hidden = tipo !== 'error';
  }

  async function enviarConReintentos() {
    if (enviando || enviado || !envio) return;
    enviando = true;
    pintarEstado('enviando', 'Enviando tus respuestas…');
    const esperas = [0, 2000, 5000];
    let ultimoError = null;
    for (const espera of esperas) {
      if (espera) await new Promise((r) => setTimeout(r, espera));
      try {
        await mandar(envio);
        enviado = true;
        guardar(CLAVE_PENDIENTE, null);
        pintarEstado('enviado', 'Listo, ya me llegaron tus respuestas');
        enviando = false;
        return;
      } catch (err) {
        ultimoError = err;
      }
    }
    enviando = false;
    console.warn('No se pudo enviar la encuesta:', ultimoError);
    $('resumen-final').innerHTML = htmlResumen(true);
    pintarEstado('error', 'No se pudo enviar. Mándame captura de esta pantalla 🙈');
  }

  btnEnviar.addEventListener('click', () => {
    if (enviando || enviado) return;
    envio = armarPayload();
    guardar(CLAVE_PENDIENTE, JSON.stringify(envio));
    if (ir(I.final)) {
      setTimeout(celebrar, 250);
      enviarConReintentos();
    }
  });
  $('reintentar').addEventListener('click', enviarConReintentos);
  window.addEventListener('online', () => { if (envio && !enviado) enviarConReintentos(); });

  // si la vez pasada se quedó sin enviar (sin señal, cerró la página), lo intenta en silencio
  const pendiente = leer(CLAVE_PENDIENTE);
  if (pendiente) {
    try {
      const p = JSON.parse(pendiente);
      p.Enviado += ' (reintento automático)';
      mandar(p).then(() => guardar(CLAVE_PENDIENTE, null)).catch(() => {});
    } catch { guardar(CLAVE_PENDIENTE, null); }
  }

  /* ================= lluvia de corazones ================= */
  const lluvia = $('lluvia');
  const colores = ['#D6294B', '#F0627E', '#FF9DB0', '#A3142F', '#FFC2CC', '#E8B04A'];
  let goteo = null;
  function gota(retraso) {
    const c = document.createElement('i');
    c.style.cssText = `--x:${(Math.random() * 104 - 2).toFixed(1)}%;--t:${(12 + Math.random() * 26).toFixed(0)}px;` +
      `--c:${colores[Math.floor(Math.random() * colores.length)]};` +
      `--d:${(3.2 + Math.random() * 3.4).toFixed(2)}s;--r:${retraso.toFixed(2)}s;` +
      `--dx:${(Math.random() * 120 - 60).toFixed(0)}px;` +
      `--g0:${(Math.random() * 60 - 30).toFixed(0)}deg;--g1:${(Math.random() * 240 - 120).toFixed(0)}deg`;
    c.addEventListener('animationend', () => c.remove());
    lluvia.appendChild(c);
  }
  function celebrar() {
    clearInterval(goteo);
    lluvia.replaceChildren();
    const cuantos = sinMovimiento ? 14 : 70;
    for (let i = 0; i < cuantos; i++) gota(Math.random() * 2.2);
    if (navigator.vibrate) navigator.vibrate([30, 60, 30]);
    if (sinMovimiento) return;
    goteo = setInterval(() => { if (!document.hidden) gota(0); }, 420);
  }

  ['gato.gif'].forEach((n) => { const i = new Image(); i.src = `assets/gifs/${n}`; });
  pintarBarra();
})();
