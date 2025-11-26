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
      // Se cair aqui, é porque o usuário tá no Auth mas não no Banco
      console.error("Usuário não encontrado no Firestore:", uid); 
      return res.status(404).json({ message: "Utilizador não encontrado." });
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