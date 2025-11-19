import express from "express";
import { upload } from "../middlewares/upload.js";
const router = express.Router();

router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado" });
  }

  return res.json({
    message: "Upload concluído",
    filename: req.file.filename,
    path: `/uploads/${req.file.filename}`
  });
});

export default router;
