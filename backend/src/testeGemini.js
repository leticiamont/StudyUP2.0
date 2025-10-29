import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testarIA() {
  console.log("🔑 Chave carregada: ✅ OK");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: "Explique resumidamente o que é lógica de programação." }],
            },
          ],
        }),
      }
    );

    if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
    const data = await response.json();

    console.log("✅ Resposta da IA:");
    console.log(data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta.");
  } catch (err) {
    console.error("❌ Erro ao chamar a IA:", err);
  }
}

testarIA();
