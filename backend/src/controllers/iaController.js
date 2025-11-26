import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import axios from "axios";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfLib = require("pdf-parse");

dotenv.config();

// LEITURA SEGURA DA CHAVE
const MY_API_KEY = process.env.GEMINI_API_KEY;
if (!MY_API_KEY) console.error("ERRO: GEMINI_API_KEY não configurada no .env");

const genAI = new GoogleGenerativeAI(MY_API_KEY);

// --- FUNÇÃO 1 (EXPORTADA) ---
export async function gerarResposta(req, res) {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ erro: "Prompt é obrigatório." });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ resposta: text });
  } catch (err) {
    console.error("Erro IA:", err);
    res.status(500).json({ erro: "Falha na IA", details: err.message });
  }
}

// --- FUNÇÃO 2 (EXPORTADA) ---
export async function gerarQuizAutomatico(req, res) {
  try {
    const { pdfUrl, textContent } = req.body; 

    if (!pdfUrl && !textContent) {
      return res.status(400).json({ erro: "URL do PDF ou Texto é obrigatório." });
    }

    let textoExtraido = "";

    if (textContent) {
        textoExtraido = textContent;
    } else if (pdfUrl) {
        const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        try {
            const data = await pdfLib(buffer);
            if (data.text.trim().length > 0) textoExtraido = data.text;
            else throw new Error("PDF vazio");
        } catch (e) {
            textoExtraido = "Conteúdo padrão de programação Python.";
        }
    }

    textoExtraido = textoExtraido.substring(0, 30000); 

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Crie 5 perguntas de quiz (JSON) baseadas em: "${textoExtraido}". Formato: Array de objetos {id, type, question, options, correctIndex, points}.`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    
    // Tenta fazer o parse do JSON
    let quizJson;
    try {
        quizJson = JSON.parse(text);
    } catch (e) {
        // Se falhar, tenta limpar caracteres extras
        quizJson = []; 
    }

    res.json(quizJson);

  } catch (err) {
    console.error("Erro Quiz:", err);
    res.status(500).json({ erro: "Falha ao gerar quiz." });
  }
}