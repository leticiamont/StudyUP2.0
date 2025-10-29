import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function listarModelos() {
  console.log("🔑 Chave carregada: ✅ OK");
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`
    );

    if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
    const data = await res.json();

    console.log("📋 Modelos disponíveis:");
    data.models.forEach((m) => console.log("-", m.name));
  } catch (err) {
    console.error("❌ Erro ao listar modelos:", err);
  }
}

listarModelos();
