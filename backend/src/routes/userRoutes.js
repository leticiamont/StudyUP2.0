import { Router } from "express";
import multer from 'multer';

import { 
  registerUser, 
  getUser, 
  getAllUsers, 
  updateUser, 
  deleteUser,
  batchPreviewUsers,  // <-- NOVO
  batchConfirmUsers   // <-- NOVO
} from "../controllers/userController.js";
import { validateUser } from "../middlewares/validateUser.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const upload = multer({ dest: 'uploads/' });
const router = Router();

// Rota de criação individual
router.post("/", validateUser, registerUser);

// --- ROTAS DE LOTE MODIFICADAS ---
// 1. Endpoint de Pré-visualização (lê o ficheiro)
router.post("/batch-preview", upload.single('csvFile'), batchPreviewUsers);
// 2. Endpoint de Confirmação (lê o JSON)
router.post("/batch-confirm", batchConfirmUsers);

// Outras rotas (GET, PUT, DELETE)
router.get("/", getAllUsers);
router.get("/:id", getUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;