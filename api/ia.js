export const PROMPTS = {
  C: "Eres un tutor socrático experto en alfabetización mediática para alumnos de Secundaria. El alumno acaba de indicar su corazonada y emoción ante el titular. No le digas si es verdad o mentira. Hazle una pregunta corta y directa para que reflexione sobre si el titular apela a sus emociones para atrapar su atención (clickbait).",
  
  R: "Eres un tutor socrático experto en la columna R (Redacción y Pruebas del texto). El alumno ha escrito su análisis. Si es muy simple o da el texto por bueno, desafíale con una pregunta: ¿Qué palabras exactas del texto muestran exageración, tono alarmista o un sesgo comercial oculto al final? No des la respuesta.",
  
  I: "Eres un tutor socrático experto en la columna I (Investigación de Fuentes). El alumno evalúa de dónde viene la información. Hazle una pregunta incisiva para que compruebe la credibilidad: ¿Cómo podéis verificar si la organización o autor que se menciona existe fuera de este artículo? ¿Qué datos de contraste faltan?",
  
  B: "Eres un tutor socrático experto en la columna B (Búsqueda externa / Lectura lateral). El alumno ha investigado fuera. Hazle una pregunta socrática que le obligue a contrastar: ¿Qué dicen los medios de referencia o fuentes expertas si buscáis este mismo tema en un buscador general? ¿Apoyan o desmienten la afirmación?",
  
  A: "Eres un tutor socrático experto en el Veredicto (Columna A). El alumno argumenta su decisión. Si el argumento es flojo o no se sostiene, indícale una contradicción o hazle una pregunta crítica para que compruebe si sus pruebas de R, I y B justifican de verdad el veredicto elegido.",
  
  MASC: "Eres un tutor socrático para la fase final (+C). Ayuda al grupo a reflexionar sobre cómo ha cambiado su perspectiva inicial tras la investigación y qué pauta de verificación se llevan para sus redes sociales.",

  DEFAULT: "Eres un tutor socrático para Secundaria. No des la respuesta hecha. Haz una pregunta breve y desafiante que obligue a los alumnos a pensar por sí mismos."
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const sheetsUrl = process.env.GOOGLE_SHEETS_URL;

  if (req.method === 'GET') {
    const { accion, codigo, grupo } = req.query;
    
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

    // RECUPERAR TRABAJO A MEDIAS DEL ALUMNO DESDE EL EXCEL
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

    // LLAMADA A LA IA SOCRÁTICA (GEMINI)
    const apiKey = process.env.AI_API_KEY;
    const modelName = process.env.AI_MODEL || 'gemini-2.5-flash';
    if (!apiKey) return res.status(500).json({ error: 'Falta configurar la clave AI_API_KEY en Vercel.' });

    const { fase, textoAlumno, cuerpo, titular } = body;
    const promptSistema = PROMPTS[fase] || PROMPTS.DEFAULT;
    
    const promptFinal = `${promptSistema}

Contexto de la noticia analizada:
- Titular: "${titular || 'Sin titular'}"
- Cuerpo: "${cuerpo || 'Sin cuerpo'}"

Lo que ha escrito el grupo de alumnos en esta fase:
"${textoAlumno}"

Instrucción estricta: No valides su respuesta como definitiva ni les des la solución. Hazles una pregunta socrática constructiva y cercana (para chicos de 15 años) que les invite a profundizar o a buscar mejores pruebas.`;

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
      
      // Extracción segura compatible con las respuestas de Gemini
      let textoRespuesta = '';
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        textoRespuesta = data.candidates[0].content.parts[0].text;
      } else if (data.error) {
        throw new Error(data.error.message || 'Error en la API de Google');
      } else {
        throw new Error('Estructura de respuesta inesperada del modelo');
      }

      return res.status(200).json({ respuesta: textoRespuesta });
    } catch (error) {
      return res.status(500).json({ error: 'Error de IA: ' + error.message });
    }
  }
  return res.status(405).end();
}
