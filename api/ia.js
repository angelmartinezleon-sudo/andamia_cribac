import { PROMPTS } from './prompts.js';

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

    // LLAMADA DIRECTA A GEMINI (SIN RODEOS)
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Falta AI_API_KEY en Vercel.' });

    const { fase, textoAlumno, cuerpo, titular } = body;
    const promptBase = PROMPTS[fase] || PROMPTS.DEFAULT;
    
    const promptCompleto = `${promptBase}

Noticia analizada:
- Titular: "${titular || 'Titular'}"
- Cuerpo: "${cuerpo || 'Cuerpo'}"

Respuesta del alumno: "${textoAlumno}"

Instrucción: No digas si es verdad o mentira ni des la respuesta hecha. Hazle una pregunta socrática corta y directa (para alumnos de 15 años) que le haga pensar críticamente sobre lo que ha escrito.`;

    try {
      // Usamos el modelo gemini-1.5-flash directamente en la v1
      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptCompleto }] }] })
      });

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return res.status(200).json({ respuesta: data.candidates[0].content.parts[0].text });
      } else {
        const errorDetalle = data.error?.message || 'Error desconocido de la API';
        return res.status(500).json({ error: 'Gemini dice: ' + errorDetalle });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Excepción: ' + error.message });
    }
  }
  return res.status(405).end();
}
