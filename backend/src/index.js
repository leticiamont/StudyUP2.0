import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import iaRoutes from "./routes/iaRoutes.js";
import planRoutes from "./routes/planRoutes.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();

app.use(cors({
  origin: ["http://localhost:3001", "http://localhost:5173"], // as portas do front
  credentials: true
}));

app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100
}));
app.use(express.json());

app.use("/plans", planRoutes);
app.use("/users", userRoutes);
app.use("/auth", authRoutes);
app.use("/api/ia", iaRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
