import { Router } from "express";
import multer from 'multer';
import { 
  registerUser, getUser, getAllUsers, updateUser, deleteUser,
  batchPreviewUsers, batchConfirmUsers,
  deductPoints, addPoints // <--- Importe o addPoints
} from "../controllers/userController.js";
import { validateUser } from "../middlewares/validateUser.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const upload = multer({ dest: 'uploads/' });
const router = Router();

// Rotas Básicas
router.post("/", validateUser, registerUser);
router.get("/", getAllUsers);
router.get("/:id", getUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

// Rotas de Lote
router.post("/batch-preview", upload.single('csvFile'), batchPreviewUsers);
router.post("/batch-confirm", batchConfirmUsers);

// Rotas de Gamificação (Protegidas)
router.post("/deduct-points", authMiddleware, deductPoints);
router.post("/add-points", authMiddleware, addPoints); // <--- ROTA NOVA

export default router;