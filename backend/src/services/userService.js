// src/services/userService.js
import { db } from "../config/firebase.js";

const userService = {
  // Criar usuário
  async createUser(data) {
    // 🔒 Campos permitidos para cadastro
    const allowedFields = ["nome", "email", "senha", "tipo", "foto"];
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([key]) => allowedFields.includes(key))
    );

    const docRef = await db.collection("users").add(filteredData);
    return { id: docRef.id, ...filteredData };
  },

  // Listar todos os usuários
  async getAllUsers() {
    const snapshot = await db.collection("users").get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  // Buscar usuário por ID
  async getUserById(id) {
    const doc = await db.collection("users").doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  // Atualizar usuário
  async updateUser(id, data) {
    const allowedFields = ["nome", "email", "senha", "tipo", "foto"];
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([key]) => allowedFields.includes(key))
    );

    const userRef = db.collection("users").doc(id);
    const doc = await userRef.get();
    if (!doc.exists) {
      throw new Error("Usuário não encontrado");
    }

    await userRef.update(filteredData);
    return { id, ...filteredData };
  },

  // Deletar usuário
  async deleteUser(id) {
    const userRef = db.collection("users").doc(id);
    const doc = await userRef.get();
    if (!doc.exists) {
      throw new Error("Usuário não encontrado");
    }

    await userRef.delete();
    return { message: "Usuário deletado com sucesso!" };
  },
};

export default userService;
