// IA Socrática
    const apiKey = process.env.AI_API_KEY;
    // Forzamos un modelo estándar compatible con v1beta
    const modelName = process.env.AI_MODEL || 'gemini-1.5-flash';
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
      // Usamos la versión v1 de la API que es más estable para los nombres de modelos actuales
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
        throw new Error(data.error?.message || 'Respuesta inválida de la IA');
      }
    } catch (error) {
      return res.status(500).json({ error: 'Error de IA: ' + error.message });
    }
