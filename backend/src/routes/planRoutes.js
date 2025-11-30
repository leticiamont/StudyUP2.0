import express from 'express';
import { admin } from '../config/firebase.js';
import multer from 'multer'; 

import {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan
} from '../controllers/planController.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Pasta temporária

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
    } catch (error) { }
  }
  next();
};

router.get('/', optionalAuth, getPlans);

// CORREÇÃO: upload.single('pdfFile') é essencial aqui
router.post('/', optionalAuth, upload.single('pdfFile'), createPlan);

router.get('/:id', optionalAuth, getPlanById);

// CORREÇÃO: upload.single('pdfFile') também no PUT para permitir trocar o arquivo
router.put('/:id', optionalAuth, upload.single('pdfFile'), updatePlan);

router.delete('/:id', optionalAuth, deletePlan);

export default router;