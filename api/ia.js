import { PROMPTS, rellenarPlantilla } from './prompts.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const sheetsUrl = process.env.GOOGLE_SHEETS_URL;

  if (req.method === 'GET') {
    const { accion, codigo, grupo } = req.query;
    
    // Consultar sesión (noticia)
    if (accion === 'sesion' && codigo) {
      if (!sheetsUrl) return res.status(200).json({ sesion: null });
      try {
        const response = await fetch(`${sheetsUrl}?accion=sesion&codigo=${encodeURIComponent(codigo)}`);
        const data = await response.json();
        return res.status(200).json(data);
      } catch (err) {
        return res.status(500).json({ error: 'Error al conectar' });
      }
    }

    // Consultar entrega previa del grupo para restaurarla si recargan
    if (accion === 'cargar_entrega' && codigo && grupo) {
      if (!sheetsUrl) return res.status(200).json({ entrega: null });
      try {
        const response = await fetch(`${sheetsUrl}?accion=cargar_entrega&codigo=${encodeURIComponent(codigo)}&grupo=${encodeURIComponent(grupo)}`);
        const data = await response.json();
        return res.status(200).json(data);
      } catch (err) {
        return res.status(200).json({ entrega: null });
      }
    }
    return res.status(400).json({ error: 'Acción no válida' });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const { accion } = body;

    if (accion === 'crear_sesion') {
      const pinProfe = process.env.PIN_PROFESOR || '1234';
      if (body.pin !== pinProfe) return res.status(401).json({ error: 'PIN incorrecto.' });
      if (sheetsUrl) {
        await fetch(sheetsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }
      return res.status(200).json({ status: 'ok' });
    }

    if (accion === 'guardar_entrega') {
      if (sheetsUrl) {
        await fetch(sheetsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }
      return res.status(200).json({ status: 'ok' });
    }

    // IA Socrática
    const apiKey = process.env.AI_API_KEY;
    const modelName = process.env.AI_MODEL || 'gemini-2.5-flash';
    if (!apiKey) return res.status(500).json({ error: 'Falta AI_API_KEY en Vercel.' });

    const { fase, textoAlumno, cuerpo, titular } = body;
    const promptSistema = PROMPTS[fase] || PROMPTS.DEFAULT;
    const promptFinal = rellenarPlantilla(promptSistema, {
      titular: titular || 'Noticia',
      cuerpo: cuerpo || '',
      textoAlumno: textoAlumno || ''
    });

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptFinal }] }] })
      });
      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return res.status(200).json({ respuesta: data.candidates[0].content.parts[0].text });
      } else {
        throw new Error('Respuesta inválida de Gemini');
      }
    } catch (error) {
      return res.status(500).json({ error: 'Error de IA: ' + error.message });
    }
  }
  return res.status(405).end();
}
