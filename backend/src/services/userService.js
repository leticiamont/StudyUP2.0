import { db, admin } from "../config/firebase.js";

const userService = {
  /**
   * @description Criar usuário no Auth e Firestore
   * @param data { email, password, displayName, role }
   */
  async createUser(data) {
    // 1. Pega os dados originais enviados pelo frontend
    const { password, displayName, role } = data;
    const baseUsername = data.username; // ex: 'leticia.feitosa'
    
    let finalUsername = baseUsername;
    let finalEmail = data.email; // ex: 'leticia.feitosa@studyup.com'
    let userRecord;
    let isUnique = false;
    let counter = 1;

    // 2. Loop para garantir unicidade
    while (!isUnique) {
      try {
        // Tenta criar o usuário no Firebase Authentication
        console.log(`[UserService:createUser] Tentando criar com email: ${finalEmail}`);
        userRecord = await admin.auth().createUser({
          email: finalEmail,
          password: password,
          displayName: displayName,
        });
        
        // Se chegou aqui, o email é único! Pode sair do loop.
        isUnique = true;

      } catch (error) {
        // 3. Se deu erro, verifica se é de duplicata
        if (error.code === 'auth/email-already-exists') {
          // É duplicata. Gera um novo username e email para tentar de novo.
          console.warn(`[UserService:createUser] CONFLITO: Email ${finalEmail} já existe. Tentando próximo...`);
          finalUsername = `${baseUsername}${counter}`; // ex: 'leticia.feitosa1'
          finalEmail = `${finalUsername}@studyup.com`; // ex: 'leticia.feitosa1@studyup.com'
          counter++;
          // O loop 'while' vai rodar novamente com os novos dados
        } else {
          // É outro erro (senha fraca, email mal formatado, etc.)
          console.error('[UserService:createUser] Erro não esperado:', error.message);
          throw error; // Joga o erro para o controller
        }
      }
    }
    
    // 4. Se saiu do loop, o userRecord foi criado com sucesso no Auth.
    // Agora, salva os dados no Firestore.
    
    // Remove a senha do objeto 'data' original
    const { password: pw, ...userData } = data; 
    
    console.log(`[UserService:createUser] Sucesso. Salvando no Firestore com UID: ${userRecord.uid}`);
    await db.collection("users").doc(userRecord.uid).set({
      ...userData, // Salva os dados originais (displayName, role)
      username: finalUsername, // Salva o username ÚNICO que foi criado
      email: finalEmail,       // Salva o email FALSO e ÚNICO
      uid: userRecord.uid,
      createdAt: new Date().toISOString(),
    });

    // 5. Retorna as credenciais FINAIS para o frontend
    return { 
      message: "Usuário criado com sucesso!", 
      uid: userRecord.uid,
      username: finalUsername, // Devolve o username final
      password: password       // Devolve a senha provisória
    };
  },

  /**
   * @description Busca usuários, opcionalmente filtrando por 'role'
   * @param role (string | undefined) - ex: 'teacher' ou 'student'
   */
  async getAllUsers(role) {
    // Cria a consulta base
    let query = db.collection("users");

    // Se um 'role' foi fornecido, aplica o filtro
    if (role) {
      console.log(`[UserService:getAllUsers] Filtrando por role: ${role}`);
      // IMPORTANTE: Isso pode exigir um índice no Firestore. 
      // Se der erro no log, o Firebase dará um link para criar o índice.
      query = query.where("role", "==", role);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  async getUserById(id) {
    // (Sem mudanças)
    const doc = await db.collection("users").doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async updateUser(id, data) {
    // (Sem mudanças)
    await db.collection("users").doc(id).update(data);
    return { id, ...data };
  },

  async deleteUser(id) {
    // (Sem mudanças)
    await admin.auth().deleteUser(id);
    await db.collection("users").doc(id).delete();
    return { message: "Usuário deletado com sucesso!" };
  },
};

export default userService;