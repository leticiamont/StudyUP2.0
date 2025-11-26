import { Router } from "express";
import { createNews, getNews, deleteNews } from "../controllers/newsController.js";

const router = Router();

// Rota POST (Criar Notícia) - SEM o middleware de upload
router.post("/", createNews);

// Rota GET (Listar)
router.get("/", getNews);

// Rota DELETE (Apagar)
router.delete("/:id", deleteNews);

export default router;