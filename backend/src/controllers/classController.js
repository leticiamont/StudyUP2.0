import { db } from '../config/firebase.js';

/**
 * @route GET /api/classes
 * @description Busca todas as turmas (já padronizadas).
 */
export const getClasses = async (req, res) => {
  try {
    const classesCollection = db.collection('classes');
    const snapshot = await classesCollection.orderBy('createdAt', 'desc').get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    const classesList = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(classesList);

  } catch (error) {
    console.error('[classController:getClasses] Erro ao buscar turmas:', error);
    res.status(500).json({ error: 'Erro ao buscar turmas.', details: error.message });
  }
};

/**
 * @route POST /api/classes
 * @description Cria uma nova turma (PADRONIZADA).
 * @body { name, gradeLevel, teacherName, schedule, planId }
 */
export const createClass = async (req, res) => {
  try {
    const { name, gradeLevel, teacherName, schedule, planId } = req.body;

    if (!name || !gradeLevel || !teacherName) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios ausentes: name, gradeLevel, teacherName são necessários.' 
      });
    }

    const newClass = {
      name,
      gradeLevel, // ex: "6º Ano"
      teacherName,  // ex: "Prof. Leh"
      schedule: schedule || 'A definir', // ex: "Seg 8h"
      planId: planId || null,
      studentCount: 0, // Padrão "Nº Alunos"
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('classes').add(newClass);

    res.status(201).json({
      id: docRef.id,
      ...newClass
    });

  } catch (error) {
    console.error('[classController:createClass] Erro ao criar turma:', error);
    res.status(500).json({ error: 'Erro ao criar turma.', details: error.message });
  }
};