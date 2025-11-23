import { db, admin } from "../config/firebase.js";


/**
 * @description Gera um username a partir do nome completo.
 * Ex: "Leticia Santos" -> "leticia.santos"
 */
const gerarUsername = (nomeCompleto) => {
  if (!nomeCompleto) return 'aluno.indefinido';
  // Remove acentos, passa para minúsculo, divide por espaço
  const partes = nomeCompleto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(' ');
  
  if (partes.length === 1) return partes[0];
  
  const primeiroNome = partes[0];
  const ultimoSobrenome = partes[partes.length - 1];
  
  return `${primeiroNome}.${ultimoSobrenome}`;
};

/**
 * @description Gera uma senha provisória padrão.
 */
const gerarSenhaProvisoria = () => 'studyup123';

/**
 * @description Converte data DD/MM/AAAA para um formato ISO (AAAA-MM-DD).
 */
const parseDate = (dateString) => {
  if (!dateString) return null;
  // Quebra a data 'DD/MM/AAAA'
  const [day, month, year] = dateString.split('/');
  // Validação simples
  if (!day || !month || !year || year.length !== 4) return null;
  // Retorna no formato ISO que o Firestore entende (AAAA-MM-DD)
  // Adicionamos T12:00:00Z para evitar problemas de fuso horário (Timezone)
  return `${year}-${month}-${day}T12:00:00Z`;
};

const userService = {
  /**
   * @description Criar usuário (individual) no Auth e Firestore
   * (Esta função agora lida com 'student' vs 'teacher')
   */
  async createUser(data) {
    const { email, password, displayName, role } = data;
    const isStudent = (role === 'student');

    // 1. Definir username e email final
    let finalUsername;
    let finalEmail = email;

    if (isStudent) {
      // Aluno: usa o 'username' gerado pelo frontend (ex: 'leticia.feitosa')
      finalUsername = data.username;
      // (O email já é o fake: 'leticia.feitosa@studyup.com')
    } else {
      // Professor/Admin: o 'username' é o próprio email (para o campo não ficar undefined)
      finalUsername = data.email;
    }
    
    let userRecord;
    let isUnique = false;
    let counter = 1;

    // 2. Loop para criar no Auth
    while (!isUnique) {
      try {
        userRecord = await admin.auth().createUser({
          email: finalEmail,
          password: password,
          displayName: displayName
        });
        isUnique = true;
      } catch (error) {
        // Só tenta 'username+1' se for um ALUNO com email duplicado
        if (error.code === 'auth/email-already-exists' && isStudent) {
          console.warn(`[UserService:createUser] CONFLITO: Email ${finalEmail} já existe.`);
          finalUsername = `${data.username}${counter}`; // ex: 'leticia.feitosa1'
          finalEmail = `${finalUsername}@studyup.com`;
          counter++;
        } else {
          // Se for prof com email duplicado, ou outro erro, falha (correto)
          throw error; 
        }
      }
    }

    // 3. Remove a senha
    const { password: pw, ...userData } = data; 

    // 4. Salva no Firestore
    await db.collection("users").doc(userRecord.uid).set({
      ...userData, // Salva displayName, role, dateOfBirth (se aluno), gradeLevel (se aluno)
      username: finalUsername, // Salva o username final
      email: finalEmail,       // Salva o email final
      points: 0,
      uid: userRecord.uid,
      createdAt: new Date().toISOString(),
      // Só força 'true' para alunos (Item 4 da nossa discussão anterior)
      needsPasswordChange: isStudent 
    });
    
    // 5. Retorna
    return { 
      message: "Usuário criado com sucesso!", 
      uid: userRecord.uid,
      username: finalUsername,
      password: password 
    };
  },
  
  /**
   * @description Busca usuários com filtros e ordenação
   * @param role (string)
   * @param gradeLevel (string | undefined)
   * @param sort (string | undefined)
   * @param search (string | undefined)
   * @param classId (string | undefined) 
   */
  async getAllUsers(role, gradeLevel, sort, search, classId) { 
    let query = db.collection("users");

    // 1. Filtro de Role
    query = query.where("role", "==", role);

    // 2. Filtro de Nível Escolar
    if (gradeLevel) {
      query = query.where("gradeLevel", "==", gradeLevel);
    }

    // 3. NOVO: Filtro de Turma (classId)
    if (classId) {
      query = query.where("classId", "==", classId);
    }
    
    // 4. Ordenação
    const sortDirection = (sort === 'asc') ? 'asc' : 'desc';
    query = query.orderBy("displayName", sortDirection);
    
    const snapshot = await query.get();

    let usersList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // 5. Filtro de Busca (Manual)
    if (search) {
      usersList = usersList.filter(user => 
        user.displayName.toLowerCase().includes(search.toLowerCase()) ||
        (user.username && user.username.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    return usersList;
  },

  /**
   * @description [NOVA] Apenas lê o CSV, valida e devolve a lista (sem salvar)
   * @param alunosDoCsv - Array de objetos do csv-parser
   */
  async previewBatchUsers(alunosDoCsv) {
    const listaValidada = [];
    const erros = [];

    for (const aluno of alunosDoCsv) {
      // Lê os cabeçalhos do CSV (com acentos/espaços)
      const displayName = aluno["Nome Completo"];
      const dateString = aluno["Data de Nascimento"];
      const gradeLevel = aluno["Nível Escolar"];

      // Validação
      if (!displayName || !dateString || !gradeLevel) {
        erros.push({ linha: displayName || "Linha Vazia", erro: "Colunas 'Nome Completo', 'Data de Nascimento' ou 'Nível Escolar' em falta." });
        continue;
      }
      
      const dateOfBirth = parseDate(dateString);
      if (dateOfBirth === null) {
         erros.push({ linha: displayName, erro: "Formato de data inválido. Use DD/MM/AAAA." });
         continue;
      }
      
      const username = gerarUsername(displayName);
      
      // Adiciona o aluno pré-validado à lista
      listaValidada.push({
        displayName,
        dateOfBirth,
        gradeLevel,
        username, // username base (createUser vai checar duplicatas)
        email: `${username}@studyup.com`,
        password: gerarSenhaProvisoria(),
        role: 'student'
      });
    }

    return { listaValidada, erros };
  },
  
  /**
   * @description Recebe uma lista JSON e salva no banco
   * @param listaDeAlunos - Array de objetos JSON (pré-validados)
   */
  async confirmBatchUsers(listaDeAlunos) {
    const relatorio = { sucessos: 0, falhas: 0, detalhesFalhas: [] };

    for (const dadosAluno of listaDeAlunos) {
      try {
        // Re-utiliza a função 'createUser' que já lida com tudo
        // (duplicatas, needsPasswordChange, etc.)
        await this.createUser(dadosAluno);
        relatorio.sucessos++;
      } catch (error) {
        relatorio.falhas++;
        relatorio.detalhesFalhas.push({ nome: dadosAluno.displayName, erro: error.message });
      }
    }
    console.log(`[UserService:confirmBatch] Processo concluído. Sucessos: ${relatorio.sucessos}, Falhas: ${relatorio.falhas}`);
    return relatorio;
  },

  /**
   * @description Busca um usuário único pelo ID (Firestore Doc ID / UID)
   */
  async getUserById(id) {
    const doc = await db.collection("users").doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  /**
   * @description Atualiza um usuário no Auth e no Firestore
   * (Esta função agora lida com 'student' vs 'teacher')
   * @param id (string) - O UID do usuário
   * @param data (object) - { displayName, email, role, dateOfBirth, gradeLevel }
   */
  async updateUser(id, data) {
    const { displayName, email, role, dateOfBirth, gradeLevel } = data;

    // 1. Validação
    if (!displayName) {
      throw new Error("Nome (displayName) é obrigatório.");
    }

    if (role === 'teacher') {
      // --- LÓGICA DE PROFESSOR ---
      if (!email) throw new Error("Email é obrigatório para professor.");
      try {
        await admin.auth().updateUser(id, {
          email: email,
          displayName: displayName,
        });
        console.log(`[UserService:updateUser] Auth (Professor) atualizado para UID: ${id}`);
      } catch (authError) {
        throw new Error(`Erro no Firebase Auth: ${authError.message}`);
      }
      
      const dataToFirestore = {
        displayName: displayName,
        email: email,
        username: email // Username do Prof é o email
      };
      await db.collection("users").doc(id).update(dataToFirestore);
      return { id, ...dataToFirestore };

    } else if (role === 'student') {
      // --- LÓGICA DE ALUNO ---
      try {
        // Alunos: só atualiza o nome no Auth. O email/login (username) NÃO MUDA.
        await admin.auth().updateUser(id, {
          displayName: displayName,
        });
        console.log(`[UserService:updateUser] Auth (Aluno) atualizado para UID: ${id}`);
      } catch (authError) {
        throw new Error(`Erro no Firebase Auth: ${authError.message}`);
      }

      // Prepara dados para o Firestore (só os campos editáveis)
      const dataToFirestore = {
        displayName: displayName,
        dateOfBirth: dateOfBirth || null,
        gradeLevel: gradeLevel || null
      };
      await db.collection("users").doc(id).update(dataToFirestore);
      return { id, ...dataToFirestore };

    } else {
      throw new Error("Role de usuário inválido para atualização.");
    }
  },

  /**
   * @description Deleta um usuário do Auth e do Firestore
   */
  async deleteUser(id) {
    // Deleta do Auth primeiro
    await admin.auth().deleteUser(id);
    // Depois deleta do Firestore
    await db.collection("users").doc(id).delete();
    return { message: "Usuário deletado com sucesso!" };
  },
};

export default userService;