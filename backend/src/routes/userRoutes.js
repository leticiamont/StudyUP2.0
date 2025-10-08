import { Router } from "express";
import { registerUser, getUser, getAllUsers, updateUser, deleteUser } from "../controllers/userController.js";
import { validateUser } from "../middlewares/validateUser.js";

const router = Router();

router.post("/", validateUser, registerUser);
router.get("/", getAllUsers);
router.get("/:id", getUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
