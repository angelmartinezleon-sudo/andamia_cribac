/**
 * CRIBA+C - Lógica completa del cliente (Alumnado y Panel Docente)
 */

const CONFIG_GRUPO = {
  2: {
    tamano: 2,
    tarjetasCorazonada: 2,
    mostrarFechaColumnaI: false,
    descripcionReparto: "Persona A = Analista del texto y Rastreador (R e I); Persona B = Contrastador externo (B).",
    rolesInput: [
      { id: 'A', etiqueta: 'Persona A · Lector + Analista y Rastreador (R e I)' },
      { id: 'B', etiqueta: 'Persona B · Lector + Contrastador externo (B)' }
    ],
    responsableColumna: (ini) => ({
      R: `Persona A: ${ini.A || '---'}`,
      I: `Persona A: ${ini.A || '---'}`,
      B: `Persona B: ${ini.B || '---'}`
    }),
    referenciaInforme: '2 personas (Persona A en R e I; Persona B en B)'
  },
  3: {
    tamano: 3,
    tarjetasCorazonada: 3,
    mostrarFechaColumnaI: true,
    descripcionReparto: "Analista del texto (R), Rastreador de fuentes (I) y Contrastador externo (B).",
    rolesInput: [
      { id: 'Analista', etiqueta: 'Analista del texto (Columna R · Portavoz)' },
      { id: 'Rastreador', etiqueta: 'Rastreador de fuentes (Columna I · Tiempo)' },
      { id: 'Contrastador', etiqueta: 'Contrastador externo (Columna B · Escriba)' }
    ],
    responsableColumna: (ini) => ({
      R: `Analista: ${ini.Analista || '---'}`,
      I: `Rastreador: ${ini.Rastreador || '---'}`,
      B: `Contrastador: ${ini.Contrastador || '---'}`
    }),
    referenciaInforme: '3 roles (Analista del texto, Rastreador y Contrastador)'
  }
};

const estado = {
  codigo: 'DEMO',
  grupo: '1',
  tamano_grupo: 3,
  momento_actual: 'prep',
  sesion: null,
  iniciales: { Analista: 'AML', Rastreador: 'DFG', Contrastador: 'LMP' },
  corazonada: [{ emocion: '', compartiria: '', confianza: 0 }, { emocion: '', compartiria: '', confianza: 0 }, { emocion: '', compartiria: '', confianza: 0 }],
  notas_lectura: ['', '', ''],
  r_frase: '',
  r_afirmacion: '',
  r_pistas_texto: '',
  r_pruebas_faltan: '',
  r_tipo: '',
  i_firma: '',
  i_fecha: '',
  i_fuente_original: '',
  b_otra_fuente: '',
  b_que_dice: '',
  b_coincide: '',
  veredicto_inicial: '',
  a_razon_r: '',
  a_razon_i: '',
  a_razon_b: '',
  confianza_inicial_media: 0,
  confianza_final: 0,
  c_situacion: '',
  c_respuesta_ia: '',
  c_decision: '',
  c_porque: '',
  veredicto_final: '',
  contamos_titular: '',
  contamos_nota: '',
  pistas_usadas: { R: 0, I: 0, B: 0 },
  revisar_usado: { R: false, I: false, B: false },
  contraste_usado: false,
  peticiones_ia_totales: 0,
  errores_ia: [],
  tiempos_empleados: { prep: 0, c: 0, rib: 0, a: 0, masC: 0, contamos: 0 },
  informe: ''
};

let intervaloReloj = null;
let segundosZona = 0;
let limiteSegundosZona = 120;
let pasoBorrado = 0;

function mostrarToast(msg) {
  const t = document.getElementById('toastNotificacion');
  document.getElementById('toastMensaje').textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(window._tTimer);
  window._tTimer = setTimeout(() => t.classList.add('hidden'), 4500);
}
document.getElementById('btnCerrarToast').addEventListener('click', () => document.getElementById('toastNotificacion').classList.add('hidden'));

function contarPalabras(str) {
  const l = String(str || '').trim();
  return l ? l.split(/\s+/).length : 0;
}

async function llamarAPI(operacion, payload) {
  try {
    const res = await fetch('/api/ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operacion, payload })
    });
    return await res.json();
  } catch (err) {
    return { ok: false, texto: 'La IA no responde. Seguid sin ella y avisad al profesor' };
  }
}

async function sincronizarServidor() {
  const clave = `${estado.codigo}_${estado.grupo}`;
  const nombres = { prep: 'Preparación', c: 'Corazonada', rib: 'R·I·B', a: 'Argumentar', masC: 'Contraste', contamos: 'Contamos', Terminado: 'Terminado' };
  const conf = CONFIG_GRUPO[estado.tamano_grupo];
  const iniStr = conf.rolesInput.map(r => `${r.id}: ${estado.iniciales[r.id] || '--'}`).join(' · ');

  await llamarAPI('guardarProgreso', {
    codigo: estado.codigo,
    grupo: estado.grupo,
    tamano_grupo: estado.tamano_grupo,
    iniciales: iniStr,
    momento_actual: nombres[estado.momento_actual] || estado.momento_actual,
    pistas_totales: estado.peticiones_ia_totales,
    organizador: estado
  });
}

// ADAPTACIÓN DE GRUPO
function aplicarAdaptacion(tam) {
  if (estado.momento_actual !== 'prep') {
    mostrarToast('Solo se puede cambiar el tamaño del grupo antes de empezar la zona C.');
    return;
  }
  estado.tamano_grupo = tam;
  document.getElementById('btnSomosDos').classList.toggle('activo', tam === 2);
  document.getElementById('btnSomosTres').classList.toggle('activo', tam === 3);
  const conf = CONFIG_GRUPO[tam];
  document.getElementById('subtituloAdaptacionRoles').textContent = conf.descripcionReparto;
  document.getElementById('bloqueIFecha').classList.toggle('hidden', !conf.mostrarFechaColumnaI);

  renderizarInputsRoles();
  renderizarTarjetasCorazonada();
  renderizarLecturaIndividual();
  actualizarBadges();
}

function renderizarInputsRoles() {
  const cont = document.getElementById('contenedorInputsRoles');
  cont.textContent = '';
  const conf = CONFIG_GRUPO[estado.tamano_grupo];

  conf.rolesInput.forEach(rol => {
    const div = document.createElement('div');
    const lbl = document.createElement('label');
    lbl.className = 'block font-bold text-sm mb-1';
    lbl.textContent = rol.etiqueta;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.maxLength = 3;
    inp.placeholder = 'Iniciales (ej. AML)';
    inp.className = 'uppercase font-bold';
    inp.value = estado.iniciales[rol.id] || '';

    inp.addEventListener('input', () => {
      const limpio = inp.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ]/g, '').slice(0, 3);
      inp.value = limpio;
      estado.iniciales[rol.id] = limpio;
      actualizarBadges();
      renderizarTarjetasCorazonada();
      renderizarLecturaIndividual();
    });

    div.appendChild(lbl);
    div.appendChild(inp);
    cont.appendChild(div);
  });
}

function renderizarLecturaIndividual() {
  const cont = document.getElementById('contenedorLecturaIndividual');
  if (!cont) return;
  cont.textContent = '';
  const conf = CONFIG_GRUPO[estado.tamano_grupo];

  while (estado.notas_lectura.length < conf.tarjetasCorazonada) estado.notas_lectura.push('');
  estado.notas_lectura = estado.notas_lectura.slice(0, conf.tarjetasCorazonada);

  conf.rolesInput.forEach((rol, idx) => {
    const card = document.createElement('div');
    card.className = 'bg-white border-2 border-slate-300 rounded-xl p-3';
    const ini = estado.iniciales[rol.id] || `Persona ${idx + 1}`;
    const lbl = document.createElement('label');
    lbl.className = 'block font-bold text-sm mb-1 text-slate-900';
    lbl.textContent = `✍️ Ideas de ${ini}:`;
    const ta = document.createElement('textarea');
    ta.rows = 2;
    ta.placeholder = `¿Qué detalles has sacado tú, ${ini}?`;
    ta.value = estado.notas_lectura[idx] || '';

    ta.addEventListener('input', () => {
      estado.notas_lectura[idx] = ta.value;
      verificarSintesisComun();
      validarRIB('R');
    });

    card.appendChild(lbl);
    card.appendChild(ta);
    cont.appendChild(card);
  });
  verificarSintesisComun();
}

function verificarSintesisComun() {
  const caja = document.getElementById('cajaSintesisComun');
  const badge = document.getElementById('estadoDesbloqueoSintesis');
  if (!caja) return;

  const todas = estado.notas_lectura.every(n => String(n || '').trim().length >= 10);
  if (todas) {
    caja.classList.remove('opacity-50', 'pointer-events-none');
    badge.textContent = '🔓 Listo: Redactad el resumen común';
    badge.className = 'text-xs font-bold bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full';
  } else {
    caja.classList.add('opacity-50', 'pointer-events-none');
    badge.textContent = '🔒 Falta que cada miembro anote sus ideas (mín. 10 caract.)';
    badge.className = 'text-xs font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full';
  }
}

function actualizarBadges() {
  const conf = CONFIG_GRUPO[estado.tamano_grupo];
  const badges = conf.responsableColumna(estado.iniciales);
  document.getElementById('badgeRolR').textContent = badges.R;
  document.getElementById('badgeRolI').textContent = badges.I;
  document.getElementById('badgeRolB').textContent = badges.B;
}

function renderizarTarjetasCorazonada() {
  const cont = document.getElementById('contenedorTarjetasCorazonada');
  cont.textContent = '';
  const conf = CONFIG_GRUPO[estado.tamano_grupo];

  while (estado.corazonada.length < conf.tarjetasCorazonada) estado.corazonada.push({ emocion: '', compartiria: '', confianza: 0 });
  estado.corazonada = estado.corazonada.slice(0, conf.tarjetasCorazonada);

  conf.rolesInput.forEach((rol, idx) => {
    const d = estado.corazonada[idx];
    const card = document.createElement('div');
    card.className = 'bg-amber-50/70 border-2 border-amber-300 rounded-xl p-3.5';
    const h3 = document.createElement('h3');
    h3.className = 'font-bold text-base m-0 mb-2.5 text-amber-950';
    h3.textContent = `👤 Tarjeta ${idx + 1} (${estado.iniciales[rol.id] || `Persona ${idx + 1}`})`;
    card.appendChild(h3);

    const divEmo = document.createElement('div');
    divEmo.className = 'mb-3';
    divEmo.innerHTML = `<label class="block font-bold text-sm mb-1">Emoción en una palabra</label><input type="text" placeholder="Ej. Sorpresa" value="${d.emocion || ''}" />`;
    divEmo.querySelector('input').addEventListener('input', e => { d.emocion = e.target.value.trim().split(/\s+/)[0] || ''; });
    card.appendChild(divEmo);

    const divComp = document.createElement('div');
    divComp.className = 'mb-3';
    divComp.innerHTML = `<span class="block font-bold text-sm mb-1">¿La compartirías?</span><div class="grid grid-cols-2 gap-2"><button type="button" class="btn-opcion text-sm ${d.compartiria === 'Sí' ? 'activo' : ''}">Sí</button><button type="button" class="btn-opcion text-sm ${d.compartiria === 'No' ? 'activo' : ''}">No</button></div>`;
    divComp.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => {
        d.compartiria = b.textContent;
        divComp.querySelectorAll('button').forEach(x => x.classList.remove('activo'));
        b.classList.add('activo');
      });
    });
    card.appendChild(divComp);

    const divConf = document.createElement('div');
    let htmlConf = `<span class="block font-bold text-sm mb-1">Confianza (1 a 6)</span><div class="grid grid-cols-6 gap-1.5">`;
    for (let n = 1; n <= 6; n++) {
      htmlConf += `<button type="button" class="btn-opcion text-sm px-1 ${d.confianza === n ? 'activo' : ''}">${n}</button>`;
    }
    htmlConf += `</div>`;
    divConf.innerHTML = htmlConf;
    divConf.querySelectorAll('button').forEach((b, i) => {
      b.addEventListener('click', () => {
        d.confianza = i + 1;
        divConf.querySelectorAll('button').forEach(x => x.classList.remove('activo'));
        b.classList.add('activo');
      });
    });
    card.appendChild(divConf);
    cont.appendChild(card);
  });
}

// TEMPORIZADOR Y AVANCE
function iniciarTemporizador(clave, min) {
  if (intervaloReloj) clearInterval(intervaloReloj);
  segundosZona = 0;
  limiteSegundosZona = (Number(min) || 3) * 60;
  const nombres = { prep: 'Preparación', c: 'Corazonada', rib: 'R·I·B', a: 'Argumentar', masC: 'Contraste', contamos: 'Contamos' };
  const reloj = document.getElementById('relojGlobal');
  const etiqueta = document.getElementById('etiquetaTiempoZona');
  reloj.className = 'reloj-normal px-3 py-1 rounded-lg font-bold text-sm flex items-center gap-1.5';

  intervaloReloj = setInterval(() => {
    segundosZona++;
    estado.tiempos_empleados[clave] = Math.round((segundosZona / 60) * 10) / 10;
    const r = Math.max(0, limiteSegundosZona - segundosZona);
    const m = String(Math.floor(r / 60)).padStart(2, '0');
    const s = String(r % 60).padStart(2, '0');
    etiqueta.textContent = `${nombres[clave] || clave}: ${m}:${s}`;
    if (segundosZona >= limiteSegundosZona) {
      reloj.className = 'reloj-agotado px-3 py-1 rounded-lg font-bold text-sm flex items-center gap-1.5';
    } else if (segundosZona >= limiteSegundosZona * 0.8) {
      reloj.className = 'reloj-aviso-80 px-3 py-1 rounded-lg font-bold text-sm flex items-center gap-1.5';
    }
  }, 1000);
}

function avanzarZona(nueva) {
  const orden = ['prep', 'c', 'rib', 'a', 'masC', 'contamos'];
  const idxNuevo = orden.indexOf(nueva);
  estado.momento_actual = nueva;

  const mapa = { prep: 'zona-prep', c: 'zona-c', rib: 'zona-rib', a: 'zona-a', masC: 'zona-masC', contamos: 'zona-contamos' };
  const el = document.getElementById(mapa[nueva]);
  if (el) {
    el.classList.remove('bloqueada');
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.querySelectorAll('.paso-progreso').forEach(item => {
    const p = item.dataset.paso;
    const idx = orden.indexOf(p);
    item.classList.remove('activo', 'completado');
    if (idx < idxNuevo) item.classList.add('completado');
    else if (idx === idxNuevo) item.classList.add('activo');
  });

  const mins = estado.sesion?.minutos_por_momento || { prep: 2, c: 3, rib: 15, a: 7, masC: 5, contamos: 3 };
  iniciarTemporizador(nueva, mins[nueva] || 3);
  sincronizarServidor();
}

// VALIDACIÓN COLUMNAS R, I, B
function validarRIB(col) {
  const faltas = [];
  if (col === 'R') {
    if (estado.notas_lectura.some(n => String(n || '').trim().length < 10)) faltas.push('apuntes individuales en 1A');
    if (estado.r_frase.trim().length < 15) faltas.push('resumen en frase (mín. 15 caract.)');
    if (estado.r_afirmacion.trim().length < 15) faltas.push('afirmación principal (mín. 15 caract.)');
    if (estado.r_pistas_texto.trim().length < 15) faltas.push('palabras trampa/tono (mín. 15 caract.)');
    if (estado.r_pruebas_faltan.trim().length < 15) faltas.push('datos que faltan (mín. 15 caract.)');
    if (!estado.r_tipo) faltas.push('elegir Info/Opinión');
  } else if (col === 'I') {
    if (estado.i_firma.trim().length < 15) faltas.push('firma y medio (mín. 15 caract.)');
    if (CONFIG_GRUPO[estado.tamano_grupo].mostrarFechaColumnaI && estado.i_fecha.trim().length < 15) faltas.push('fecha y actualización');
    if (estado.i_fuente_original.trim().length < 15) faltas.push('fuente original (mín. 15 caract.)');
  } else if (col === 'B') {
    if (estado.b_otra_fuente.trim().length < 15) faltas.push('otra fuente (mín. 15 caract.)');
    if (estado.b_que_dice.trim().length < 15) faltas.push('qué dice (mín. 15 caract.)');
    if (!estado.b_coincide) faltas.push('elegir si coincide');
  }

  const btnP = document.getElementById(`btnPista${col}`);
  const btnR = document.getElementById(`btnRevisar${col}`);
  const aviso = document.getElementById(`ayudaValidacion${col}`);
  const rest = Math.max(0, 3 - (estado.pistas_usadas[col] || 0));

  document.getElementById(`contPistas${col}`).textContent = rest;
  document.getElementById(`contRev${col}`).textContent = estado.revisar_usado[col] ? '0' : '1';

  if (faltas.length > 0) {
    btnP.disabled = true; btnR.disabled = true;
    aviso.textContent = `Falta completar: ${faltas.join(', ')}.`;
  } else {
    btnP.disabled = rest <= 0;
    btnR.disabled = Boolean(estado.revisar_usado[col]);
    aviso.textContent = '✓ Casillas listas para consultar a la IA.';
  }
}

async function pedirIA(col, tipo) {
  const numP = (estado.pistas_usadas[col] || 0) + 1;
  let vars = {};
  if (col === 'R') {
    vars = { notas_individuales: estado.notas_lectura.join(' | '), frase: estado.r_frase, afirmacion: estado.r_afirmacion, pistas_texto: estado.r_pistas_texto, pruebas_faltan: estado.r_pruebas_faltan, tipo: estado.r_tipo, peticion: tipo, n: numP };
  } else if (col === 'I') {
    vars = { firma: estado.i_firma, fecha: CONFIG_GRUPO[estado.tamano_grupo].mostrarFechaColumnaI ? estado.i_fecha : 'No aplica', fuente_original: estado.i_fuente_original, peticion: tipo, n: numP };
  } else if (col === 'B') {
    vars = { afirmacion: estado.r_afirmacion, otra_fuente: estado.b_otra_fuente, que_dice: estado.b_que_dice, coincide: estado.b_coincide, peticion: tipo, n: numP };
  }

  const boc = document.getElementById(`bocadilloIA${col}`);
  const txt = document.getElementById(`textoIA${col}`);
  boc.classList.remove('hidden');
  txt.textContent = 'Consultando IA...';

  const r = await llamarAPI('consultarIA', {
    codigo: estado.codigo, grupo: estado.grupo, tamano: estado.tamano_grupo,
    titular: estado.sesion.titular, cuerpo: estado.sesion.cuerpo,
    momento: col, tipo_peticion: tipo, variables: vars
  });

  txt.textContent = r.texto;
  if (r.ok) {
    if (tipo === 'PISTA') estado.pistas_usadas[col]++;
    if (tipo === 'REVISAR') estado.revisar_usado[col] = true;
    estado.peticiones_ia_totales++;
    document.getElementById('contadorGlobalIA').textContent = estado.peticiones_ia_totales;
  }
  validarRIB(col);
  sincronizarServidor();
}

// INICIALIZACIÓN DE EVENTOS DEL ALUMNO
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('vista') === 'profesor') {
    iniciarVistaProfesor();
    return;
  }

  aplicarAdaptacion(3);
  iniciarTemporizador('prep', 2);

  document.getElementById('btnConectarSesion').addEventListener('click', async () => {
    const cod = document.getElementById('inputCodigoSesion').value.toUpperCase().trim();
    const grp = document.getElementById('selectNumeroGrupo').value;
    const res = await llamarAPI('entrarSesion', { codigo: cod });

    if (!res.ok) {
      mostrarToast(res.error || 'Código no encontrado.');
      return;
    }
    estado.codigo = cod;
    estado.grupo = grp;
    estado.sesion = res.sesion;

    document.getElementById('badgeEstadoSesion').textContent = `Sesión ${cod} · Grupo ${grp}`;
    document.getElementById('noticiaTitular').textContent = res.sesion.titular;
    document.getElementById('noticiaEntradilla').textContent = res.sesion.entradilla || '';
    document.getElementById('noticiaTitularAbajo').textContent = res.sesion.titular;
    document.getElementById('noticiaEntradillaAbajo').textContent = res.sesion.entradilla || '';
    document.getElementById('noticiaCuerpo').textContent = res.sesion.cuerpo;
    const link = document.getElementById('noticiaEnlace');
    link.href = res.sesion.enlace_original;
    link.textContent = res.sesion.enlace_original;

    if (res.sesion.url_imagen) {
      document.getElementById('noticiaImagen').src = res.sesion.url_imagen;
      document.getElementById('contenedorImagenNoticia').classList.remove('hidden');
      document.getElementById('noticiaImagenAbajo').src = res.sesion.url_imagen;
      document.getElementById('contenedorImagenNoticiaAbajo').classList.remove('hidden');
    }

    mostrarToast(`Conectado a la sesión ${cod} (Grupo ${grp}).`);
    sincronizarServidor();
  });

  document.getElementById('btnSomosDos').addEventListener('click', () => aplicarAdaptacion(2));
  document.getElementById('btnSomosTres').addEventListener('click', () => aplicarAdaptacion(3));

  document.getElementById('btnRepartirAzar').addEventListener('click', () => {
    const conf = CONFIG_GRUPO[estado.tamano_grupo];
    const vals = conf.rolesInput.map(r => estado.iniciales[r.id]).filter(Boolean);
    if (vals.length < conf.rolesInput.length) {
      mostrarToast('Escribid primero las iniciales en las casillas.');
      return;
    }
    for (let i = vals.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [vals[i], vals[j]] = [vals[j], vals[i]];
    }
    conf.rolesInput.forEach((r, idx) => { estado.iniciales[r.id] = vals[idx]; });
    renderizarInputsRoles();
    renderizarTarjetasCorazonada();
    renderizarLecturaIndividual();
    actualizarBadges();
    mostrarToast('Roles repartidos.');
  });

  document.getElementById('btnCompletarPrep').addEventListener('click', () => {
    const conf = CONFIG_GRUPO[estado.tamano_grupo];
    if (conf.rolesInput.some(r => !estado.iniciales[r.id])) {
      mostrarToast('Faltan iniciales en los roles.');
      return;
    }
    document.getElementById('btnSomosDos').disabled = true;
    document.getElementById('btnSomosTres').disabled = true;
    avanzarZona('c');
  });

  document.getElementById('btnCompletarC').addEventListener('click', () => {
    if (estado.corazonada.some(c => !c.emocion || !c.compartiria || !c.confianza)) {
      mostrarToast('Completad las tarjetas de corazonada.');
      return;
    }
    const suma = estado.corazonada.reduce((acc, c) => acc + Number(c.confianza), 0);
    estado.confianza_inicial_media = Math.round((suma / estado.corazonada.length) * 10) / 10;
    avanzarZona('rib');
  });

  // Eventos de columnas R, I, B
  document.getElementById('rFrase').addEventListener('input', e => { estado.r_frase = e.target.value; validarRIB('R'); });
  document.getElementById('rAfirmacion').addEventListener('input', e => {
    estado.r_afirmacion = e.target.value;
    document.getElementById('espejoAfirmacionR').textContent = estado.r_afirmacion || 'Esperando afirmación';
    validarRIB('R');
  });
  document.getElementById('rPistasTexto').addEventListener('input', e => { estado.r_pistas_texto = e.target.value; validarRIB('R'); });
  document.getElementById('rPruebasFaltan').addEventListener('input', e => { estado.r_pruebas_faltan = e.target.value; validarRIB('R'); });

  document.getElementById('iFirma').addEventListener('input', e => { estado.i_firma = e.target.value; validarRIB('I'); });
  document.getElementById('iFecha').addEventListener('input', e => { estado.i_fecha = e.target.value; validarRIB('I'); });
  document.getElementById('iFuenteOriginal').addEventListener('input', e => { estado.i_fuente_original = e.target.value; validarRIB('I'); });

  document.getElementById('bOtraFuente').addEventListener('input', e => { estado.b_otra_fuente = e.target.value; validarRIB('B'); });
  document.getElementById('bQueDice').addEventListener('input', e => { estado.b_que_dice = e.target.value; validarRIB('B'); });

  document.querySelectorAll('.btn-toggle-campo').forEach(btn => {
    btn.addEventListener('click', () => {
      const campo = btn.dataset.campo;
      const val = btn.dataset.valor;
      estado[campo] = val;
      Array.from(btn.parentElement.children).forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      if (campo === 'r_tipo') validarRIB('R');
      if (campo === 'b_coincide') validarRIB('B');
      if (campo === 'c_decision') {
        document.getElementById('selectorNuevoVeredicto').classList.toggle('hidden', val !== 'Cambiamos');
      }
    });
  });

  ['R', 'I', 'B'].forEach(col => {
    validarRIB(col);
    document.getElementById(`btnPista${col}`).addEventListener('click', () => pedirIA(col, 'PISTA'));
    document.getElementById(`btnRevisar${col}`).addEventListener('click', () => pedirIA(col, 'REVISAR'));
  });

  document.querySelectorAll('.btn-error-ia').forEach(btn => {
    btn.addEventListener('click', () => document.getElementById(`cajaErrorIA${btn.dataset.col}`).classList.toggle('hidden'));
  });

  document.querySelectorAll('.btn-guardar-error').forEach(btn => {
    btn.addEventListener('click', () => {
      const col = btn.dataset.col;
      const inp = document.getElementById(`inputErrorIA${col}`);
      if (!inp.value.trim()) return;
      estado.errores_ia.push({ columna: col, explicacion: inp.value.trim() });
      inp.value = '';
      document.getElementById(`cajaErrorIA${col}`).classList.add('hidden');
      mostrarToast('Discrepancia guardada.');
      sincronizarServidor();
    });
  });

  document.getElementById('btnCompletarRIB').addEventListener('click', () => {
    avanzarZona('a');
  });

  // Zona A
  document.querySelectorAll('.btn-veredicto-item').forEach(btn => {
    btn.addEventListener('click', () => {
      estado.veredicto_inicial = btn.dataset.veredicto;
      estado.veredicto_final = btn.dataset.veredicto;
      document.querySelectorAll('.btn-veredicto-item').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
    });
  });
  document.getElementById('aRazonR').addEventListener('input', e => estado.a_razon_r = e.target.value);
  document.getElementById('aRazonI').addEventListener('input', e => estado.a_razon_i = e.target.value);
  document.getElementById('aRazonB').addEventListener('input', e => estado.a_razon_b = e.target.value);

  document.querySelectorAll('.btn-conf-final').forEach(btn => {
    btn.addEventListener('click', () => {
      estado.confianza_final = Number(btn.dataset.conf);
      document.querySelectorAll('.btn-conf-final').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      const comp = document.getElementById('comparativaConfianzaTexto');
      comp.textContent = `Al principio: ${String(estado.confianza_inicial_media).replace('.', ',')} · Ahora: ${estado.confianza_final}`;
      comp.classList.remove('hidden');
    });
  });

  document.getElementById('btnCompletarA').addEventListener('click', () => avanzarZona('masC'));

  // Zona +C
  const sit = document.getElementById('cSituacion');
  const btnC = document.getElementById('btnContrastarIA');
  sit.addEventListener('input', e => {
    estado.c_situacion = e.target.value;
    btnC.disabled = estado.contraste_usado || e.target.value.trim().length < 8;
  });

  btnC.addEventListener('click', async () => {
    btnC.disabled = true; estado.contraste_usado = true;
    const boc = document.getElementById('bocadilloIAContraste');
    const txt = document.getElementById('textoIAContraste');
    boc.classList.remove('hidden'); txt.textContent = 'Analizando contraste...';

    const r = await llamarAPI('consultarIA', {
      codigo: estado.codigo, grupo: estado.grupo, tamano: estado.tamano_grupo,
      titular: estado.sesion.titular, cuerpo: estado.sesion.cuerpo,
      momento: 'CONTRASTE', tipo_peticion: 'CONTRASTE',
      variables: { veredicto: estado.veredicto_inicial, razones: `R:${estado.a_razon_r} | I:${estado.a_razon_i} | B:${estado.a_razon_b}`, resumen_columnas: estado.r_frase, situacion: estado.c_situacion }
    });
    txt.textContent = r.texto;
    document.getElementById('bloqueDecisionContraste').classList.remove('hidden');
  });

  document.querySelectorAll('.btn-veredicto-nuevo').forEach(btn => {
    btn.addEventListener('click', () => {
      estado.veredicto_final = btn.dataset.veredicto;
      document.querySelectorAll('.btn-veredicto-nuevo').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
    });
  });
  document.getElementById('cPorque').addEventListener('input', e => estado.c_porque = e.target.value);
  document.getElementById('btnCompletarMasC').addEventListener('click', () => avanzarZona('contamos'));

  // Zona Contamos
  document.getElementById('contamosTitular').addEventListener('input', e => estado.contamos_titular = e.target.value);
  document.getElementById('contamosNota').addEventListener('input', e => estado.contamos_nota = e.target.value);

  document.getElementById('btnTerminarCriba').addEventListener('click', async () => {
    const btn = document.getElementById('btnTerminarCriba');
    btn.disabled = true; btn.textContent = 'Generando informe...';

    const datosCalc = `• Tamaño: ${CONFIG_GRUPO[estado.tamano_grupo].referenciaInforme}\n• Veredicto: ${estado.veredicto_final}`;
    const rIA = await llamarAPI('consultarIA', {
      codigo: estado.codigo, grupo: estado.grupo, tamano: estado.tamano_grupo,
      titular: estado.sesion.titular, cuerpo: estado.sesion.cuerpo,
      momento: 'INFORME', tipo_peticion: 'INFORME',
      variables: { datos_calculados: datosCalc, organizador: JSON.stringify(estado) }
    });

    estado.informe = `${datosCalc}\n\nValoración cualitativa:\n${rIA.texto}`;
    estado.momento_actual = 'Terminado';
    await sincronizarServidor();

    const cont = document.getElementById('contenedorInformeRenderizado');
    cont.textContent = '';
    const pre = document.createElement('pre');
    pre.className = 'bg-slate-50 p-3 rounded text-sm whitespace-pre-wrap font-sans';
    pre.textContent = estado.informe;
    cont.appendChild(pre);

    document.getElementById('zona-cierre').classList.remove('hidden');
    document.getElementById('zona-cierre').scrollIntoView({ behavior: 'smooth' });
    btn.textContent = '✅ Criba guardada';
  });

  // BOTÓN DESCARGAR PDF (Fuerza window.print explícitamente sin bloqueos)
  document.getElementById('btnDescargarPDF').addEventListener('click', () => {
    window.print();
  });

  document.getElementById('btnAvisarProfesor').addEventListener('click', () => {
    document.getElementById('cartelAvisarProfesor').classList.remove('hidden');
  });
});

// VISTA PROFESOR
function iniciarVistaProfesor() {
  document.getElementById('vistaAlumno').classList.add('hidden');
  document.getElementById('barraProgresoAlumno').classList.add('hidden');
  document.getElementById('vistaProfesor').classList.remove('hidden');

  document.getElementById('btnValidarPinProf').addEventListener('click', async () => {
    const pin = document.getElementById('inputPinProfesor').value.trim();
    const res = await llamarAPI('verificarPin', { pin });
    if (!res.ok) {
      document.getElementById('msgErrorPin').textContent = 'PIN incorrecto.';
      return;
    }
    window._pinProf = pin;
    document.getElementById('cardLoginProfesor').classList.add('hidden');
    document.getElementById('contenidoPanelProfesor').classList.remove('hidden');
    actualizarPanelDocente();
    setInterval(actualizarPanelDocente, 30000);
  });

  document.getElementById('btnGenerarCodigoSesion').addEventListener('click', async () => {
    const titular = document.getElementById('profTitular').value.trim();
    const entradilla = document.getElementById('profEntradilla').value.trim();
    const cuerpo = document.getElementById('profCuerpo').value.trim();
    const enlace_original = document.getElementById('profEnlaceOriginal').value.trim();

    if (!titular || !cuerpo || !enlace_original) {
      mostrarToast('Completa los campos obligatorios.');
      return;
    }

    const res = await llamarAPI('crearSesion', { pin: window._pinProf, titular, entradilla, cuerpo, enlace_original });
    if (res.ok) {
      const caja = document.getElementById('cajaCodigoCreadoProf');
      caja.textContent = `✅ Sesión creada. Código para la pizarra: ${res.sesion.codigo}`;
      caja.classList.remove('hidden');
      actualizarPanelDocente();
    }
  });

  document.getElementById('btnRefrescarTablaProf').addEventListener('click', actualizarPanelDocente);

  document.getElementById('btnVaciarCurso').addEventListener('click', async () => {
    if (confirm('¿Seguro que quieres vaciar todos los datos del curso?')) {
      await llamarAPI('vaciarDatos', { pin: window._pinProf });
      actualizarPanelDocente();
      mostrarToast('Datos vaciados.');
    }
  });
}

async function actualizarPanelDocente() {
  const res = await llamarAPI('panelProfesor', { pin: window._pinProf });
  if (!res.ok) return;

  const tbody = document.getElementById('tbodySeguimientoProf');
  tbody.textContent = '';
  (res.progreso || []).forEach(p => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-200';
    [p.codigo, `Grupo ${p.grupo}`, `${p.tamano_grupo}p`, p.iniciales, p.momento_actual, `${p.pistas_totales}/12`, p.ultima_actualizacion].forEach(v => {
      const td = document.createElement('td'); td.className = 'p-2'; td.textContent = v; tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  const contOrg = document.getElementById('contenedorBotonesOrganizadores');
  contOrg.textContent = '';
  (res.organizadores || []).forEach(org => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bg-white border p-2 rounded text-sm font-bold';
    b.textContent = `Sesión ${org.codigo} · Grupo ${org.grupo} (${org.veredicto_final})`;
    b.addEventListener('click', () => {
      const v = document.getElementById('visorOrganizadorSeleccionado');
      v.classList.remove('hidden');
      v.textContent = JSON.stringify(org, null, 2);
    });
    contOrg.appendChild(b);
  });
}