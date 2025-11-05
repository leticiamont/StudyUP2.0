import express from 'express';
import { getClasses, createClass } from '../controllers/classController.js';
// (Futuramente, adicionaremos middlewares de autenticação aqui)

// Inicializa o roteador do Express
const router = express.Router();

// Define as rotas que serão montadas em /api/classes (conforme index.js)

// GET /api/classes -> Chama o controller getClasses
router.get('/', getClasses);

// POST /api/classes -> Chama o controller createClass
router.post('/', createClass);

// (Aqui entrarão as rotas PUT, DELETE e GET /:id futuramente)
// router.get('/:id', getClassById);
// router.put('/:id', updateClass);
// router.delete('/:id', deleteClass);

// Exporta o roteador configurado
export default router;