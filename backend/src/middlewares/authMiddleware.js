import { admin, db } from "../config/firebase.js";

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    const userDoc = await db.collection("users").doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: "Utilizador autenticado não encontrado no banco de dados." });
    }

    req.user = {
      ...decoded, 
      ...userDoc.data() 
    };
    
    next(); 
  } catch (error) {
    res.status(401).json({ message: "Token inválido ou expirado" });
  }
};