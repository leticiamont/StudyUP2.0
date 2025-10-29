import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function gerarResposta(req, res) {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ erro: "Prompt é obrigatório." });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response.text();

    res.json({ resposta: response });
  } catch (err) {
    console.error("Erro na IA:", err);
    res.status(500).json({ erro: "Erro ao gerar resposta." });
  }
}
