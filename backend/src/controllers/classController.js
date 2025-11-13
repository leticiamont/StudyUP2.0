// Importa o 'db' (instância do Firestore)
import { db } from '../config/firebase.js';

/**
 * @route GET /api/classes
 * @description Busca todas as turmas, com filtros.
 * @query search, gradeLevel, sort
 */
export const getClasses = async (req, res) => {
  try {
    const { search, gradeLevel, sort } = req.query;

    // 1. Buscar todas as "peças" em paralelo
    const [usersSnapshot, plansSnapshot] = await Promise.all([
      db.collection('users').get(),
      db.collection('plans').get(),
    ]);

    // 2. Criar "Mapas" para consulta rápida
    const userMap = new Map();
    usersSnapshot.forEach(doc => userMap.set(doc.id, doc.data().displayName));
    const planMap = new Map();
    plansSnapshot.forEach(doc => planMap.set(doc.id, doc.data().name));

    // 3. Montar a query de Turmas (com filtros)
    let query = db.collection('classes');

    // Filtro de Nível
    if (gradeLevel) {
      query = query.where('gradeLevel', '==', gradeLevel);
    }
    
    // Ordenação (precisa de índice no Firestore)
    const sortDirection = (sort === 'asc') ? 'asc' : 'desc';
    query = query.orderBy('createdAt', sortDirection);

    const classesSnapshot = await query.get();
    
    if (classesSnapshot.empty) {
      return res.status(200).json([]);
    }

    // 4. Montar a lista (com 'join' e filtro de 'search' manual)
    let classesList = classesSnapshot.docs.map(doc => {
      const turma = doc.data();
      return {
        id: doc.id,
        ...turma,
        teacherName: userMap.get(turma.teacherId) || `(ID: ${turma.teacherId})`,
        planName: planMap.get(turma.planId) || 'Nenhum'
      };
    });

    // 5. Filtro de Busca (manual, após pegar os dados)
    if (search) {
      classesList = classesList.filter(turma => 
        turma.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.status(200).json(classesList);

  } catch (error) {
    console.error('[classController:getClasses] Erro ao buscar turmas:', error);
    // Se o erro for de "Índice", o Firebase vai avisar no log
    if (error.code === 'failed-precondition') {
       return res.status(500).json({ error: 'Erro de query. O Firestore provavelmente precisa de um índice. Verifique o log do backend.' });
    }
    res.status(500).json({ error: 'Erro ao buscar turmas.', details: error.message });
  }
};

/**
 * @route POST /api/classes
 * @description Cria uma nova turma E ATRIBUI OS ALUNOS A ELA.
 */
export const createClass = async (req, res) => {
  try {
    // 1. Recebe os dados do "Super Modal"
    const { 
      name, 
      gradeLevel, 
      teacherId,
      planId,
      studentIds,
      schedule // <-- A LINHA QUE FALTAVA
    } = req.body;

    // Validação
    if (!name || !gradeLevel || !teacherId) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios ausentes: name, gradeLevel e teacherId são necessários.' 
      });
    }

    // 2. Monta o objeto da nova turma
    const newClassData = {
      name,
      gradeLevel,
      teacherId,
      planId: planId || null,
      schedule: schedule || 'N/A', // <-- CORREÇÃO: Salvando o horário
      studentCount: studentIds ? studentIds.length : 0,
      createdAt: new Date().toISOString(),
    };

    // 3. Cria a turma no Firestore
    const classDocRef = await db.collection('classes').add(newClassData);
    const newClassId = classDocRef.id;

    console.log(`[classController:createClass] Turma ${newClassId} criada.`);

    // 4. A MÁGICA: Atualiza os alunos
    if (studentIds && studentIds.length > 0) {
      const batch = db.batch();
      studentIds.forEach(studentId => {
        const studentDocRef = db.collection('users').doc(studentId);
        batch.update(studentDocRef, { classId: newClassId });
      });
      await batch.commit();
      console.log(`[classController:createClass] ${studentIds.length} alunos atualizados com o classId: ${newClassId}`);
    }

    // 5. Retorna 201 (Created)
    res.status(201).json({
      id: newClassId,
      ...newClassData
    });

  } catch (error) {
    console.error('[classController:createClass] Erro ao criar turma ou atribuir alunos:', error);
    res.status(500).json({ 
      error: 'Erro ao criar turma.', 
      details: error.message 
    });
  }
};

/**
 * @route GET /api/classes/:id
 * @description Busca uma turma específica pelo ID
 */
export const getClassById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const docRef = db.collection('classes').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Turma não encontrada." });
    }

    // Também busca os alunos *atualmente* nesta turma
    const studentSnapshot = await db.collection('users')
      .where('classId', '==', id)
      .where('role', '==', 'student')
      .get();
      
    const studentIds = studentSnapshot.docs.map(doc => doc.id);

    res.status(200).json({
      id: doc.id,
      ...doc.data(),
      studentIds: studentIds // Envia a lista de alunos atuais
    });

  } catch (error) {
    console.error('[classController:getClassById] Erro:', error);
    next(error);
  }
};


/**
 * @route PUT /api/classes/:id
 * @description Atualiza uma turma E reatribui os alunos
 */
export const updateClass = async (req, res, next) => {
  try {
    const { id } = req.params; // ID da Turma
    const { name, gradeLevel, teacherId, planId, schedule, studentIds } = req.body;

    if (!name || !gradeLevel || !teacherId) {
      return res.status(400).json({ error: "Nome, Nível e Professor são obrigatórios." });
    }

    const classRef = db.collection('classes').doc(id);

    // 1. Atualiza os dados principais da Turma
    await classRef.update({
      name,
      gradeLevel,
      teacherId,
      planId: planId || null,
      schedule: schedule || 'N/A',
      studentCount: studentIds ? studentIds.length : 0,
      // (Não atualiza 'createdAt')
    });

    console.log(`[classController:updateClass] Turma ${id} atualizada.`);

    // 2. LÓGICA DE ATUALIZAÇÃO DE ALUNOS (A parte complexa)
    
    // Pega os IDs dos alunos que *estavam* na turma ANTES
    const oldStudentSnapshot = await db.collection('users')
      .where('classId', '==', id)
      .get();
    const oldStudentIds = oldStudentSnapshot.docs.map(doc => doc.id);
    
    // Pega os IDs dos alunos que *devem* estar na turma AGORA
    const newStudentIds = studentIds || [];

    // Compara as listas
    const studentsToAdd = newStudentIds.filter(sid => !oldStudentIds.includes(sid));
    const studentsToRemove = oldStudentIds.filter(sid => !newStudentIds.includes(sid));

    // 3. Usa um Lote (Batch) para as atualizações
    const batch = db.batch();

    // Adiciona os novos
    studentsToAdd.forEach(studentId => {
      const studentRef = db.collection('users').doc(studentId);
      batch.update(studentRef, { classId: id }); // Seta o ID da turma
    });

    // Remove os antigos
    studentsToRemove.forEach(studentId => {
      const studentRef = db.collection('users').doc(studentId);
      batch.update(studentRef, { classId: null }); // Limpa o ID da turma
    });

    // 4. Executa o lote
    if (studentsToAdd.length > 0 || studentsToRemove.length > 0) {
      await batch.commit();
      console.log(`[classController:updateClass] Alunos atualizados: ${studentsToAdd.length} adicionados, ${studentsToRemove.length} removidos.`);
    }

    res.status(200).json({ message: "Turma atualizada com sucesso." });

  } catch (error) {
    console.error('[classController:updateClass] Erro:', error);
    next(error);
  }
};