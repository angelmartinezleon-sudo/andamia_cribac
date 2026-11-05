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
      // Usamos el endpoint con soporte flexible de modelos
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
        const errorMsg = data.error?.message || 'Respuesta vacía o bloqueada por la API';
        throw new Error(errorMsg);
      }
    } catch (error) {
      return res.status(500).json({ error: 'Error de IA: ' + error.message });
    }
