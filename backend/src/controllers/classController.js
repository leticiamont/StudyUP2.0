import { db } from '../config/firebase.js';

/**
 * @route GET /api/classes
 * @description Busca todas as turmas, JUNTANDO os nomes de prof/plano.
 * @query search, gradeLevel, sort
 */
export const getClasses = async (req, res) => {
  try {
    const { search, gradeLevel, sort } = req.query;

    // 1. Buscar todas as "peças" em paralelo
    const [usersSnapshot, plansSnapshot, classesSnapshot] = await Promise.all([
      db.collection('users').get(),
      db.collection('plans').get(),
      db.collection('classes').orderBy('createdAt', 'desc').get()
    ]);

    // 2. Criar "Mapas" para consulta rápida (ID -> Nome)
    const userMap = new Map();
    usersSnapshot.forEach(doc => userMap.set(doc.id, doc.data().displayName));

    const planMap = new Map();
    plansSnapshot.forEach(doc => planMap.set(doc.id, doc.data().name));

    // 3. Montar a lista de turmas
    if (classesSnapshot.empty) {
      return res.status(200).json([]);
    }

    let classesList = classesSnapshot.docs.map(doc => {
      const turma = doc.data();
      
      // Formata o horário para exibição na tabela se os novos campos existirem
      let displaySchedule = turma.schedule;
      if (turma.daysOfWeek && turma.startTime && turma.endTime) {
        displaySchedule = `${turma.daysOfWeek.join(', ')} ${turma.startTime}-${turma.endTime}`;
      }

      return {
        id: doc.id,
        ...turma,
        schedule: displaySchedule || 'N/A',
        teacherName: userMap.get(turma.teacherId) || `(ID: ${turma.teacherId})`,
        planName: planMap.get(turma.planId) || 'Nenhum'
      };
    });

    // 4. Filtros Manuais (se necessário)
    if (gradeLevel) {
      classesList = classesList.filter(c => c.gradeLevel === gradeLevel || c.educationLevel === gradeLevel);
    }
    
    if (search) {
      classesList = classesList.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.status(200).json(classesList);

  } catch (error) {
    console.error('[classController:getClasses] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar turmas.', details: error.message });
  }
};

/**
 * @route GET /api/classes/:id
 * @description Busca uma turma específica pelo ID (incluindo lista de alunos)
 */
export const getClassById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const docRef = db.collection('classes').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Turma não encontrada." });
    }

    // Busca os alunos que estão atualmente nesta turma
    const studentSnapshot = await db.collection('users')
      .where('classId', '==', id)
      .get();
      
    const studentIds = studentSnapshot.docs.map(doc => doc.id);

    res.status(200).json({
      id: doc.id,
      ...doc.data(),
      studentIds: studentIds // Retorna array de IDs para pré-selecionar no frontend
    });

  } catch (error) {
    console.error('[classController:getClassById] Erro:', error);
    next(error);
  }
};

/**
 * @route POST /api/classes
 * @description Cria uma nova turma e atribui alunos.
 */
export const createClass = async (req, res) => {
  try {
    const { 
      name, 
      educationLevel, // Novo
      schoolYear,     // Novo
      daysOfWeek,     // Novo (Array)
      startTime,      // Novo
      endTime,        // Novo
      
      teacherId,
      planId,
      studentIds,     // Array de alunos para vincular
      
      // Campos legados (mantidos para compatibilidade)
      gradeLevel, 
      schedule 
    } = req.body;

    // Validação Básica
    if (!name || !teacherId) {
      return res.status(400).json({ error: 'Nome da turma e Professor são obrigatórios.' });
    }

    // Monta o objeto
    const newClassData = {
      name,
      teacherId,
      planId: planId || null,
      
      // Novos campos detalhados
      educationLevel: educationLevel || gradeLevel,
      schoolYear: schoolYear || '',
      daysOfWeek: daysOfWeek || [],
      startTime: startTime || '',
      endTime: endTime || '',
      
      // Campos legados/derivados
      gradeLevel: educationLevel || gradeLevel, // Mantém compatibilidade
      schedule: schedule || 'A definir',
      
      studentCount: studentIds ? studentIds.length : 0,
      createdAt: new Date().toISOString(),
    };

    // 1. Cria a Turma
    const classDocRef = await db.collection('classes').add(newClassData);
    const newClassId = classDocRef.id;

    // 2. Atualiza os Alunos (Vincula à turma)
    if (studentIds && studentIds.length > 0) {
      const batch = db.batch();
      studentIds.forEach(studentId => {
        const studentDocRef = db.collection('users').doc(studentId);
        // Atualiza classId e também salva o nível/ano no aluno para facilitar filtros futuros
        batch.update(studentDocRef, { 
          classId: newClassId,
          gradeLevel: newClassData.schoolYear // Ex: "1º Ano"
        });
      });
      await batch.commit();
    }

    res.status(201).json({ id: newClassId, ...newClassData });

  } catch (error) {
    console.error('[classController:createClass] Erro:', error);
    res.status(500).json({ error: 'Erro ao criar turma.', details: error.message });
  }
};

/**
 * @route PUT /api/classes/:id
 * @description Atualiza a turma e reatribui alunos (remove antigos, adiciona novos).
 */
export const updateClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      name, educationLevel, schoolYear, daysOfWeek, startTime, endTime,
      teacherId, planId, studentIds,
      gradeLevel, schedule 
    } = req.body;

    const classRef = db.collection('classes').doc(id);

    // 1. Atualiza dados da Turma
    const updateData = {
      name,
      teacherId,
      planId: planId || null,
      educationLevel: educationLevel || gradeLevel,
      schoolYear: schoolYear || '',
      daysOfWeek: daysOfWeek || [],
      startTime: startTime || '',
      endTime: endTime || '',
      gradeLevel: educationLevel || gradeLevel,
      schedule: schedule || 'A definir',
      studentCount: studentIds ? studentIds.length : 0
    };

    await classRef.update(updateData);

    // 2. Lógica Inteligente de Alunos (Quem sai e quem entra)
    
    // Busca quem estava na turma antes
    const oldStudentSnapshot = await db.collection('users').where('classId', '==', id).get();
    const oldStudentIds = oldStudentSnapshot.docs.map(doc => doc.id);
    
    const newStudentIds = studentIds || [];

    // Calcula diferenças
    const studentsToAdd = newStudentIds.filter(sid => !oldStudentIds.includes(sid));
    const studentsToRemove = oldStudentIds.filter(sid => !newStudentIds.includes(sid));

    const batch = db.batch();

    // Adiciona novos (Vincula)
    studentsToAdd.forEach(studentId => {
      const ref = db.collection('users').doc(studentId);
      batch.update(ref, { 
        classId: id,
        gradeLevel: updateData.schoolYear // Atualiza o ano do aluno
      });
    });

    // Remove antigos (Desvincula)
    studentsToRemove.forEach(studentId => {
      const ref = db.collection('users').doc(studentId);
      batch.update(ref, { classId: null });
    });

    if (studentsToAdd.length > 0 || studentsToRemove.length > 0) {
      await batch.commit();
    }

    res.status(200).json({ message: "Turma atualizada com sucesso." });

  } catch (error) {
    console.error('[classController:updateClass] Erro:', error);
    next(error);
  }
};