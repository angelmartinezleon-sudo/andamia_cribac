const btnEnviar = document.getElementById('btn-enviar-profe');
  if (btnEnviar) {
    btnEnviar.addEventListener('click', async () => {
      guardarLocal();
      const msg = document.getElementById('mensaje-entrega');
      if (msg) msg.textContent = '📤 Guardando entrega en la base de datos...';

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
        if (msg) msg.textContent = '✅ ¡Entregado y guardado en el Excel del profesor! Ya podéis pulsar en "Descargar PDF".';
      } catch (e) {
        if (msg) msg.textContent = '✅ Guardado localmente. Ya podéis descargar vuestro PDF.';
      }
    });
  }
