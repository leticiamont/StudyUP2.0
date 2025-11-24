import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import axios from "axios";
import { createRequire } from "module";

// --- 1. IMPORTAÇÃO SEGURA (MANTIDA) ---
const require = createRequire(import.meta.url);
const pdfLib = require("pdf-parse");
// --------------------------------------

dotenv.config();

// Sua chave (verifique se está válida)
const MY_API_KEY = "AIzaSyC0Po8HIuaRnnzJDm2HT_imBGtfIe0R79I"; 

const genAI = new GoogleGenerativeAI(MY_API_KEY);

// --- FUNÇÃO 1: VARINHA MÁGICA ---
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

// --- FUNÇÃO 2: GERADOR DE QUIZ (BLINDADO) ---
export async function gerarQuizAutomatico(req, res) {
  try {
    // AGORA ACEITA textContent OU pdfUrl
    const { pdfUrl, textContent } = req.body; 

    if (!pdfUrl && !textContent) {
      return res.status(400).json({ erro: "URL do PDF ou Conteúdo de Texto é obrigatório." });
    }

    let textoExtraido = "";

    // --- 1. PRIOIRIZA O TEXTO PURO (MAIS RÁPIDO) ---
    if (textContent) {
        textoExtraido = textContent;
    } 
    // --- 2. SE NÃO TIVER TEXTO, PROCESSE O PDF ---
    else if (pdfUrl) {
        // [Lógica de download e parsing do PDF mantida]
        const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        
        try {
            const data = await pdfLib(buffer);
            if (data && data.text && data.text.trim().length > 0) {
                textoExtraido = data.text;
            } else {
                throw new Error("PDF sem texto selecionável.");
            }
        } catch (pdfError) {
            // TEXTO DE EMERGÊNCIA (Para o app não travar)
            textoExtraido = `Python é uma linguagem de programação. O comando print() exibe mensagens.`;
        }
    }

    textoExtraido = textoExtraido.substring(0, 30000); 

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Atue como um professor. Crie 5 perguntas de quiz baseadas no texto abaixo.
      
      REGRAS:
      1. Retorne APENAS um JSON válido (sem markdown).
      2. Formato: Array de objetos com id, type ('multiple_choice' ou 'code'), question, options, correctIndex, points, initialCode (se for código), expectedOutput (se for código).
      3. Inclua pelo menos 1 desafio de código se o texto for técnico.
      
      TEXTO BASE: "${textoExtraido}"
    `;

    const result = await model.generateContent(prompt);
    const responseAI = await result.response;
    let text = responseAI.text();

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const quizJson = JSON.parse(text); 

    res.json(quizJson);

  } catch (err) {
    console.error("Erro CRÍTICO ao gerar quiz:", err);
    res.status(500).json({ erro: "Falha ao gerar quiz.", details: err.message });
  }
}