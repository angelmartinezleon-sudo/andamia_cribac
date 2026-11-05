import { PROMPTS, rellenarPlantilla } from './prompts.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const sheetsUrl = process.env.GOOGLE_SHEETS_URL;

  if (req.method === 'GET') {
    const { accion, codigo, grupo } = req.query;
    if (!sheetsUrl) return res.status(200).json({ sesion: null, entrega: null });

    try {
      let targetUrl = `${sheetsUrl}?accion=${accion}&codigo=${encodeURIComponent(codigo || '')}`;
      if (grupo) targetUrl += `&grupo=${encodeURIComponent(grupo)}`;

      const response = await fetch(targetUrl, { redirect: 'follow' });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Error conectando con base de datos' });
    }
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
          body: JSON.stringify(body),
          redirect: 'follow'
        });
      }
      return res.status(200).json({ status: 'ok' });
    }

    if (accion === 'guardar_entrega') {
      if (sheetsUrl) {
        await fetch(sheetsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          redirect: 'follow'
        });
      }
      return res.status(200).json({ status: 'ok' });
    }

    // IA Socrática
    const apiKey = process.env.AI_API_KEY;
    const modelName = process.env.AI_MODEL || 'gemini-1.5-flash';
    if (!apiKey) return res.status(500).json({ error: 'Falta configurar la clave AI_API_KEY en Vercel.' });

    const { fase, textoAlumno, cuerpo, titular } = body;
    const promptSistema = PROMPTS[fase] || PROMPTS.DEFAULT;
    const promptFinal = rellenarPlantilla(promptSistema, {
      titular: titular || 'Sin titular',
      cuerpo: cuerpo || '',
      textoAlumno: textoAlumno || ''
    });

    try {
      const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptFinal }] }] })
      });

      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return res.status(200).json({ respuesta: data.candidates[0].content.parts[0].text });
      } else {
        const errorMsg = data.error?.message || 'Respuesta vacía o bloqueada por la API';
        throw new Error(errorMsg);
      }
    } catch (error) {
      return res.status(500).json({ error: 'Error de IA: ' + error.message });
    }
  }
  return res.status(405).end();
}
