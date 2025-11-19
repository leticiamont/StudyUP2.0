import { admin, db } from "../config/firebase.js";

export async function login(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token não fornecido" });

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    return res.status(200).json({
      message: "Login verificado com sucesso",
      user: {
        uid,
        email: decoded.email || userData.email || null,
        role: userData.role || "student",
        name: userData.name || userData.displayName || "",
      },
    });
  } catch (err) {
    console.error("Auth login error:", err);
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }
}
