import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import dotenv from "dotenv";

// Rotas
import newsRoutes from "./routes/newsRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import iaRoutes from "./routes/iaRoutes.js";
import planRoutes from "./routes/planRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import contentRoutes from "./routes/contentRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";

dotenv.config();

const app = express();

// Configuração CORS (Importante para o Mobile e Web funcionarem juntos)
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // Adicionado PATCH
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 })); // Aumentei limite para testes
app.use(express.json());
app.use("/uploads", express.static(path.resolve("uploads")));

// Registro de Rotas
app.use("/api/news", newsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/ia", iaRoutes);
app.use("/api/forum/posts", postRoutes);
app.use("/api/forum/posts/:postId/comments", commentRoutes);
app.use("/api/contents", contentRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});