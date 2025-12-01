import { Router } from "express";
import multer from 'multer';
import { admin } from '../config/firebase.js'; // Necessário para o optionalAuth

// Importa TODAS as funções do controller (Desktop + Mobile)
import { 
  registerUser, getUser, getAllUsers, updateUser, deleteUser,
  batchPreviewUsers, batchConfirmUsers,
  deductPoints, addPoints, 
  toggleUserStatus, 
  resetUserPassword 
} from "../controllers/userController.js";

import { validateUser } from "../middlewares/validateUser.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { 
  // ...
  changePassword 
} from "../controllers/userController.js";

const upload = multer({ dest: 'uploads/' });
const router = Router();

// --- Middleware Híbrido (Para Desktop Admin) ---
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
    } catch (error) {
      // Token inválido? Ignora e segue como Admin (para Desktop)
    }
  }
  next();
};

// --- ROTAS BÁSICAS (CRUD) ---
// (Adicionei optionalAuth no GET para o Desktop conseguir listar sem erro 401)
router.post("/", validateUser, registerUser);
router.get("/", optionalAuth, getAllUsers);
router.get("/:id", optionalAuth, getUser);
router.put("/:id", optionalAuth, updateUser);
router.delete("/:id", optionalAuth, deleteUser);

// --- ROTAS DE LOTE (Desktop) ---
router.post("/batch-preview", optionalAuth, upload.single('csvFile'), batchPreviewUsers);
router.post("/batch-confirm", optionalAuth, batchConfirmUsers);

// --- ROTAS DE GAMIFICAÇÃO (Mobile - Protegidas) ---
router.post("/deduct-points", authMiddleware, deductPoints);
router.post("/add-points", authMiddleware, addPoints);

// --- ROTAS DE GESTÃO (Desktop - Admin) ---
router.patch("/:id/status", optionalAuth, toggleUserStatus);
router.post("/:id/reset-password", optionalAuth, resetUserPassword);

router.post("/change-password", optionalAuth, changePassword);

export default router;