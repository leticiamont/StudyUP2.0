import express from "express";
import { upload } from "../middlewares/upload.js";
import { uploadContent, getContents, deleteContent, updateContent } from "../controllers/contentController.js";
import { admin } from '../config/firebase.js';

const router = express.Router();

// --- MIDDLEWARE OPCIONAL (O mesmo que usamos em planRoutes/userRoutes) ---
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      // Se tiver token (Mobile), verifica quem é
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken; 
    } catch (error) {
      // Se o token for ruim, segue como anônimo/admin desktop
      console.warn("Token inválido ou expirado. Seguindo sem user.");
    }
  }
  // Se não tiver token (Desktop), segue sem user (o controller assume admin)
  next();
};

// --- ROTAS (Usando optionalAuth) ---

router.get("/", optionalAuth, getContents);

// Rota para TEXTO (usada pelo Editor)
router.post("/", optionalAuth, uploadContent); 

// Rota para ARQUIVO (usada pelo botão de Upload)
router.post("/upload", optionalAuth, upload.single("file"), uploadContent);

router.delete("/:id", optionalAuth, deleteContent);
router.put("/:id", optionalAuth, updateContent);

export default router;