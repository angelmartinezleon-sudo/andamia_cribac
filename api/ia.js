const PROMPTS = {
  C: "Eres un tutor socrático experto en alfabetización mediática para Secundaria. El alumno ha escrito su corazonada. No le digas si es verdad o mentira. Hazle una pregunta directa y desafiante sobre si el titular busca manipular sus emociones o generar clics.",
  R: "Eres un tutor socrático experto en la columna R (Redacción y Pruebas). El alumno analizó el texto. Si su respuesta es superficial o pobre, pregúntale por palabras concretas del texto que muestren exageración, tono alarmista o intereses comerciales.",
  I: "Eres un tutor socrático experto en la columna I (Investigación de Fuentes). El alumno evaluó la fuente. Hazle una pregunta incisiva: ¿Cómo podéis verificar si esa agencia o autor existe y es independiente fuera de este artículo?",
  B: "Eres un tutor socrático experto en la columna B (Búsqueda externa). El alumno buscó fuera. Hazle una repregunta: ¿Qué dicen otros medios o fuentes expertas si buscáis este tema en un buscador general? ¿Contradicen o apoyan el titular?",
  A: "Eres un tutor socrático experto en el Veredicto (Columna A). El alumno argumentó. Si el argumento es flojo, guíale críticamente: ¿Una afirmación de autoridad sin pruebas externas justifica un veredicto fiable?",
  MASC: "Eres un tutor socrático para la fase final (+C). Ayuda al grupo a reflexionar sobre cómo ha evolucionado su perspectiva crítica desde el principio.",
  DEFAULT: "Eres un tutor socrático para Secundaria. No des la respuesta hecha. Haz una pregunta breve y desafiante basada estrictamente en lo que acaba de escribir el alumno."
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const sheetsUrl = process.env.GOOGLE_SHEETS_URL;

  // 1. CONEXIÓN CON GOOGLE SHEETS (NOTICIAS Y RECUPERACIÓN)
  if (req.method === 'GET') {
    const { accion, codigo, grupo } = req.query;
    if (!sheetsUrl) return res.status(200).json({ sesion: null, entrega: null });

    try {
      // El Date.now() evita que el servidor cachee una noticia antigua
      let targetUrl = `${sheetsUrl}?accion=${accion}&codigo=${encodeURIComponent(codigo || '')}&t=${Date.now()}`;
      if (grupo) targetUrl += `&grupo=${encodeURIComponent(grupo)}`;

      const response = await fetch(targetUrl, { redirect: 'follow' });
      const text = await response.text();
      
      try {
        const data = JSON.parse(text);
        return res.status(200).json(data);
      } catch (e) {
        return res.status(500).json({ error: 'Permisos del Excel denegados. Debes publicarlo para "Cualquier persona".' });
      }
    } catch (err) {
      return res.status(500).json({ error: 'Error de red conectando con Sheets' });
    }
  }

  // 2. GUARDADO Y LLAMADA A LA IA SOCRÁTICA
  if (req.method === 'POST') {
    const body = req.body || {};
    const { accion } = body;

    if (accion === 'crear_sesion' || accion === 'guardar_entrega') {
      if (accion === 'crear_sesion' && body.pin !== (process.env.PIN_PROFESOR || '1234')) {
        return res.status(401).json({ error: 'PIN incorrecto.' });
      }
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

    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Falta AI_API_KEY' });

    const { fase, textoAlumno, cuerpo, titular } = body;
    const promptBase = PROMPTS[fase] || PROMPTS.DEFAULT;
    
    const promptFinal = `${promptBase}

Noticia analizada:
- Titular: "${titular || 'Titular'}"
- Cuerpo: "${cuerpo || 'Cuerpo'}"

Respuesta del alumno: "${textoAlumno}"

Instrucción estricta: No digas si es verdad o mentira ni des la respuesta hecha. Hazle una pregunta socrática corta y directa (para alumnos de 15 años) que le haga pensar críticamente sobre lo que acaba de escribir.`;

    try {
      // Ruta universal forzada con -latest para evitar errores de API
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptFinal }] }] })
      });

      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return res.status(200).json({ respuesta: data.candidates[0].content.parts[0].text });
      } else {
        return res.status(500).json({ error: data.error?.message || 'Error en la respuesta de Gemini' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Excepción: ' + error.message });
    }
  }
  return res.status(405).end();
}
