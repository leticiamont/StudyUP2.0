import { Router } from "express";
import { 
  gerarResposta, 
  gerarQuizAutomatico, 
  executarPython // <--- Importamos a nova função
} from "../controllers/iaController.js";

const router = Router();

// Rota da Varinha Mágica (Chat)
router.post("/gerar", gerarResposta);

// Rota do Quiz (Gera perguntas)
router.post("/gerar-quiz", gerarQuizAutomatico);

// Rota da IDE (Roda o código Python)
router.post("/run-python", executarPython);

export default router;