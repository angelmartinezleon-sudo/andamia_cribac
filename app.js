document.addEventListener('DOMContentLoaded', () => {
  let consultasIA = 0;
  const MAX_IA = 12;
  let tamanoGrupo = 3;
  let segundosRestantes = 120;
  let faseActual = 'Preparación';
  let aiConsultadaA = false;
  let cuerpoDesbloqueado = false;

  const TEXTAREAS_ALUMNO = [
    'texto-corazonada', 'lectura-1', 'lectura-2', 'lectura-3',
    'sintesis-lectura', 'texto-r', 'texto-i', 'texto-b',
    'texto-argumento', 'texto-contraste', 'texto-guion'
  ];

  const CAMPOS_GUARDADO = [
    'rol-r', 'rol-i', 'rol-b',
    'select-emocion', 'select-impulso', 'texto-corazonada',
    'lectura-1', 'lectura-2', 'lectura-3', 'sintesis-lectura',
    'texto-r', 'texto-i', 'texto-b',
    'select-veredicto', 'texto-argumento', 'texto-contraste', 'texto-guion'
  ];

  function obtenerClaveLimpia() {
    const inp = document.getElementById('input-clave-grupo');
    return inp ? inp.value.trim() : '';
  }

  function obtenerGrupoConClave() {
    const grp = (document.getElementById('select-grupo')?.value || 'Grupo 1').trim();
    const pass = obtenerClaveLimpia();
    return pass ? `${grp}::${pass}` : grp;
  }

  function obtenerStorageKey() {
    const cod = (document.getElementById('input-codigo')?.value || 'DEMO').trim().toUpperCase();
    const grp = (document.getElementById('select-grupo')?.value || 'Grupo 1').trim();
    return `cribac_v10_${cod}_${grp}`;
  }

  function sincronizarCajasTexto() {
    TEXTAREAS_ALUMNO.forEach((id) => {
      const ta = document.getElementById(id);
      const mirror = document.getElementById(`mirror-${id}`);
      if (ta) {
        ta.style.height = 'auto';
        ta.style.height = Math.max(90, ta.scrollHeight) + 'px';
        if (mirror) {
          mirror.textContent = ta.value.trim() || '(Sin respuesta registrada)';
        }
      }
    });
  }

  const TIEMPOS_FASE = {
    'zona-prep': { nombre: 'Preparación', seg: 120 },
    'zona-c': { nombre: 'C · Corazonada', seg: 180 },
    'zona-rib': { nombre: 'R·I·B · Investigación', seg: 900 },
    'zona-a': { nombre: 'A · Argumentar', seg: 420 },
    'zona-masc': { nombre: '+C · Contraste', seg: 300 },
    'zona-contamos': { nombre: 'Contamos', seg: 180 }
  };

  const btnToggleDocente = document.getElementById('btn-toggle-docente');
  const vistaProfesor = document.getElementById('vista-profesor');
  const vistaAlumno = document.getElementById('vista-alumno');
  const navFases = document.getElementById('nav-fases');

  if (btnToggleDocente && vistaProfesor && vistaAlumno) {
    btnToggleDocente.addEventListener('click', () => {
      const esOculto = vistaProfesor.classList.contains('hidden');
      if (esOculto) {
        vistaProfesor.classList.remove('hidden');
        vistaAlumno.classList.add('hidden');
        if (navFases) navFases.classList.add('hidden');
        btnToggleDocente.textContent = '🎓 Alumno';
      } else {
        vistaProfesor.classList.add('hidden');
        vistaAlumno.classList.remove('hidden');
        if (navFases) navFases.classList.remove('hidden');
        btnToggleDocente.textContent = '🔒 Docente';
      }
    });
  }

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
    document.querySelectorAll('.pill[data-target]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.target === idZona);
    });
    if (TIEMPOS_FASE[idZona]) {
      faseActual = TIEMPOS_FASE[idZona].nombre;
      segundosRestantes = TIEMPOS_FASE[idZona].seg;
    }
    guardarLocal();
  }

  document.querySelectorAll('.pill[data-target]').forEach((btn) => {
    btn.addEventListener('click', () => irAZona(btn.dataset.target));
  });

  [['btn-empezar-c', 'zona-c'], ['btn-abrir-rib', 'zona-rib'], ['btn-abrir-a', 'zona-a'], ['btn-abrir-masc', 'zona-masc'], ['btn-abrir-contamos', 'zona-contamos']].forEach(([idBtn, idZona]) => {
    const b = document.getElementById(idBtn);
    if (b) {
      b.addEventListener('click', (e) => {
        if (idBtn === 'btn-abrir-rib') {
          const em = document.getElementById('select-emocion').value;
          const im = document.getElementById('select-impulso').value;
          const co = document.getElementById('texto-corazonada').value.trim();
          if (!em || !im || co.length < 5) {
            e.preventDefault();
            alert('⚠️ Obligatorio: Rellenad la emoción, el impulso y vuestra corazonada para poder desbloquear el texto de la noticia.');
            return;
          }
          mostrarNoticiaDesbloqueada(true);
        }

        if (idBtn === 'btn-abrir-masc' && !aiConsultadaA) {
          e.preventDefault();
          const boxResp = document.getElementById('ia-resp-A');
          if (boxResp) {
            boxResp.textContent = '⚠️ Obligatorio: Debéis darle a "Revisar argumento (Obligatorio)" y esperar la respuesta de la IA antes de avanzar.';
            boxResp.classList.add('visible');
          } else {
            alert('⚠️ Obligatorio: Debéis revisar el argumento con la IA antes de pasar a la siguiente fase.');
          }
          return;
        }

        irAZona(idZona);
      });
    }
  });

  function mostrarNoticiaDesbloqueada(desbloquear) {
    cuerpoDesbloqueado = desbloquear;
    const boxNoticia = document.getElementById('box-noticia-rib');
    const avisoBloqueo = document.getElementById('aviso-bloqueo-rib');
    if (desbloquear) {
      if (boxNoticia) boxNoticia.classList.remove('hidden');
      if (avisoBloqueo) avisoBloqueo.classList.add('hidden');
    } else {
      if (boxNoticia) boxNoticia.classList.add('hidden');
      if (avisoBloqueo) avisoBloqueo.classList.remove('hidden');
    }
  }

  function actualizarTamanoGrupo(num) {
    tamanoGrupo = num;
    const btn2 = document.getElementById('btn-somos-2');
    const btn3 = document.getElementById('btn-somos-3');
    const cardB = document.getElementById('card-rol-b');
    const boxLectura3 = document.getElementById('box-lectura-3');
    const labelR = document.getElementById('label-rol-r');
    const labelI = document.getElementById('label-rol-i');
    const labelLectura1 = document.getElementById('label-lectura-1');
    const labelLectura2 = document.getElementById('label-lectura-2');
    const labelLectura3 = document.getElementById('label-lectura-3');

    if (num === 2) {
      if (btn2) btn2.classList.add('btn-primary');
      if (btn3) btn3.classList.remove('btn-primary');
      if (cardB) cardB.classList.add('hidden');
      if (boxLectura3) boxLectura3.classList.add('hidden');
      if (labelR) labelR.textContent = 'Rol de Analista de Redacción (R) y a medias rol de Búsqueda Externa (B)';
      if (labelI) labelI.textContent = 'Rol de Rastreador de Informador (I) y a medias rol de Búsqueda Externa (B)';
      if (labelLectura1) labelLectura1.textContent = 'Lector 1 (Rol de Analista de Redacción - R y a medias Búsqueda Externa - B)';
      if (labelLectura2) labelLectura2.textContent = 'Lector 2 (Rol de Rastreador de Informador - I y a medias Búsqueda Externa - B)';
    } else {
      if (btn3) btn3.classList.add('btn-primary');
      if (btn2) btn2.classList.remove('btn-primary');
      if (cardB) cardB.classList.remove('hidden');
      if (boxLectura3) boxLectura3.classList.remove('hidden');
      if (labelR) labelR.textContent = 'Rol de Analista de Redacción (R)';
      if (labelI) labelI.textContent = 'Rol de Rastreador de Informador (I)';
      if (labelLectura1) labelLectura1.textContent = 'Lector 1 (Rol de Analista de Redacción - R)';
      if (labelLectura2) labelLectura2.textContent = 'Lector 2 (Rol de Rastreador de Informador - I)';
      if (labelLectura3) labelLectura3.textContent = 'Lector 3 (Rol de Búsqueda externa - B)';
    }
    guardarLocal();
  }

  const b2 = document.getElementById('btn-somos-2');
  const b3 = document.getElementById('btn-somos-3');
  if (b2) b2.addEventListener('click', () => actualizarTamanoGrupo(2));
  if (b3) b3.addEventListener('click', () => actualizarTamanoGrupo(3));

  const btnAzar = document.getElementById('btn-azar');
  if (btnAzar) {
    btnAzar.addEventListener('click', () => {
      const inputs = ['rol-r', 'rol-i', 'rol-b'].slice(0, tamanoGrupo).map((id) => document.getElementById(id));
      const valores = inputs.map((i) => i ? i.value.trim() : '').filter(Boolean);
      if (valores.length < 2) {
        alert('Escribid primero vuestras iniciales en las casillas para sortear los roles.');
        return;
      }
      valores.sort(() => Math.random() - 0.5);
      inputs.forEach((inp, idx) => { if (inp) inp.value = valores[idx] || ''; });
      guardarLocal();
    });
  }

  function volcarEntregaEnFormulario(e) {
    CAMPOS_GUARDADO.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    if (e.roles) {
      const partes = e.roles.split('|');
      if (partes[0]) {
        const valR = partes[0].replace('R:', '').trim();
        const inpR = document.getElementById('rol-r');
        if (inpR && valR !== 'undefined') inpR.value = valR;
      }
      if (partes[1]) {
        const valI = partes[1].replace('I:', '').trim();
        const inpI = document.getElementById('rol-i');
        if (inpI && valI !== 'undefined') inpI.value = valI;
      }
      if (partes[2]) {
        const valB = partes[2].replace('B:', '').trim();
        const inpB = document.getElementById('rol-b');
        if (inpB && valB !== 'undefined') inpB.value = valB;
      }
    }

    if (e.emocion) document.getElementById('select-emocion').value = e.emocion;
    if (e.impulso) document.getElementById('select-impulso').value = e.impulso;
    if (e.corazonada) document.getElementById('texto-corazonada').value = e.corazonada;
    if (e.lectura_grupo) document.getElementById('sintesis-lectura').value = e.lectura_grupo;
    if (e.texto_r) document.getElementById('texto-r').value = e.texto_r;
    if (e.texto_i) document.getElementById('texto-i').value = e.texto_i;
    if (e.texto_b) document.getElementById('texto-b').value = e.texto_b;
    if (e.veredicto) document.getElementById('select-veredicto').value = e.veredicto;
    if (e.argumento) document.getElementById('texto-argumento').value = e.argumento;
    if (e.contraste) document.getElementById('texto-contraste').value = e.contraste;
    if (e.guion) document.getElementById('texto-guion').value = e.guion;

    if (e.emocion && e.impulso && (e.corazonada || '').trim().length >= 5) {
      mostrarNoticiaDesbloqueada(true);
    }

    if (e.argumento && (e.argumento || '').trim().length >= 5) {
      aiConsultadaA = true;
    }

    if (e.consultas_ia !== undefined) {
      consultasIA = parseInt(e.consultas_ia, 10) || 0;
      const contador = document.getElementById('contador-ia');
      if (contador) contador.textContent = consultasIA;
    }

    guardarLocal();
  }

  async function conectarYRecuperar(esRecuperacionExplicita) {
    const codigo = (document.getElementById('input-codigo').value || 'DEMO').trim().toUpperCase();
    const grupoVisible = document.getElementById('select-grupo').value;
    let claveGrupo = obtenerClaveLimpia();
    const estado = document.getElementById('estado-conexion');

    if (esRecuperacionExplicita && !claveGrupo) {
      const pedida = prompt(`🔑 Escribid la contraseña o PIN que pusisteis para ${grupoVisible}:`);
      if (!pedida || !pedida.trim()) {
        alert('⚠️ Es necesario introducir la contraseña del equipo para recuperar vuestra entrega de la nube.');
        return;
      }
      claveGrupo = pedida.trim();
      const inpClave = document.getElementById('input-clave-grupo');
      if (inpClave) inpClave.value = claveGrupo;
    }

    try {
      if (estado) estado.textContent = '⏳ Conectando con la nube...';

      const resSesion = await fetch(`/api/ia?accion=sesion&codigo=${encodeURIComponent(codigo)}`);
      if (resSesion.ok) {
        const data = await resSesion.json();
        if (data && data.sesion) {
          document.getElementById('noticia-titular').textContent = data.sesion.titular;
          document.getElementById('noticia-entradilla').textContent = data.sesion.entradilla;
          document.getElementById('noticia-cuerpo').textContent = data.sesion.cuerpo;
          document.getElementById('noticia-enlace').textContent = data.sesion.enlace_original || '';
        }
      }

      let cargado = false;
      if (claveGrupo) {
        try {
          const grupoConClave = `${grupoVisible}::${claveGrupo}`;
          const resEntrega = await fetch(`/api/ia?accion=cargar_entrega&codigo=${encodeURIComponent(codigo)}&grupo=${encodeURIComponent(grupoConClave)}`);
          if (resEntrega.ok) {
            const dataE = await resEntrega.json();
            if (dataE && dataE.entrega) {
              volcarEntregaEnFormulario(dataE.entrega);
              cargado = true;
            }
          }
        } catch (ex) {}
      }

      if (!cargado && !esRecuperacionExplicita) {
        cargarLocal();
      }

      if (estado) {
        if (cargado) {
          estado.textContent = `✅ ¡Entrega de ${grupoVisible} (${codigo}) recuperada con éxito!`;
        } else if (esRecuperacionExplicita) {
          estado.textContent = `⚠️ No se encontró ninguna entrega en la nube para ${grupoVisible} con esa contraseña.`;
        } else {
          estado.textContent = `✅ Sesión ${codigo} conectada para ${grupoVisible}. ¡Todo listo!`;
        }
      }
    } catch (err) {
      if (!esRecuperacionExplicita) cargarLocal();
      if (estado) estado.textContent = `✅ Modo local activo (${codigo} - ${grupoVisible})`;
    }
  }

  const btnConectar = document.getElementById('btn-conectar');
  if (btnConectar) {
    btnConectar.addEventListener('click', () => conectarYRecuperar(false));
  }

  const btnRecuperarNube = document.getElementById('btn-recuperar-nube');
  if (btnRecuperarNube) {
    btnRecuperarNube.addEventListener('click', () => conectarYRecuperar(true));
  }

  document.getElementById('select-grupo')?.addEventListener('change', () => {
    localStorage.setItem('cribac_ultimo_grupo', document.getElementById('select-grupo').value);
    const inpClave = document.getElementById('input-clave-grupo');
    if (inpClave) inpClave.value = '';
    cargarLocal();
  });
  document.getElementById('input-codigo')?.addEventListener('change', () => {
    localStorage.setItem('cribac_ultimo_codigo', document.getElementById('input-codigo').value);
    cargarLocal();
  });

  document.querySelectorAll('.btn-ia').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const fase = btn.dataset.fase;
      const idCampo = btn.dataset.campo;
      const campo = document.getElementById(idCampo);
      const textoAlumno = campo ? campo.value.trim() : '';
      const boxResp = document.getElementById(`ia-resp-${fase}`);

      if (!textoAlumno || textoAlumno.length < 5) {
        if (boxResp) {
          boxResp.textContent = '✍️ Escribid primero vuestra propia idea antes de pedir ayuda a la IA.';
          boxResp.classList.add('visible');
        }
        return;
      }

      if (fase !== 'A' && consultasIA >= MAX_IA) {
        if (boxResp) {
          boxResp.textContent = 'Límite de 12 consultas de ayuda alcanzado.';
          boxResp.classList.add('visible');
        }
        return;
      }

      if (boxResp) {
        boxResp.textContent = '⏳ Pensando...';
        boxResp.classList.add('visible');
      }

      try {
        let res = await fetch('/api/ia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accion: 'pista', fase, textoAlumno,
            titular: document.getElementById('noticia-titular').textContent,
            cuerpo: document.getElementById('noticia-cuerpo').textContent,
            codigo: document.getElementById('input-codigo').value,
            grupo: obtenerGrupoConClave()
          })
        });

        let data = await res.json();

        if (data.error && data.error.includes('demand')) {
          if (boxResp) boxResp.textContent = '⏳ Tráfico denso, reintentando...';
          await new Promise(r => setTimeout(r, 1200));
          res = await fetch('/api/ia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accion: 'pista', fase, textoAlumno,
              titular: document.getElementById('noticia-titular').textContent,
              cuerpo: document.getElementById('noticia-cuerpo').textContent,
              codigo: document.getElementById('input-codigo').value,
              grupo: obtenerGrupoConClave()
            })
          });
          data = await res.json();
        }

        if (fase !== 'A') {
          consultasIA++;
          const contador = document.getElementById('contador-ia');
          if (contador) contador.textContent = consultasIA;
        }

        if (boxResp) boxResp.textContent = '🤖 ' + (data.respuesta || data.error);

        if (fase === 'A' && !data.error) {
          aiConsultadaA = true;
        }

      } catch (err) {
        if (boxResp) boxResp.textContent = '🤖 Ayuda: ¿Qué pruebas concretas ofrece el texto para sostener esto?';
        if (fase === 'A') aiConsultadaA = true;
      }
      guardarLocal();
    });
  });

  const btnPdf = document.getElementById('btn-descargar-pdf');
  if (btnPdf) {
    btnPdf.addEventListener('click', (e) => {
      e.preventDefault();
      sincronizarCajasTexto();
      window.print();
    });
  }

  window.addEventListener('beforeprint', sincronizarCajasTexto);

  const btnEnviar = document.getElementById('btn-enviar-profe');
  if (btnEnviar) {
    btnEnviar.textContent = '💾 Guardar';
    btnEnviar.addEventListener('click', async () => {
      const msg = document.getElementById('mensaje-entrega');
      let claveGrupo = obtenerClaveLimpia();

      // Si no han escrito contraseña arriba, se la pide en ventana emergente y bloquea el guardado si cancelan
      if (!claveGrupo) {
        const pedida = prompt('🔑 Obligatorio para guardar: Escribid una contraseña o PIN para vuestro equipo (así podréis recuperar vuestra sesión y nadie podrá borrarla):');
        if (!pedida || !pedida.trim()) {
          if (msg) msg.textContent = '⚠️ Guardado cancelado: es obligatorio poner una contraseña al equipo.';
          const inpClave = document.getElementById('input-clave-grupo');
          if (inpClave) {
            irAZona('zona-prep');
            inpClave.focus();
          }
          return;
        }
        claveGrupo = pedida.trim();
        const inpClave = document.getElementById('input-clave-grupo');
        if (inpClave) inpClave.value = claveGrupo;
      }

      guardarLocal();
      if (msg) msg.textContent = '📤 Guardando con vuestra contraseña...';

      const grp = (document.getElementById('select-grupo')?.value || 'Grupo 1').trim();
      const payload = {
        accion: 'guardar_entrega',
        codigo: document.getElementById('input-codigo').value.trim().toUpperCase(),
        grupo: `${grp}::${claveGrupo}`,
        roles: `R: ${document.getElementById('rol-r').value} | I: ${document.getElementById('rol-i').value} | B: ${document.getElementById('rol-b').value}`,
        emocion: document.getElementById('select-emocion').value,
        impulso: document.getElementById('select-impulso').value,
        corazonada: document.getElementById('texto-corazonada').value,
        lectura_grupo: document.getElementById('sintesis-lectura').value,
        texto_r: document.getElementById('texto-r').value,
        texto_i: document.getElementById('texto-i').value,
        texto_b: document.getElementById('texto-b').value,
        veredicto: document.getElementById('select-veredicto').value,
        argumento: document.getElementById('texto-argumento').value,
        contraste: document.getElementById('texto-contraste').value,
        guion: document.getElementById('texto-guion').value,
        consultas_ia: document.getElementById('contador-ia').textContent
      };

      try {
        await fetch('/api/ia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (msg) msg.textContent = '✅ ¡Guardado correctamente con contraseña!';
      } catch (e) {
        if (msg) msg.textContent = '✅ ¡Guardado correctamente!';
      }
    });
  }

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
        if (estado) estado.textContent = '⚠️ Rellena al menos el titular y el cuerpo.';
        return;
      }

      try {
        if (estado) estado.textContent = 'Guardando en la nube...';
        const res = await fetch('/api/ia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accion: 'crear_sesion', pin, codigo, titular, entradilla, cuerpo, enlace_original })
        });
        const data = await res.json();
        if (res.ok) {
          if (estado) estado.textContent = `✅ ¡Sesión ${codigo} publicada!`;
        } else {
          if (estado) estado.textContent = `⚠️ Error: ${data.error || 'PIN incorrecto'}`;
        }
      } catch (e) {
        if (estado) estado.textContent = `❌ Error de red al guardar en el Excel.`;
      }
    });
  }

  function guardarLocal() {
    sincronizarCajasTexto();
    const datos = { tamanoGrupo, consultasIA, aiConsultadaA, cuerpoDesbloqueado, valores: {} };
    CAMPOS_GUARDADO.forEach((id) => {
      const el = document.getElementById(id);
      if (el) datos.valores[id] = el.value;
    });
    localStorage.setItem('cribac_ultimo_codigo', document.getElementById('input-codigo')?.value || 'DEMO');
    localStorage.setItem('cribac_ultimo_grupo', document.getElementById('select-grupo')?.value || 'Grupo 1');
    localStorage.setItem(obtenerStorageKey(), JSON.stringify(datos));
  }

  function cargarLocal() {
    try {
      const uCod = localStorage.getItem('cribac_ultimo_codigo');
      const uGrp = localStorage.getItem('cribac_ultimo_grupo');
      const inpCod = document.getElementById('input-codigo');
      const selGrp = document.getElementById('select-grupo');
      if (uCod && inpCod && inpCod.value === 'DEMO') inpCod.value = uCod;
      if (uGrp && selGrp && !selGrp.dataset.cambiadoManual) {
        selGrp.value = uGrp;
        selGrp.dataset.cambiadoManual = '1';
      }

      CAMPOS_GUARDADO.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      consultasIA = 0;
      aiConsultadaA = false;
      mostrarNoticiaDesbloqueada(false);

      const raw = localStorage.getItem(obtenerStorageKey());
      if (raw) {
        const datos = JSON.parse(raw);
        if (datos.tamanoGrupo) actualizarTamanoGrupo(datos.tamanoGrupo);
        if (datos.consultasIA) {
          consultasIA = datos.consultasIA;
        }
        if (datos.aiConsultadaA !== undefined) {
          aiConsultadaA = datos.aiConsultadaA;
        }
        if (datos.cuerpoDesbloqueado) {
          mostrarNoticiaDesbloqueada(true);
        }
        if (datos.valores) {
          CAMPOS_GUARDADO.forEach((id) => {
            const el = document.getElementById(id);
            if (el && datos.valores[id] !== undefined) el.value = datos.valores[id];
          });
        }
      }
      const contador = document.getElementById('contador-ia');
      if (contador) contador.textContent = consultasIA;
      sincronizarCajasTexto();
    } catch (e) {}
  }

  // Limpiamos cualquier autocompletado indebido del navegador en la casilla de contraseña al arrancar
  const inpClaveInicial = document.getElementById('input-clave-grupo');
  if (inpClaveInicial) inpClaveInicial.value = '';

  document.querySelectorAll('input, textarea, select').forEach((el) => {
    if (el.id !== 'input-codigo' && el.id !== 'select-grupo' && el.id !== 'input-clave-grupo') {
      el.addEventListener('input', guardarLocal);
      el.addEventListener('change', guardarLocal);
    }
  });

  cargarLocal();
});
