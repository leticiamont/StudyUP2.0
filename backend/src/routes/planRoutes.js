import express from 'express';
import {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan
} from '../controllers/planController.js';
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get('/', authMiddleware, getPlans);
router.post('/', authMiddleware, createPlan);
router.get('/:id', authMiddleware, getPlanById);
router.put('/:id', authMiddleware, updatePlan);
router.delete('/:id', authMiddleware, deletePlan);

export default router;