import express from 'express';
// Importa as duas funções do controller
import { createPlan, getPlans } from '../controllers/planController.js';

const router = express.Router();

// 1. Rota GET (para listar os planos - corrige o 404)
router.get('/', getPlans);

// 2. Rota POST (para criar o plano)
router.post('/', createPlan);

export default router;