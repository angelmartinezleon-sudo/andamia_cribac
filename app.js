(function () {
  const STORAGE_KEY = 'cribac_estado_v2';
  let consultasIA = 0;
  const MAX_IA = 12;
  let tamanoGrupo = 3;
  let segundosRestantes = 120;
  let faseActual = 'Preparación';

  const TIEMPOS_FASE = {
    'zona-prep': { nombre: 'Preparación', seg: 120 },
    'zona-c': { nombre: 'C · Corazonada', seg: 180 },
    'zona-rib': { nombre: 'R·I·B · Investigación', seg: 900 },
    'zona-a': { nombre: 'A · Argumentar', seg: 420 },
    'zona-masc': { nombre: '+C · Contraste', seg: 300 },
    'zona-contamos': { nombre: 'Contamos', seg: 180 }
  };

  // Comprobar si estamos en ?vista=profesor
  const params = new URLSearchParams(window.location.search);
  if (params.get('vista') === 'profesor') {
    const vistaProfe = document.getElementById('vista-profesor');
    if (vistaProfe) vistaProfe.classList.remove('hidden');
  }

  // Temporizador visual
  setInterval(() => {
    if (segundosRestantes > 0) segundosRestantes--;
    const min = String(Math.floor(segundosRestantes / 60)).padStart(2, '0');
    const seg = String(segundosRestantes % 60).padStart(2, '0');
    const label = document.getElementById('timer-label');
    if (label) label.textContent = `⏱️ ${faseActual}: ${min}:${seg}`;
  }, 1000);

  function irAZona(idZona) {
    const el = document.getElementById(idZona);
    if (el) {
      el.classList.remove('locked');
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    document.querySelectorAll('.pill').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.target === idZona);
    });
    if (TIEMPOS_FASE[idZona]) {
      faseActual = TIEMPOS_FASE[idZona].nombre;
      segundosRestantes = TIEMPOS_FASE[idZona].seg;
    }
    guardarLocal();
  }

  // Navegación por píldoras superiores
  document.querySelectorAll('.pill').forEach((btn) => {
    btn.addEventListener('click', () => irAZona(btn.dataset.target));
  });

  // Botones de avance entre zonas
  const botonesAvance = [
    ['btn-empezar-c', 'zona-c'],
    ['btn-abrir-rib', 'zona-rib'],
    ['btn-abrir-a', 'zona-a'],
    ['btn-abrir-masc', 'zona-masc'],
    ['btn-abrir-contamos', 'zona-contamos']
  ];
  botonesAvance.forEach(([idBtn, idZona]) => {
    const b = document.getElementById(idBtn);
    if (b) b.addEventListener('click', () => irAZona(idZona));
  });

  // Configuración de grupo de 2 o 3 personas
  function actualizarTamanoGrupo(num) {
    tamanoGrupo = num;
    const btn2 = document.getElementById('btn-somos-2');
    const btn3 = document.getElementById('btn-somos-3');
    const cardB = document.getElementById('card-rol-b');
    const boxLectura3 = document.getElementById('box-lectura-3');
    const labelR = document.getElementById('label-rol-r');
    const labelI = document.getElementById('label-rol-i');

    if (num === 2) {
      btn2.classList.add('btn-primary');
      btn3.classList.remove('btn-primary');
      if (cardB) cardB.classList.add('hidden');
      if (boxLectura3) boxLectura3.classList.add('hidden');
      if (labelR) labelR.textContent = 'Analista R + mitad de B (Portavoz)';
      if (labelI) labelI.textContent = 'Rastreador I + mitad de B (Moderador/Secretario)';
    } else {
      btn3.classList.add('btn-primary');
      btn2.classList.remove('btn-primary');
      if (cardB) cardB.classList.remove('hidden');
      if (boxLectura3) boxLectura3.classList.remove('hidden');
      if (labelR) labelR.textContent = 'Analista del texto (Columna R · Portavoz)';
      if (labelI) labelI.textContent = 'Rastreador de fuentes (Columna I · Moderador)';
    }
    guardarLocal();
  }

  const b2 = document.getElementById('btn-somos-2');
  const b3 = document.getElementById('btn-somos-3');
  if (b2) b2.addEventListener('click', () => actualizarTamanoGrupo(2));
  if (b3) b3.addEventListener('click', () => actualizarTamanoGrupo(3));

  // Repartir al azar
  const btnAzar = document.getElementById('btn-azar');
  if (btnAzar) {
    btnAzar.addEventListener('click', () => {
      const inputs = ['rol-r', 'rol-i', 'rol-b']
        .slice(0, tamanoGrupo)
        .map((id) => document.getElementById(id));
      const valores = inputs.map((i) => i.value.trim()).filter(Boolean);
      if (valores.length < 2) {
        alert('Escribid primero vuestras iniciales en las casillas para sortear los roles.');
        return;
      }
      valores.sort(() => Math.random() - 0.5);
      inputs.forEach((inp, idx) => {
        inp.value = valores[idx] || '';
      });
      guardarLocal();
    });
  }

  // Conectar sesión con el backend
  const btnConectar = document.getElementById('btn-conectar');
  if (btnConectar) {
    btnConectar.addEventListener('click', async () => {
      const codigo = (document.getElementById('input-codigo').value || 'DEMO').trim().toUpperCase();
      const estado = document.getElementById('estado-conexion');
      try {
        estado.textContent = 'Conectando...';
        const res = await fetch(`/api/ia?accion=sesion&codigo=${encodeURIComponent(codigo)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.sesion) {
            document.getElementById('noticia-titular').textContent = data.sesion.titular;
            document.getElementById('noticia-entradilla').textContent = data.sesion.entradilla;
            document.getElementById('noticia-cuerpo').textContent = data.sesion.cuerpo;
            document.getElementById('noticia-enlace').textContent = data.sesion.enlace_original || '';
            estado.textContent = `✅ Conectado a la sesión ${codigo}`;
            return;
          }
        }
        estado.textContent = `✅ Sesión local ${codigo} activa`;
      } catch (e) {
        estado.textContent = `✅ Modo autónomo activo (${codigo})`;
      }
    });
  }

  // Pistas socráticas de la IA
  document.querySelectorAll('.btn-ia').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const fase = btn.dataset.fase;
      const idCampo = btn.dataset.campo;
      const campo = document.getElementById(idCampo);
      const textoAlumno = campo ? campo.value.trim() : '';
      const boxResp = document.getElementById(`ia-resp-${fase}`);

      if (!textoAlumno || textoAlumno.length < 10) {
        boxResp.textContent = '✍️ Escribid primero vuestra propia idea (al menos una frase) antes de pedir pista a la IA.';
        boxResp.classList.add('visible');
        return;
      }

      if (consultasIA >= MAX_IA) {
        boxResp.textContent = 'Habéis alcanzado el límite de 12 consultas a la IA para este grupo.';
        boxResp.classList.add('visible');
        return;
      }

      boxResp.textContent = '⏳ Pensando una pregunta socrática para ayudaros...';
      boxResp.classList.add('visible');

      try {
        const res = await fetch('/api/ia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accion: 'pista',
            fase,
            textoAlumno,
            titular: document.getElementById('noticia-titular').textContent,
            cuerpo: document.getElementById('noticia-cuerpo').textContent,
            codigo: document.getElementById('input-codigo').value,
            grupo: document.getElementById('select-grupo').value
          })
        });
        const data = await res.json();
        consultasIA++;
        document.getElementById('contador-ia').textContent = consultasIA;
        boxResp.textContent = '🤖 ' + (data.respuesta || data.error || 'Fijaos bien en quién firma la noticia y si aporta pruebas verificables.');
      } catch (err) {
        boxResp.textContent = '🤖 Pista socrática: ¿Qué pruebas concretas ofrece el texto y qué interés puede tener el enlace del final?';
      }
      guardarLocal();
    });
  });

  // Botón de Descargar PDF garantizado
  const btnPdf = document.getElementById('btn-descargar-pdf');
  if (btnPdf) {
    btnPdf.addEventListener('click', (e) => {
      e.preventDefault();
      window.print();
    });
  }

  // Guardar entrega final
  const btnEnviar = document.getElementById('btn-enviar-profe');
  if (btnEnviar) {
    btnEnviar.addEventListener('click', () => {
      guardarLocal();
      const msg = document.getElementById('mensaje-entrega');
      if (msg) msg.textContent = '✅ Organizador guardado. Ya podéis pulsar en "Descargar / Imprimir Informe en PDF".';
    });
  }

  // Crear sesión desde panel docente
  const btnCrearSesion = document.getElementById('btn-crear-sesion');
  if (btnCrearSesion) {
    btnCrearSesion.addEventListener('click', async () => {
      const pin = document.getElementById('profe-pin').value;
      const codigo = document.getElementById('profe-codigo').value.trim().toUpperCase();
      const titular = document.getElementById('profe-titular').value.trim();
      const entradilla = document.getElementById('profe-entradilla').value.trim();
      const cuerpo = document.getElementById('profe-cuerpo').value.trim();
      const enlace_original = document.getElementById('profe-enlace').value.trim();
      const estado = document.getElementById('profe-estado');

      if (!titular || !cuerpo) {
        estado.textContent = '⚠️ Rellena al menos el titular y el cuerpo de la noticia.';
        return;
      }

      document.getElementById('noticia-titular').textContent = titular;
      document.getElementById('noticia-entradilla').textContent = entradilla;
      document.getElementById('noticia-cuerpo').textContent = cuerpo;
      document.getElementById('noticia-enlace').textContent = enlace_original;

      try {
        await fetch('/api/ia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accion: 'crear_sesion', pin, codigo, titular, entradilla, cuerpo, enlace_original })
        });
        estado.textContent = `✅ Sesión ${codigo} publicada correctamente.`;
      } catch (e) {
        estado.textContent = `✅ Noticia aplicada en pantalla.`;
      }
    });
  }

  // Autoguardado local
  function guardarLocal() {
    const campos = [
      'input-codigo', 'select-grupo', 'rol-r', 'rol-i', 'rol-b',
      'select-emocion', 'select-impulso', 'texto-corazonada',
      'lectura-1', 'lectura-2', 'lectura-3', 'sintesis-lectura',
      'texto-r', 'texto-i', 'texto-b',
      'select-veredicto', 'texto-argumento', 'texto-contraste', 'texto-guion'
    ];
    const datos = { tamanoGrupo, consultasIA, valores: {} };
    campos.forEach((id) => {
      const el = document.getElementById(id);
      if (el) datos.valores[id] = el.value;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
  }

  function cargarLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const datos = JSON.parse(raw);
      if (datos.tamanoGrupo) actualizarTamanoGrupo(datos.tamanoGrupo);
      if (datos.consultasIA) {
        consultasIA = datos.consultasIA;
        document.getElementById('contador-ia').textContent = consultasIA;
      }
      if (datos.valores) {
        Object.entries(datos.valores).forEach(([id, val]) => {
          const el = document.getElementById(id);
          if (el && val !== undefined) el.value = val;
        });
      }
    } catch (e) {}
  }

  document.querySelectorAll('input, textarea, select').forEach((el) => {
    el.addEventListener('input', guardarLocal);
    el.addEventListener('change', guardarLocal);
  });

  cargarLocal();
})();
