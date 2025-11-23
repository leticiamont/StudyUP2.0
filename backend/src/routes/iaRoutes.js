import express from "express";
import axios from 'axios';
import { gerarResposta } from "../controllers/iaController.js";

const router = express.Router();

// Rota da Varinha Mágica (Gemini)
router.post("/gerar", gerarResposta);

// Rota do Terminal Python
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