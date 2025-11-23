import express from "express";
import { upload } from "../middlewares/upload.js";
import { uploadContent, getContents, deleteContent, updateContent } from "../controllers/contentController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getContents);
router.post("/upload", authMiddleware, upload.single("file"), uploadContent);
router.delete("/:id", authMiddleware, deleteContent);
router.put("/:id", authMiddleware, updateContent);

export default router;