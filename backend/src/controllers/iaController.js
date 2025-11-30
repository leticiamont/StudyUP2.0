import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import axios from "axios";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfLib = require("pdf-parse");

dotenv.config();

const MY_API_KEY = process.env.GEMINI_API_KEY;
if (!MY_API_KEY) console.error("ERRO: GEMINI_API_KEY não configurada no .env");

const genAI = new GoogleGenerativeAI(MY_API_KEY);

// --- 1. GERA RESPOSTA (CHAT) ---
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

// --- 2. GERA QUIZ INTELIGENTE (MISTO: MÚLTIPLA ESCOLHA + CÓDIGO) ---
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
            textoExtraido = "Conteúdo de Python básico.";
        }
    }

    // Limita tamanho para não estourar tokens
    textoExtraido = textoExtraido.substring(0, 30000); 

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // PROMPT ATUALIZADO PARA GERAR CÓDIGO E TESTES
    const prompt = `
      Analise o seguinte conteúdo educacional: "${textoExtraido}".
      Crie 5 questões de nível progressivo.
      
      IMPORTANTE:
      - 3 questões devem ser do tipo "multiple_choice" (Múltipla Escolha).
      - 2 questões devem ser do tipo "code" (Desafio de Código em Python).
      
      Retorne APENAS um JSON válido (sem markdown) neste formato Array:
      [
        {
          "id": 1,
          "type": "multiple_choice",
          "question": "Texto da pergunta",
          "options": ["A", "B", "C", "D"],
          "correctIndex": 0,
          "points": 10
        },
        {
          "id": 2,
          "type": "code",
          "question": "Ex: Crie uma variável x com valor 10 e imprima.",
          "initialCode": "# Escreva seu código aqui",
          "expectedOutput": "10",
          "points": 20
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text()
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
    
    let quizJson;
    try {
        quizJson = JSON.parse(text);
    } catch (e) {
        console.error("Erro no parse JSON da IA:", e);
        quizJson = []; 
    }

    res.json(quizJson);

  } catch (err) {
    console.error("Erro Quiz:", err);
    res.status(500).json({ erro: "Falha ao gerar quiz." });
  }
}

// --- 3. EXECUTAR PYTHON (USANDO API PISTON) ---
// Essa função roda o código em um servidor seguro externo, evitando erros locais
export async function executarPython(req, res) {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Nenhum código fornecido.' });
  }

  // API Piston v2
  const pistonApiUrl = 'https://emkc.org/api/v2/piston/execute';

  try {
    const response = await axios.post(pistonApiUrl, {
      language: 'python',
      version: '3.10.0',
      files: [{ content: code }]
    });

    const result = response.data;

    // Se tiver erro de execução (stderr), retorna como false para o frontend mostrar em vermelho
    if (result.run && result.run.stderr) {
      res.json({ success: false, output: result.run.stderr });
    } else {
      res.json({ success: true, output: result.run.stdout });
    }

  } catch (error) {
    console.error('Erro Piston API:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao executar o código.' 
    });
  }
}