import { auth, db } from "../config/firebase.js";

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email e senha são obrigatórios" });
    }

    // Autentica o usuário com Firebase Auth
    const userRecord = await auth.getUserByEmail(email).catch(() => null);

    if (!userRecord) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Aqui você pode usar signInWithEmailAndPassword do Firebase Client
    // (no front), ou só validar o e-mail e buscar dados adicionais no Firestore

    // Busca o papel (role) do usuário no Firestore
    const userDoc = await db.collection("users").doc(userRecord.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "Dados do usuário não encontrados no Firestore" });
    }

    const userData = userDoc.data();

    res.status(200).json({
      message: "Login realizado com sucesso",
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        role: userData.role || "aluno",
        name: userData.name || "",
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ message: "Erro interno ao realizar login" });
  }
};
