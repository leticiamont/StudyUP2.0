import { db } from "../config/firebase.js";

export const createPlan = async (req, res) => {
  try {
    const { title, description, grade } = req.body;

    const newPlan = {
      title,
      description,
      grade,
      createdAt: new Date(),
    };

    await db.collection("lessonPlans").add(newPlan);
    res.status(201).json({ message: "Plano criado com sucesso!" });
  } catch (error) {
    console.error("Erro ao criar plano:", error);
    res.status(500).json({ error: error.message });
  }
};
