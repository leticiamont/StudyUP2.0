import { Router } from "express";
import multer from 'multer';

import { 
  registerUser, 
  getUser, 
  getAllUsers, 
  updateUser, 
  deleteUser,
  batchPreviewUsers,
  batchConfirmUsers,
  addPoints // <--- Importado aqui
} from "../controllers/userController.js";

import { validateUser } from "../middlewares/validateUser.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const upload = multer({ dest: 'uploads/' });
const router = Router();

// Rota de criação individual
router.post("/", validateUser, registerUser);

// --- ROTAS DE LOTE ---
// 1. Endpoint de Pré-visualização (lê o ficheiro)
router.post("/batch-preview", upload.single('csvFile'), batchPreviewUsers);
// 2. Endpoint de Confirmação (lê o JSON)
router.post("/batch-confirm", batchConfirmUsers);

// Outras rotas (GET, PUT, DELETE)
router.get("/", getAllUsers);
router.get("/:id", getUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

// ROTA DE PONTOS (CORRIGIDA)
// Errado: userController.addPoints
// Certo: addPoints
router.post('/points', authMiddleware, addPoints);

export default router;