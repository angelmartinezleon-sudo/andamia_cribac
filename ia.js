/**
 * CRIBA+C - Backend Serverless en Vercel (IA Multi-proveedor + Moderación)
 */
import { PROMPTS, rellenarPlantilla } from './prompts.js';

const memoriaSesiones = {
  'DEMO': {
    codigo: 'DEMO',
    fecha: new Date().toLocaleDateString('es-ES'),
    titular: 'Un estudio afirma que escuchar música a doble velocidad mejora un 40 % las notas en Secundaria',
    entradilla: 'Una publicación viral asegura que el cerebro adolescente procesa mejor los apuntes tras entrenar el oído con audios acelerados a 2x.',
    cuerpo: 'Redacción (14 de marzo). Según circula desde ayer en varias cuentas de redes sociales y en el portal viral AulaExpress, escuchar canciones y pódcast al doble de velocidad (2x) durante veinte minutos al día incrementa un 40 % el rendimiento en los exámenes de 3.º y 4.º de ESO. El texto menciona un supuesto informe del "Instituto Europeo de Neuroaprendizaje Rápido", pero no incluye ningún enlace al documento científico ni especifica en qué institutos se realizó la prueba. Aun así, miles de usuarios lo han compartido recomendando probarlo antes de los exámenes trimestrales.',
    url_imagen: '',
    enlace_original: 'https://ejemplo-noticias-aula.es/musica-doble-velocidad-notas',
    minutos_por_momento: { prep: 2, c: 3, rib: 15, a: 7, masC: 5, contamos: 3 },
    activa: true
  }
};
const memoriaProgreso = {};
const memoriaOrganizadores = [];
const conteoPeticionesGrupo = {};

async function llamarAdaptadorIA(promptSistema, mensajeUsuario) {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase().trim();
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    throw new Error('Falta configurar la variable AI_API_KEY en Vercel.');
  }

  // 1. GEMINI
  if (provider === 'gemini') {
    const model = process.env.AI_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: promptSistema }] },
        contents: [{ role: 'user', parts: [{ text: mensajeUsuario }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 250,
          thinkingConfig: { thinkingBudget: 0 }
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' }
        ]
      })
    });

    const data = await res.json();
    if (data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason === 'SAFETY') {
      return { bloqueado: true };
    }
    if (!res.ok) {
      throw new Error(data.error?.message || 'Error en la API de Gemini');
    }

    const partes = data.candidates?.[0]?.content?.parts || [];
    const texto = partes.filter(p => !p.thought && typeof p.text === 'string').map(p => p.text).join(' ').trim();
    return { bloqueado: false, texto: texto || 'Revisad vuestras casillas en equipo.' };
  }

  // 2. OPENAI
  if (provider === 'openai') {
    const modRes = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ input: mensajeUsuario })
    });
    if (modRes.ok) {
      const modData = await modRes.json();
      if (modData.results?.[0]?.flagged) return { bloqueado: true };
    }

    const model = process.env.AI_MODEL || 'gpt-4o-mini';
    const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: promptSistema }, { role: 'user', content: mensajeUsuario }],
        max_tokens: 250,
        temperature: 0.3
      })
    });
    const chatData = await chatRes.json();
    if (!chatRes.ok) throw new Error(chatData.error?.message || 'Error en OpenAI');
    return { bloqueado: false, texto: (chatData.choices?.[0]?.message?.content || '').trim() };
  }

  // 3. ANTHROPIC
  if (provider === 'anthropic') {
    const model = process.env.AI_MODEL || 'claude-3-5-haiku-latest';
    const antRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        system: promptSistema,
        messages: [{ role: 'user', content: mensajeUsuario }],
        max_tokens: 250,
        temperature: 0.3
      })
    });
    const antData = await antRes.json();
    if (!antRes.ok) throw new Error(antData.error?.message || 'Error en Anthropic');
    return { bloqueado: false, texto: (antData.content?.[0]?.text || '').trim() };
  }

  throw new Error(`Proveedor AI_PROVIDER no reconocido: ${provider}`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  try {
    const { operacion, payload } = req.body || {};

    // Verificación PIN profesor
    if (operacion === 'verificarPin') {
      const pinCorrecto = process.env.PIN_PROFESOR || '1234';
      const valido = String(payload?.pin || '').trim() === String(pinCorrecto).trim();
      return res.status(200).json({ ok: valido });
    }

    // Crear sesión (Profesor)
    if (operacion === 'crearSesion') {
      const pinCorrecto = process.env.PIN_PROFESOR || '1234';
      if (String(payload?.pin || '').trim() !== String(pinCorrecto).trim()) {
        return res.status(403).json({ ok: false, error: 'PIN incorrecto' });
      }

      const letras = 'ABCDEFGHJKMNPQRSTUVWXYZ';
      let codigo = '';
      for (let i = 0; i < 4; i++) {
        codigo += letras.charAt(Math.floor(Math.random() * letras.length));
      }

      const nueva = {
        codigo,
        fecha: new Date().toLocaleDateString('es-ES'),
        titular: payload.titular,
        entradilla: payload.entradilla || '',
        cuerpo: payload.cuerpo,
        url_imagen: payload.url_imagen || '',
        enlace_original: payload.enlace_original,
        minutos_por_momento: payload.minutos_por_momento || { prep: 2, c: 3, rib: 15, a: 7, masC: 5, contamos: 3 },
        activa: true
      };

      memoriaSesiones[codigo] = nueva;
      return res.status(200).json({ ok: true, sesion: nueva });
    }

    // Entrar a sesión (Alumno)
    if (operacion === 'entrarSesion') {
      const codigo = String(payload?.codigo || '').toUpperCase().trim();
      const ses = memoriaSesiones[codigo];
      if (!ses) {
        return res.status(404).json({ ok: false, error: 'Código de sesión no encontrado. Comprobad con el profesor.' });
      }
      return res.status(200).json({ ok: true, sesion: ses });
    }

    // Guardar progreso y organizador en vivo
    if (operacion === 'guardarProgreso') {
      const { codigo, grupo, tamano_grupo, iniciales, momento_actual, pistas_totales, organizador } = payload;
      const clave = `${codigo}_${grupo}`;

      memoriaProgreso[clave] = {
        codigo,
        grupo,
        tamano_grupo,
        iniciales: typeof iniciales === 'object' ? Object.values(iniciales).join(' · ') : iniciales,
        momento_actual,
        pistas_totales: pistas_totales || 0,
        ultima_actualizacion: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      };

      if (organizador && momento_actual === 'Terminado') {
        memoriaOrganizadores.unshift(organizador);
      }
      return res.status(200).json({ ok: true });
    }

    // Panel docente
    if (operacion === 'panelProfesor') {
      const pinCorrecto = process.env.PIN_PROFESOR || '1234';
      if (String(payload?.pin || '').trim() !== String(pinCorrecto).trim()) {
        return res.status(403).json({ ok: false, error: 'PIN incorrecto' });
      }
      return res.status(200).json({
        ok: true,
        progreso: Object.values(memoriaProgreso),
        organizadores: memoriaOrganizadores
      });
    }

    // Vaciar datos
    if (operacion === 'vaciarDatos') {
      const pinCorrecto = process.env.PIN_PROFESOR || '1234';
      if (String(payload?.pin || '').trim() !== String(pinCorrecto).trim()) {
        return res.status(403).json({ ok: false, error: 'PIN incorrecto' });
      }
      Object.keys(memoriaProgreso).forEach(k => delete memoriaProgreso[k]);
      memoriaOrganizadores.length = 0;
      Object.keys(conteoPeticionesGrupo).forEach(k => delete conteoPeticionesGrupo[k]);
      return res.status(200).json({ ok: true });
    }

    // Consultar IA (con límite de 12 peticiones)
    if (operacion === 'consultarIA') {
      const { codigo, grupo, tamano, titular, cuerpo, momento, tipo_peticion, variables } = payload;
      const claveGrupo = `${String(codigo).toUpperCase()}_${grupo}`;

      if (momento !== 'INFORME') {
        const usadas = conteoPeticionesGrupo[claveGrupo] || 0;
        if (usadas >= 12) {
          return res.status(200).json({
            ok: false,
            texto: 'Habéis alcanzado el límite máximo de 12 consultas a la IA en esta sesión.'
          });
        }
        conteoPeticionesGrupo[claveGrupo] = usadas + 1;
      }

      const bloqueComun = rellenarPlantilla(PROMPTS.BLOQUE_COMUN, {
        tamano: tamano || 3,
        titular: titular || '',
        cuerpo: cuerpo || ''
      });

      let plantillaCol = '';
      if (momento === 'R') plantillaCol = PROMPTS.COLUMNA_R;
      else if (momento === 'I') plantillaCol = PROMPTS.COLUMNA_I;
      else if (momento === 'B') plantillaCol = PROMPTS.COLUMNA_B;
      else if (momento === 'CONTRASTE') plantillaCol = PROMPTS.CONTRASTE;
      else if (momento === 'INFORME') plantillaCol = PROMPTS.INFORME;

      const promptEspecifico = rellenarPlantilla(plantillaCol, variables || {});
      const promptSistema = `${bloqueComun}\n\n${promptEspecifico}`;
      const mensajeUsuario = JSON.stringify(variables || {});

      const respuestaIA = await llamarAdaptadorIA(promptSistema, mensajeUsuario);

      if (respuestaIA.bloqueado) {
        return res.status(200).json({
          ok: true,
          texto: 'Este mensaje no se puede enviar. Avisad al profesor'
        });
      }

      return res.status(200).json({ ok: true, texto: respuestaIA.texto });
    }

    return res.status(400).json({ ok: false, error: 'Operación no válida' });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      texto: 'La IA no responde. Seguid sin ella y avisad al profesor'
    });
  }
}