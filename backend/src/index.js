console.log("--- O SERVIDOR REINICIOU COM SUCESSO E LEU ESTE ARQUIVO ---"); 
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import newsRoutes from "./routes/newsRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import iaRoutes from "./routes/iaRoutes.js";
import planRoutes from "./routes/planRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import contentRoutes from "./routes/contentRoutes.js";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const app = express();

app.use(cors({
  origin: ["http://localhost:3001", "http://localhost:5173", "http://localhost:8081" ], // as portas do front
  credentials: true
}));

app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100
}));
app.use(express.json());
app.use("/uploads", express.static(path.resolve("uploads")));


app.use("/api/news", newsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/ia", iaRoutes);
app.use("/api/forum/posts/:postId/comments", commentRoutes); 
app.use("/api/forum/posts", postRoutes); 
app.use("/api/contents", contentRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
