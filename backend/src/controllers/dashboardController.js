import { db } from "../config/firebase.js";

/**
 * @route GET /api/dashboard/stats
 * @description Busca as estatísticas principais (KPIs)
 */
export const getStats = async (req, res, next) => {
  try {
    const usersCollection = db.collection('users');
    const studentQuery = usersCollection.where('role', '==', 'student').count().get();
    const teacherQuery = usersCollection.where('role', '==', 'teacher').count().get();
    const classQuery = db.collection('classes').count().get();

    const [studentSnapshot, teacherSnapshot, classSnapshot] = await Promise.all([
      studentQuery,
      teacherQuery,
      classQuery
    ]);

    const stats = {
      studentCount: studentSnapshot.data().count,
      teacherCount: teacherSnapshot.data().count,
      classCount: classSnapshot.data().count,
    };
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('[dashboardController:getStats] Erro:', error);
    next(error);
  }
};

/**
 * @route GET /api/dashboard/leaderboard
 * @description Busca Ranking (Com filtros de Turma ou Professor)
 */
export const getLeaderboard = async (req, res, next) => {
  try {
    const { classId, teacherId } = req.query;
    let usersQuery = db.collection('users').where('role', '==', 'student');

    // 1. FILTRO POR TURMA ESPECÍFICA (Prioridade)
    if (classId) {
      usersQuery = usersQuery.where('classId', '==', classId);
    } 
    // 2. FILTRO GERAL DO PROFESSOR (Todas as turmas dele)
    else if (teacherId) {
      // Busca quais turmas pertencem a este professor
      const classesSnap = await db.collection('classes').where('teacherId', '==', teacherId).get();
      
      if (classesSnap.empty) {
        // Se o professor não tem turmas, não tem alunos para mostrar
        return res.status(200).json([]);
      }

      const myClassIds = classesSnap.docs.map(doc => doc.id);

      // O Firestore tem limite para o operador 'in', mas para um professor funciona bem
      // Filtra apenas usuários que estão nas turmas deste professor
      if (myClassIds.length > 0) {
         // Pega os primeiros 30 IDs (limite do Firestore para IN é 30)
         // Se tiver mais que 30 turmas, precisaria de outra lógica, mas aqui serve.
         usersQuery = usersQuery.where('classId', 'in', myClassIds.slice(0, 30));
      }
    }

    // Ordena por pontos e limita
    const snapshot = await usersQuery.orderBy('points', 'desc').limit(10).get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    // Mapa auxiliar para pegar nomes das turmas
    const allClassesSnap = await db.collection('classes').get();
    const classMap = new Map();
    allClassesSnap.forEach(doc => classMap.set(doc.id, doc.data().name));

    const leaderboard = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        displayName: data.displayName,
        username: data.username,
        points: data.points || 0,
        className: data.classId ? (classMap.get(data.classId) || 'Sem Turma') : 'Sem Turma'
      };
    });
    
    res.status(200).json(leaderboard);

  } catch (error) {
    console.error('[dashboardController:getLeaderboard] Erro:', error);
    // Tratamento para erro de índice composto
    if (error.code === 'failed-precondition') {
       return res.status(500).json({ error: 'Erro de índice no Firebase. Verifique o console do servidor para o link de criação.' });
    }
    next(error);
  }
};