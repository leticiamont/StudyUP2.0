import express from 'express';
import {
  getClasses,
  createClass,
  getClassById,
  updateClass,
  deleteClass // <-- IMPORTADO
} from '../controllers/classController.js';

const router = express.Router();

router.get('/', getClasses);
router.post('/', createClass);

router.get('/:id', getClassById);
router.put('/:id', updateClass);
router.delete('/:id', deleteClass); // <-- ROTA DELETAR ATIVADA

export default router;