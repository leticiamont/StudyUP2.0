import express from "express";
import { upload } from "../middlewares/upload.js";
import { uploadContent, getContents, deleteContent, updateContent } from "../controllers/contentController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Rota para buscar conteúdos
router.get("/", authMiddleware, getContents);

// --- NOVIDADE: Rota para TEXTO (usada pelo Editor) ---
// O app manda para cá quando você salva um texto
router.post("/", authMiddleware, uploadContent); 

// --- Rota para ARQUIVO (usada pelo botão de Upload) ---
// O app manda para cá quando você escolhe um PDF
router.post("/upload", authMiddleware, upload.single("file"), uploadContent);

router.delete("/:id", authMiddleware, deleteContent);
router.put("/:id", authMiddleware, updateContent);

export default router;