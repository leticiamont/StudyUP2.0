import express from "express";
import { upload } from "../middlewares/upload.js"; // Certifique-se que este middleware existe e usa multer
import { uploadContent, getContents, deleteContent, updateContent } from "../controllers/contentController.js";
import { admin } from '../config/firebase.js';

const router = express.Router();

// Middleware Opcional
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try { req.user = await admin.auth().verifyIdToken(token); } catch (e) {}
  }
  next();
};

router.get("/", optionalAuth, getContents);

// Rota 1: Criação de Conteúdo TEXTO (JSON) - Usada pelo Editor/IA
router.post("/", optionalAuth, uploadContent); 

// Rota 2: Upload de ARQUIVO (Multipart) - Usada pelo botão de upload
// O 'upload.single("file")' deve processar o campo chamado 'file'
router.post("/upload", optionalAuth, upload.single("file"), uploadContent);

router.delete("/:id", optionalAuth, deleteContent);
router.put("/:id", optionalAuth, updateContent);

export default router;