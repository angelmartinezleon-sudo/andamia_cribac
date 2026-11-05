const btnConectar = document.getElementById('btn-conectar');
  if (btnConectar) {
    btnConectar.addEventListener('click', async () => {
      const codigo = (document.getElementById('input-codigo').value || 'DEMO').trim().toUpperCase();
      const grupo = document.getElementById('select-grupo').value;
      const estado = document.getElementById('estado-conexion');
      
      try {
        if (estado) estado.textContent = 'Conectando con la nube...';
        
        // 1. Cargar noticia de la sesión
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

        // 2. Cargar entrega previa del grupo si existe
        const resEntrega = await fetch(`/api/ia?accion=cargar_entrega&codigo=${encodeURIComponent(codigo)}&grupo=${encodeURIComponent(grupo)}`);
        if (resEntrega.ok) {
          const dataE = await resEntrega.json();
          if (dataE && dataE.entrega) {
            const e = dataE.entrega;
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
              document.getElementById('contador-ia').textContent = consultasIA;
            }
            if (estado) estado.textContent = `✅ Sesión ${codigo} conectada. ¡Formulario recuperado de la nube!`;
            return;
          }
        }
        if (estado) estado.textContent = `✅ Sesión ${codigo} conectada para ${grupo}.`;
      } catch (err) {
        if (estado) estado.textContent = `✅ Modo local activo (${codigo})`;
      }
    });
  }
