import express from 'express';
// Importa todas as funções
import {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan
} from '../controllers/planController.js';

const router = express.Router();

// Rotas da Coleção
router.get('/', getPlans);
router.post('/', createPlan);

// Rotas do Documento Específico
router.get('/:id', getPlanById);
router.put('/:id', updatePlan);
router.delete('/:id', deletePlan);

export default router;