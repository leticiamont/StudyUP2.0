import { Router } from "express";
import { getStats, getLeaderboard } from "../controllers/dashboardController.js";
// (Futuramente, podemos adicionar um middleware de 'isAdmin' aqui)

const router = Router();

// Endpoint para os KPIs (Total de Alunos, etc.)
router.get("/stats", getStats);

// Endpoint para o Ranking de Gamificação
router.get("/leaderboard", getLeaderboard);

export default router;