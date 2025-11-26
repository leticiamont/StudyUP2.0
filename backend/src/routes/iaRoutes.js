import express from "express";
import axios from 'axios';
import { gerarResposta, gerarQuizAutomatico } from "../controllers/iaController.js";

const router = express.Router();

// Rota da Varinha Mágica (Gemini)
router.post("/gerar", gerarResposta);

// Rota do Terminal Python (Piston API v2)
router.post('/run-python', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Nenhum código fornecido.' });
  }

  // 🚨 A URL CORRETA É ESTA:
  const pistonApiUrl = 'https://emkc.org/api/v2/piston/execute';

  try {
    const response = await axios.post(pistonApiUrl, {
      language: 'python',
      version: '3.10.0', 
      files: [
        {
          content: code, 
        },
      ],
    });

    const result = response.data;

    // Verifica se houve erro na execução do Python (stderr)
    // A API retorna 'run.stderr' se o código Python tiver erro (ex: syntax error)
    if (result.run && result.run.stderr) {
      res.status(200).json({ success: false, output: result.run.stderr });
    } else {
      res.json({ success: true, output: result.run.stdout });
    }

  } catch (error) {
    console.error('Erro ao chamar a Piston API:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Erro no servidor de execução. Tente novamente.' 
    });
  }
});

router.post("/gerar-quiz", gerarQuizAutomatico);

export default router;