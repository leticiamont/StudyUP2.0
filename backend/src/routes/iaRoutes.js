import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

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

export default router;
