import express from "express";
import axios from 'axios';
import { gerarResposta, gerarQuizAutomatico } from "../controllers/iaController.js";

const router = express.Router();

// Rota da Varinha Mágica (Gemini)
router.post("/gerar", gerarResposta);

// Rota do Terminal Python
router.post('/run-python', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Nenhum código fornecido.' });
  }

  // ⚠️ MUDANÇA AQUI: Usando a URL oficial da Piston (emkc.org) que é mais estável
  const pistonApiUrl = 'https://emkc.org/api/v2/piston/execute';

  try {
    const response = await axios.post(pistonApiUrl, {
      language: 'python',
      version: '3.10.0', 
      files: [
        {
          content: code, // A API oficial usa apenas 'content' dentro do objeto files
        },
      ],
    });

    const result = response.data;

    // Verifica se houve erro na execução do Python (stderr)
    if (result.run && result.run.stderr) {
      res.status(200).json({ success: false, output: result.run.stderr.trim() }); // Retorna como output para o usuário ler o erro
    } else {
      res.json({ success: true, output: result.run.stdout.trim() });
    }

  } catch (error) {
    console.error('Erro ao chamar a Piston API:', error.message);
    // Se der erro na API externa, devolvemos msg amigável
    res.status(500).json({ 
      success: false, 
      error: 'Erro no servidor de execução. Tente novamente.' 
    });
  }
});

router.post("/gerar-quiz", gerarQuizAutomatico);

export default router;