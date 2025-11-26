import { db } from '../config/firebase.js';

/**
 * @route GET /api/classes
 * @description Busca todas as turmas, JUNTANDO os nomes de prof/plano.
 */
export const getClasses = async (req, res) => {
  try {
    const { search, gradeLevel, sort } = req.query;

    const [usersSnapshot, plansSnapshot, classesSnapshot] = await Promise.all([
      db.collection('users').get(),
      db.collection('plans').get(),
      db.collection('classes').orderBy('createdAt', 'desc').get()
    ]);

    const userMap = new Map();
    usersSnapshot.forEach(doc => userMap.set(doc.id, doc.data().displayName));

    const planMap = new Map();
    plansSnapshot.forEach(doc => planMap.set(doc.id, doc.data().name));

    if (classesSnapshot.empty) {
      return res.status(200).json([]);
    }

    let classesList = classesSnapshot.docs.map(doc => {
      const turma = doc.data();
      
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
    
    // Filtros Manuais (ex: busca)
    if (search) {
      classesList = classesList.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
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
      studentIds: studentIds 
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
      name, educationLevel, schoolYear, daysOfWeek, startTime, endTime, 
      teacherId, planId, studentIds, gradeLevel, schedule 
    } = req.body;

    if (!name || !teacherId) {
      return res.status(400).json({ error: 'Nome da turma e Professor são obrigatórios.' });
    }

    const newClassData = {
      name, teacherId, planId: planId || null,
      educationLevel: educationLevel || gradeLevel,
      schoolYear: schoolYear || '',
      daysOfWeek: daysOfWeek || [],
      startTime: startTime || '',
      endTime: endTime || '',
      gradeLevel: educationLevel || gradeLevel, 
      schedule: schedule || 'A definir',
      studentCount: studentIds ? studentIds.length : 0,
      createdAt: new Date().toISOString(),
    };

    const classDocRef = await db.collection('classes').add(newClassData);
    const newClassId = classDocRef.id;

    if (studentIds && studentIds.length > 0) {
      const batch = db.batch();
      studentIds.forEach(studentId => {
        const studentDocRef = db.collection('users').doc(studentId);
        batch.update(studentDocRef, { classId: newClassId, gradeLevel: newClassData.schoolYear });
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
 * @description Atualiza a turma e reatribui os alunos.
 */
export const updateClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      name, educationLevel, schoolYear, daysOfWeek, startTime, endTime,
      teacherId, planId, studentIds, gradeLevel, schedule 
    } = req.body;

    if (!name || !teacherId) {
      return res.status(400).json({ error: "Nome e Professor são obrigatórios." });
    }

    const classRef = db.collection('classes').doc(id);

    // 1. Atualiza dados da Turma
    const updateData = {
      name, teacherId, planId: planId || null,
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

    // 2. Lógica de Atualização de Alunos
    const oldStudentSnapshot = await db.collection('users').where('classId', '==', id).get();
    const oldStudentIds = oldStudentSnapshot.docs.map(doc => doc.id);
    const newStudentIds = studentIds || [];

    const studentsToAdd = newStudentIds.filter(sid => !oldStudentIds.includes(sid));
    const studentsToRemove = oldStudentIds.filter(sid => !newStudentIds.includes(sid));

    const batch = db.batch();

    // Adiciona novos
    studentsToAdd.forEach(studentId => {
      const ref = db.collection('users').doc(studentId);
      batch.update(ref, { classId: id, gradeLevel: updateData.schoolYear });
    });

    // Remove antigos
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

/**
 * @route DELETE /api/classes/:id
 * @description APAGA uma turma e DESVINCULA os alunos
 */
export const deleteClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Desvincula os alunos que estão nesta turma
    const studentsSnapshot = await db.collection('users').where('classId', '==', id).get();
    
    const batch = db.batch();
    studentsSnapshot.docs.forEach(doc => {
      const studentRef = db.collection('users').doc(doc.id);
      batch.update(studentRef, { classId: null }); 
    });
    
    await batch.commit();
    
    // Apaga a turma
    await db.collection('classes').doc(id).delete();
    
    res.status(200).json({ message: "Turma apagada com sucesso. Alunos desvinculados." });

  } catch (error) {
    console.error('[classController:deleteClass] Erro:', error);
    next(error);
  }
};