import { PROMPTS, rellenarPlantilla } from './prompts.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sheetsUrl = process.env.GOOGLE_SHEETS_URL;

  // 1. GET: Consultar o sincronizar sesión de profesor desde Google Sheets
  if (req.method === 'GET') {
    const { accion, codigo } = req.query;
    if (accion === 'sesion' && codigo) {
      if (!sheetsUrl) {
        return res.status(200).json({ sesion: null, mensaje: 'Google Sheets no configurado' });
      }
      try {
        const response = await fetch(`${sheetsUrl}?codigo=${encodeURIComponent(codigo)}`);
        const data = await response.json();
        return res.status(200).json(data);
      } catch (err) {
        return res.status(500).json({ error: 'Error al conectar con la base de datos' });
      }
    }
    return res.status(400).json({ error: 'Acción no válida' });
  }

  // 2. POST: IA socrática, guardar sesión o guardar entrega final en Sheets
  if (req.method === 'POST') {
    const body = req.body || {};
    const { accion, pin, codigo, titular, entradilla, cuerpo, enlace_original } = body;

    // Guardar sesión desde el panel docente
    if (accion === 'crear_sesion') {
      const pinProfe = process.env.PIN_PROFESOR || '1234';
      if (pin !== pinProfe) {
        return res.status(401).json({ error: 'PIN de profesor incorrecto.' });
      }
      if (sheetsUrl) {
        try {
          await fetch(sheetsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accion: 'crear_sesion', codigo, titular, entradilla, cuerpo, enlace_original })
          });
        } catch (e) {
          console.error('Error guardando en Sheets:', e);
        }
      }
      return res.status(200).json({ status: 'ok', mensaje: 'Sesión guardada en base de datos' });
    }

    // Guardar entrega final del grupo en Sheets
    if (accion === 'guardar_entrega') {
      if (sheetsUrl) {
        try {
          await fetch(sheetsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accion: 'guardar_entrega', ...body })
          });
        } catch (e) {
          console.error('Error guardando entrega:', e);
        }
      }
      return res.status(200).json({ status: 'ok' });
    }

    // Peticiones de Pistas Socráticas a la IA (Gemini)
    const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase().trim();
    const apiKey = process.env.AI_API_KEY;
    const modelName = process.env.AI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) {
      return res.status(500).json({ error: 'Falta configurar la variable AI_API_KEY en Vercel.' });
    }

    const { fase, textoAlumno, cuerpo: cuerpoNoticia, titular: titNoticia } = body;
    const promptSistema = PROMPTS[fase] || PROMPTS.DEFAULT;
    const promptFinal = rellenarPlantilla(promptSistema, {
      titular: titNoticia || 'Noticia analizada',
      cuerpo: cuerpoNoticia || '',
      textoAlumno: textoAlumno || ''
    });

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptFinal }] }]
        })
      });

      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return res.status(200).json({ respuesta: data.candidates[0].content.parts[0].text });
      } else {
        throw new Error(data.error?.message || 'Respuesta inválida de Gemini');
      }
    } catch (error) {
      return res.status(500).json({ error: 'Error comunicando con la IA: ' + error.message });
    }
  }

  return res.status(405).end();
}
