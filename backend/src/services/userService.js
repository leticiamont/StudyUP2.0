import { db, admin } from "../config/firebase.js";

const userService = {
  // Criar usuário no Auth e Firestore
  async createUser(data) {
    // 1️⃣ Cria o usuário no Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: data.email,
      password: data.senha,
      displayName: data.nome,
    });

    // 2️⃣ Remove a senha antes de salvar no banco (segurança)
    const { senha, ...userData } = data;

    // 3️⃣ Adiciona dados no Firestore
    await db.collection("users").doc(userRecord.uid).set({
      ...userData,
      uid: userRecord.uid,
      criadoEm: new Date().toISOString(),
    });

    // 4️⃣ Retorna dados de confirmação
    return { message: "Usuário criado com sucesso!", uid: userRecord.uid };
  },

  async getAllUsers() {
    const snapshot = await db.collection("users").get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  async getUserById(id) {
    const doc = await db.collection("users").doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async updateUser(id, data) {
    await db.collection("users").doc(id).update(data);
    return { id, ...data };
  },

  async deleteUser(id) {
    await admin.auth().deleteUser(id);
    await db.collection("users").doc(id).delete();
    return { message: "Usuário deletado com sucesso!" };
  },
};

export default userService;
