import { admin } from "../config/firebase.js";

const authService = {
  async verifyToken(token) {
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      return decoded;
    } catch (error) {
      throw new Error("Token inválido");
    }
  }
};

export default authService;
