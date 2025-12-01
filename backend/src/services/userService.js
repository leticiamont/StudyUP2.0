import { db, admin } from "../config/firebase.js";

// --- Helpers ---
const gerarUsername = (nomeCompleto) => {
  if (!nomeCompleto) return 'usuario.indefinido';
  const partes = nomeCompleto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ');
  if (partes.length === 1) return partes[0];
  return `${partes[0]}.${partes[partes.length - 1]}`;
};

const gerarSenhaAluno = () => 'studyup123';
const gerarSenhaProfessor = () => 'professor123';
const gerarSenhaProvisoria = () => 'studyup123'; // Fallback

const parseDate = (dateString) => {
  if (!dateString) return null;
  const [day, month, year] = dateString.split('/');
  if (!day || !month || !year || year.length !== 4) return null;
  return `${year}-${month}-${day}T12:00:00Z`;
};

const userService = {
  /**
   * @description Criar usuário
   */
  async createUser(data) {
    const { email, displayName, role, dateOfBirth, gradeLevel, schoolYear } = data;
    const isStudent = (role === 'student');
    
    let finalPassword = data.password;
    let finalUsername;
    let finalEmail = email;

    if (isStudent) {
      finalUsername = data.username || gerarUsername(displayName);
      finalEmail = `${finalUsername}@studyup.com`;
      finalPassword = gerarSenhaAluno();
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
    
    await db.collection("users").doc(userRecord.uid).set({
      displayName,
      email: finalEmail,
      username: finalUsername,
      role,
      dateOfBirth: dateOfBirth || null,
      gradeLevel: gradeLevel || null,
      schoolYear: schoolYear || null,
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
   * @description Reseta a senha para o PADRÃO
   */
  async resetPassword(id) {
    const userDoc = await db.collection("users").doc(id).get();
    if (!userDoc.exists) throw new Error("Usuário não encontrado.");
    
    const userData = userDoc.data();
    let newPassword;
    
    if (userData.role === 'student') {
      newPassword = gerarSenhaAluno();
    } else if (userData.role === 'teacher' || userData.role === 'professor') {
      newPassword = gerarSenhaProfessor();
    } else {
      newPassword = 'admin123';
    }
    
    await admin.auth().updateUser(id, { password: newPassword });
    await db.collection("users").doc(id).update({ needsPasswordChange: true });
    
    return { newPassword };
  },

  async toggleUserStatus(id, isActive) {
    await admin.auth().updateUser(id, { disabled: !isActive });
    await db.collection("users").doc(id).update({ isActive: isActive });
    return { id, isActive };
  },

  async getAllUsers(role, gradeLevel, sort, search, classId) { 
    let query = db.collection("users");
    query = query.where("role", "==", role);
    if (gradeLevel) query = query.where("gradeLevel", "==", gradeLevel);
    if (classId) query = query.where("classId", "==", classId);
    
    if (sort) {
        const sortDirection = (sort === 'asc') ? 'asc' : 'desc';
        query = query.orderBy("displayName", sortDirection);
    } else {
        query = query.orderBy("createdAt", "desc");
    }
    
    const snapshot = await query.get();
    let usersList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (search) {
      usersList = usersList.filter(user => 
        user.displayName.toLowerCase().includes(search.toLowerCase()) ||
        (user.username && user.username.toLowerCase().includes(search.toLowerCase()))
      );
    }
    return usersList;
  },

  async previewBatchUsers(alunosDoCsv) {
    const listaValidada = [];
    const erros = [];
    for (const aluno of alunosDoCsv) {
      const displayName = aluno["NomeCompleto"] || aluno["Nome Completo"];
      const dateString = aluno["DataNascimento"] || aluno["Data de Nascimento"];
      const gradeLevel = aluno["NivelEscolar"] || aluno["Nível Escolar"];
      const schoolYear = aluno["AnoSerie"] || aluno["Ano/Série"];

      if (!displayName || !dateString || !gradeLevel) {
        erros.push({ linha: displayName || "Linha Vazia", erro: "Colunas em falta." });
        continue;
      }
      const dateOfBirth = parseDate(dateString);
      if (dateOfBirth === null) {
         erros.push({ linha: displayName, erro: "Data inválida." });
         continue;
      }
      const username = gerarUsername(displayName);
      
      listaValidada.push({
        displayName, dateOfBirth, gradeLevel, schoolYear: schoolYear || '',
        username, email: `${username}@studyup.com`,
        password: gerarSenhaAluno(), role: 'student'
      });
    }
    return { listaValidada, erros };
  },
  
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
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async updateUser(id, data) {
    const { displayName, email, role, dateOfBirth, gradeLevel, schoolYear } = data;
    if (!displayName) throw new Error("Nome obrigatório.");

    if (role === 'teacher') {
      await admin.auth().updateUser(id, { email, displayName });
      await db.collection("users").doc(id).update({ displayName, email, username: email });
    } else {
      await admin.auth().updateUser(id, { displayName });
      await db.collection("users").doc(id).update({ displayName, dateOfBirth, gradeLevel, schoolYear });
    }
    return { id };
  },

  async deleteUser(id) {
    await admin.auth().deleteUser(id);
    await db.collection("users").doc(id).delete();
    return { message: "Deletado." };
  },
  
  async deductPoints(uid, amount) {
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) throw new Error("Usuário não encontrado.");
    const currentPoints = userDoc.data().points || 0;
    const newPoints = currentPoints - amount;
    if (newPoints < 0) throw new Error("Pontos insuficientes.");
    await userRef.update({ points: newPoints });
    return { newPoints };
  },
};

export default userService;