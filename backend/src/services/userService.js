import { db, admin } from "../config/firebase.js";

// --- Helpers ---

const gerarUsername = (nomeCompleto) => {
  if (!nomeCompleto) return 'usuario.indefinido';
  // Remove acentos, minúsculo, divide por espaço
  const partes = nomeCompleto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ');
  if (partes.length === 1) return partes[0];
  return `${partes[0]}.${partes[partes.length - 1]}`;
};

const gerarSenhaProvisoria = () => 'studyup123';
const gerarSenhaProfessor = () => 'professor123';

/**
 * Converte data DD/MM/AAAA para ISO AAAA-MM-DD
 */
const parseDate = (dateString) => {
  if (!dateString) return null;
  const [day, month, year] = dateString.split('/');
  if (!day || !month || !year || year.length !== 4) return null;
  return `${year}-${month}-${day}T12:00:00Z`;
};

const userService = {
  /**
   * @description Criar usuário (individual ou via lote)
   */
  async createUser(data) {
    // GARANTIA DE DADOS:
    // Vamos garantir que gradeLevel e schoolYear não se misturem.
    const { email, password, displayName, role, dateOfBirth, gradeLevel, schoolYear } = data;
    
    const isStudent = (role === 'student');
    
    let finalPassword = data.password;
    let finalUsername;
    let finalEmail = email;

    if (isStudent) {
      finalUsername = data.username || gerarUsername(displayName);
      finalEmail = `${finalUsername}@studyup.com`;
      finalPassword = gerarSenhaProvisoria();
    } else {
      finalUsername = email;
      if (!finalPassword) finalPassword = gerarSenhaProfessor();
    }
    
    let userRecord;
    let isUnique = false;
    let counter = 1;

    while (!isUnique) {
      try {
        userRecord = await admin.auth().createUser({
          email: finalEmail,
          password: finalPassword,
          displayName: displayName,
        });
        isUnique = true;
      } catch (error) {
        if (error.code === 'auth/email-already-exists' && isStudent) {
          finalUsername = `${data.username || gerarUsername(displayName)}${counter}`;
          finalEmail = `${finalUsername}@studyup.com`;
          counter++;
        } else { throw error; }
      }
    }
    
    // SALVANDO NO FIRESTORE
    await db.collection("users").doc(userRecord.uid).set({
      displayName,
      email: finalEmail,
      username: finalUsername,
      role,
      dateOfBirth: dateOfBirth || null,
      
      // CORREÇÃO AQUI: Garante que salvamos o que veio do form
      gradeLevel: gradeLevel || null, // Deve ser "Fundamental 2"
      schoolYear: schoolYear || null, // Deve ser "9º Ano"
      
      points: 0,
      uid: userRecord.uid,
      createdAt: new Date().toISOString(),
      isActive: true, 
      needsPasswordChange: true 
    });

    return { 
      message: "Usuário criado com sucesso!", 
      uid: userRecord.uid,
      username: finalUsername,
      password: finalPassword 
    };
  },

  /**
   * @description Ativar/Desativar usuário
   */
  async toggleUserStatus(id, isActive) {
    // Auth: disabled é o oposto de isActive
    await admin.auth().updateUser(id, { disabled: !isActive });
    // Firestore: atualiza visual
    await db.collection("users").doc(id).update({ isActive: isActive });
    return { id, isActive };
  },

  /**
   * @description Reseta a senha de um aluno (Fase 4)
   */
  async resetPassword(id) {
    // Gera nova senha aleatória simples (ex: reset4829)
    const newPassword = 'reset' + Math.floor(1000 + Math.random() * 9000);
    
    // Força no Auth
    await admin.auth().updateUser(id, { password: newPassword });
    
    // Marca flag no Firestore
    await db.collection("users").doc(id).update({ needsPasswordChange: true });
    
    return { newPassword };
  },

  /**
   * @description Busca usuários com filtros
   */
  async getAllUsers(role, gradeLevel, sort, search, classId) { 
    let query = db.collection("users");
    query = query.where("role", "==", role);
    
    if (gradeLevel) query = query.where("gradeLevel", "==", gradeLevel);
    if (classId) query = query.where("classId", "==", classId);
    
    // Ordenação Opcional (Evita erro de índice se não for pedido)
    if (sort) {
      const sortDirection = (sort === 'asc') ? 'asc' : 'desc';
      query = query.orderBy("displayName", sortDirection);
    } else {
      query = query.orderBy("createdAt", "desc");
    }
    
    const snapshot = await query.get();
    let usersList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Filtro de Busca Manual (Nome ou Username)
    if (search) {
      usersList = usersList.filter(user => 
        user.displayName.toLowerCase().includes(search.toLowerCase()) ||
        (user.username && user.username.toLowerCase().includes(search.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(search.toLowerCase()))
      );
    }
    return usersList;
  },

  /**
   * @description Pré-visualização de Importação em Lote
   */
  async previewBatchUsers(alunosDoCsv) {
    const listaValidada = [];
    const erros = [];
    
    for (const aluno of alunosDoCsv) {
      // Tenta ler com nomes amigáveis ou chaves diretas
      const displayName = aluno["NomeCompleto"] || aluno["Nome Completo"]; 
      const dateString = aluno["DataNascimento"] || aluno["Data de Nascimento"];
      const gradeLevel = aluno["NivelEscolar"] || aluno["Nível Escolar"];
      const schoolYear = aluno["AnoSerie"] || aluno["Ano/Série"]; // Opcional no CSV por enquanto

      if (!displayName || !dateString || !gradeLevel) {
        erros.push({ linha: displayName || "Linha Vazia", erro: "Colunas obrigatórias em falta (Nome, Data, Nível)." });
        continue;
      }
      
      const dateOfBirth = parseDate(dateString);
      if (dateOfBirth === null) {
         erros.push({ linha: displayName, erro: "Data inválida. Use DD/MM/AAAA." });
         continue;
      }
      
      const username = gerarUsername(displayName);
      
      listaValidada.push({
        displayName, 
        dateOfBirth, 
        gradeLevel, 
        schoolYear: schoolYear || '',
        username,
        email: `${username}@studyup.com`,
        password: gerarSenhaProvisoria(),
        role: 'student'
      });
    }
    return { listaValidada, erros };
  },
  
  /**
   * @description Confirmação de Importação em Lote
   */
  async confirmBatchUsers(listaDeAlunos) {
    const relatorio = { sucessos: 0, falhas: 0, detalhesFalhas: [] };
    for (const dadosAluno of listaDeAlunos) {
      try {
        await this.createUser(dadosAluno);
        relatorio.sucessos++;
      } catch (error) {
        relatorio.falhas++;
        relatorio.detalhesFalhas.push({ nome: dadosAluno.displayName, erro: error.message });
      }
    }
    return relatorio;
  },

  async getUserById(id) {
    const doc = await db.collection("users").doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async updateUser(id, data) {
    const { displayName, email, role, dateOfBirth, gradeLevel, schoolYear } = data;
    if (!displayName) throw new Error("Nome obrigatório.");

    if (role === 'teacher') {
      if (!email) throw new Error("Email obrigatório.");
      await admin.auth().updateUser(id, { email, displayName });
      await db.collection("users").doc(id).update({ 
        displayName, email, username: email 
      });
    } else {
      // Aluno
      await admin.auth().updateUser(id, { displayName });
      await db.collection("users").doc(id).update({ 
        displayName, 
        dateOfBirth: dateOfBirth || null, 
        gradeLevel: gradeLevel || null,
        schoolYear: schoolYear || null
      });
    }
    return { id };
  },

  async deleteUser(id) {
    await admin.auth().deleteUser(id);
    await db.collection("users").doc(id).delete();
    return { message: "Deletado." };
  },

/**
   * @description DEDUZ PONTOS DO USUÁRIO (XP) - FUNÇÃO DE GAMIFICAÇÃO
   * @param uid (string) - ID do usuário
   * @param amount (number) - Quantidade a deduzir
   */
  async deductPoints(uid, amount) {
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("Usuário não encontrado.");
    }
    
    const currentPoints = userDoc.data().points || 0;
    const newPoints = currentPoints - amount;
    
    if (newPoints < 0) {
        throw new Error("Pontos insuficientes.");
    }

    await userRef.update({
        points: newPoints
    });

    return { newPoints };
  },
};

export default userService;