document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'cribac_estado_v7';
  let consultasIA = 0;
  const MAX_IA = 12;
  let tamanoGrupo = 3;
  let segundosRestantes = 120;
  let faseActual = 'Preparación';
  let aiConsultadaA = false; 
  let cuerpoDesbloqueado = false; // <-- Nueva variable para controlar la noticia

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

  // Control estricto para avanzar de fases y desbloquear la noticia
  [['btn-empezar-c', 'zona-c'], ['btn-abrir-rib', 'zona-rib'], ['btn-abrir-a', 'zona-a'], ['btn-abrir-masc', 'zona-masc'], ['btn-abrir-contamos', 'zona-contamos']].forEach(([idBtn, idZona]) => {
    const b = document.getElementById(idBtn);
    if (b) {
      b.addEventListener('click', (e) => {
        
        // 1. Bloqueo de R·I·B (Obliga a rellenar Corazonada)
        if (idBtn === 'btn-abrir-rib') {
          const em = document.getElementById('select-emocion').value;
          const im = document.getElementById('select-impulso').value;
          const co = document.getElementById('texto-corazonada').value.trim();
          if (!em || !im || co.length < 5) {
            e.preventDefault();
            alert('⚠️ Obligatorio: Rellenad la emoción, el impulso y vuestra corazonada para poder desbloquear el texto de la noticia.');
            return;
          }
          // Si pasa, desbloqueamos la noticia
          cuerpoDesbloqueado = true;
          const boxNoticia = document.getElementById('box-noticia-rib');
          const avisoBloqueo = document.getElementById('aviso-bloqueo-rib');
          if (boxNoticia) boxNoticia.classList.remove('hidden');
          if (avisoBloqueo) avisoBloqueo.classList.add('hidden');
        }

        // 2. Bloqueo de MASC (Obliga a pedir IA en Argumento)
        if (idBtn === 'btn-abrir-masc' && !aiConsultadaA) {
          e.preventDefault();
          const boxResp = document.getElementById('ia-resp-A');
          if(boxResp) {
            boxResp.textContent = '⚠️ Obligatorio: Debéis darle a "Revisar argumento" y esperar la respuesta de la IA antes de avanzar.';
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

  function actualizarTamanoGrupo(num) {
    tamanoGrupo = num;
    const btn2 = document.getElementById('btn-somos-2');
    const btn3 = document.getElementById('btn-somos-3');
    const cardB = document.getElementById('card-rol-b');
    const boxLectura3 = document.getElementById('box-lectura-3');
    const labelR = document.getElementById('label-rol-r');
    const labelI = document.getElementById('label-rol-i');

    if (num === 2) {
      if (btn2) btn2.classList.add('btn-primary');
      if (btn3) btn3.classList.remove('btn-primary');
      if (cardB) cardB.classList.add('hidden');
      if (boxLectura3) boxLectura3.classList.add('hidden');
      if (labelR) labelR.textContent = 'Analista R + mitad B (Portavoz)';
      if (labelI) labelI.textContent = 'Rastreador I + mitad B (Moderador)';
    } else {
      if (btn3) btn3.classList.add('btn-primary');
      if (btn2) btn2.classList.remove('btn-primary');
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

  const btnConectar = document.getElementById('btn-conectar');
  if (btnConectar) {
    btnConectar.addEventListener('click', async () => {
      const codigo = (document.getElementById('input-codigo').value || 'DEMO').trim().toUpperCase();
      const grupo = document.getElementById('select-grupo').value;
      const estado = document.getElementById('estado-conexion');
      
      try {
        if (estado) estado.textContent = 'Conectando con la nube...';
        
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
        try {
          const resEntrega = await fetch(`/api/ia?accion=cargar_entrega&codigo=${encodeURIComponent(codigo)}&grupo=${encodeURIComponent(grupo)}`);
          if (resEntrega.ok) {
            const dataE = await resEntrega.json();
            if (dataE && dataE.entrega) {
              const e = dataE.entrega;
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
              
              if (e.consultas_ia) {
                consultasIA = parseInt(e.consultas_ia) || 0;
                const contador = document.getElementById('contador-ia');
                if (contador) contador.textContent = consultasIA;
              }
              cargado = true;
            }
          }
        } catch (ex) {}

        if (!cargado) cargarLocal();
        if (estado) estado.textContent = `✅ Sesión ${codigo} conectada para ${grupo}. ¡Todo listo!`;
      } catch (err) {
        cargarLocal();
        if (estado) estado.textContent = `✅ Modo local activo (${codigo})`;
      }
    });
  }

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
      if (consultasIA >= MAX_IA) {
        if (boxResp) {
          boxResp.textContent = 'Límite de 12 consultas alcanzado.';
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
            grupo: document.getElementById('select-grupo').value
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
              grupo: document.getElementById('select-grupo').value
            })
          });
          data = await res.json();
        }

        consultasIA++;
        const contador = document.getElementById('contador-ia');
        if (contador) contador.textContent = consultasIA;
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
      window.print();
    });
  }

  const btnEnviar = document.getElementById('btn-enviar-profe');
  if (btnEnviar) {
    btnEnviar.textContent = '💾 Guardar';
    btnEnviar.addEventListener('click', async () => {
      guardarLocal();
      const msg = document.getElementById('mensaje-entrega');
      if (msg) msg.textContent = '📤 Guardando...';

      const payload = {
        accion: 'guardar_entrega',
        codigo: document.getElementById('input-codigo').value,
        grupo: document.getElementById('select-grupo').value,
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
        if (msg) msg.textContent = '✅ ¡Guardado correctamente!';
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
    const campos = [
      'input-codigo', 'select-grupo', 'rol-r', 'rol-i', 'rol-b',
      'select-emocion', 'select-impulso', 'texto-corazonada',
      'lectura-1', 'lectura-2', 'lectura-3', 'sintesis-lectura',
      'texto-r', 'texto-i', 'texto-b',
      'select-veredicto', 'texto-argumento', 'texto-contraste', 'texto-guion'
    ];
    // ¡Añadida la variable del cuerpo bloqueado a los datos guardados!
    const datos = { tamanoGrupo, consultasIA, aiConsultadaA, cuerpoDesbloqueado, valores: {} };
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
        const contador = document.getElementById('contador-ia');
        if (contador) contador.textContent = consultasIA;
      }
      if (datos.aiConsultadaA !== undefined) {
        aiConsultadaA = datos.aiConsultadaA;
      }
      
      // Si la noticia ya estaba desbloqueada antes de recargar la página, se la mostramos
      if (datos.cuerpoDesbloqueado) {
        cuerpoDesbloqueado = true;
        const boxNoticia = document.getElementById('box-noticia-rib');
        const avisoBloqueo = document.getElementById('aviso-bloqueo-rib');
        if (boxNoticia) boxNoticia.classList.remove('hidden');
        if (avisoBloqueo) avisoBloqueo.classList.add('hidden');
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
});
