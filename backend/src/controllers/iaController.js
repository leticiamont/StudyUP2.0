import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const MY_API_KEY = "AIzaSyCT09A11kDEm-Zk0RWxcg2aXdaD3tr7biQ"; 

const genAI = new GoogleGenerativeAI(MY_API_KEY);

export async function gerarResposta(req, res) {
  try {
    const { prompt } = req.body;
    console.log("Recebendo prompt na IA:", prompt);

    if (!prompt) {
      return res.status(400).json({ erro: "Prompt é obrigatório." });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("Resposta gerada:", text.substring(0, 50) + "..."); // Log para confirmar

    res.json({ resposta: text });
  } catch (err) {
    console.error("Erro detalhado IA:", err);
    res.status(500).json({ erro: "Falha na IA", details: err.message });
  }
}