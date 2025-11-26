import express from 'express';
import {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan
} from '../controllers/planController.js';
import { authMiddleware } from "../middlewares/authMiddleware.js";
import multer from 'multer';

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Configura pasta temporária

// Middleware Opcional (Mantenha igual)
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
    } catch (error) { console.warn("Token inválido. Desktop Admin."); }
  }
  next();
};

router.get('/', optionalAuth, getPlans);

// --- MUDANÇA AQUI: Adiciona upload.single('pdfFile') ---
router.post('/', optionalAuth, upload.single('pdfFile'), createPlan);
router.put('/:id', optionalAuth, upload.single('pdfFile'), updatePlan);
router.get('/:id', optionalAuth, getPlanById);
router.put('/:id', optionalAuth, updatePlan);
router.delete('/:id', optionalAuth, deletePlan);

export default router;