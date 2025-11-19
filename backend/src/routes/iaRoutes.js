import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import axios from 'axios';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const router = express.Router();

router.post("/gerar", async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash-latest",
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    });

    const texto = response.text();
    res.json({ resposta: texto });
  } catch (err) {
    console.error("Erro no backend IA:", err);
    res.status(500).json({ erro: "Falha ao gerar resposta IA" });
  }
});
router.post('/run-python', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Nenhum código fornecido.' });
  }

  const pistonApiUrl = 'https://piston-api.jamesg.blog/api/v2/execute';

  try {
    const response = await axios.post(pistonApiUrl, {
      language: 'python',
      version: '3.10.0', 
      files: [
        {
          name: 'main.py', 
          content: code, 
        },
      ],
    });

    const result = response.data;

    if (result.run.stderr) {
      res.status(400).json({ success: false, error: result.run.stderr.trim() });
    } else {
      res.json({ success: true, output: result.run.stdout.trim() });
    }

  } catch (error) {
    console.error('Erro ao chamar a Piston API:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Erro no servidor de execução de código.' 
    });
  }
});
export default router;
