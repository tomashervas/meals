// --- CONFIGURACIÓN GEMINI API ---
export const getEffectiveApiKey = (): string => {
  try {
    const viteKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (viteKey) return viteKey;
  } catch {
    // ignore
  }
  try {
    const plainKey = import.meta.env.GEMINI_API_KEY;
    if (plainKey) return plainKey;
  } catch {
    // ignore
  }
  return "";
};

export const GEMINI_MODEL = "gemini-3.5-flash-lite";

export async function callGeminiStructured<T = unknown>(
  systemInstruction: string,
  userPrompt: string,
  responseSchema: Record<string, unknown>,
): Promise<T> {
  const effectiveKey = getEffectiveApiKey();
  const modelsToTry = [
    GEMINI_MODEL,
    "gemini-flash-latest",
    "gemini-2.5-flash-lite",
  ];

  const payload = {
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  };

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`;
    let delay = 800;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} en modelo ${model}`);
        }

        const result = await response.json();
        const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error(`Respuesta vacía de Gemini (${model})`);

        return JSON.parse(text) as T;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        await new Promise((r) => setTimeout(r, delay));
        delay *= 1.5;
      }
    }
  }

  throw (
    lastError ||
    new Error("No se pudo obtener respuesta de Gemini tras varios intentos")
  );
}
