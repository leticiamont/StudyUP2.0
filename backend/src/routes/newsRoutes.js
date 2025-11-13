import { Router } from "express";
import { createNews, getNews, deleteNews } from "../controllers/newsController.js";

const router = Router();

// Endpoint para criar notícia
router.post("/", createNews);

// Endpoint para listar as últimas notícias
router.get("/", getNews);

// Endpoint para apagar uma notícia
router.delete("/:id", deleteNews);

export default router;