// Llamada directa a la versión actual que exige Google
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
