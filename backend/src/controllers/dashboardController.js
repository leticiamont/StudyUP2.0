import { db } from "../config/firebase.js";

/**
 * @route GET /api/dashboard/stats
 * @description Busca as estatísticas principais (KPIs)
 */
export const getStats = async (req, res, next) => {
  try {
    // 1. Busca as contagens de 'users' (alunos e professores)
    const usersCollection = db.collection('users');
    const studentQuery = usersCollection.where('role', '==', 'student').count().get();
    const teacherQuery = usersCollection.where('role', '==', 'teacher').count().get();
    
    // 2. Busca a contagem de 'classes'
    const classQuery = db.collection('classes').count().get();

    // 3. Executa tudo em paralelo
    const [studentSnapshot, teacherSnapshot, classSnapshot] = await Promise.all([
      studentQuery,
      teacherQuery,
      classQuery
    ]);

    // 4. Monta a resposta
    const stats = {
      studentCount: studentSnapshot.data().count,
      teacherCount: teacherSnapshot.data().count,
      classCount: classSnapshot.data().count,
    };
    
    res.status(200).json(stats);

  } catch (error) {
    console.error('[dashboardController:getStats] Erro ao buscar estatísticas:', error);
    next(error);
  }
};

/**
 * @route GET /api/dashboard/leaderboard
 * @description Busca Ranking (Geral do Professor ou Específico da Turma)
 */
export const getLeaderboard = async (req, res, next) => {
  try {
    const usersCollection = db.collection('users');
    
    // 1. Busca o Top 10 (antes era 5)
    const snapshot = await usersCollection
      .where('role', '==', 'student')
      .orderBy('points', 'desc')
      .limit(10) // <-- ALTERADO PARA 10
      .get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    // 2. Precisamos dos nomes das turmas.
    // Vamos buscar todas as turmas para criar um "Mapa" (ID -> Nome)
    // (É mais rápido do que buscar uma por uma dentro do loop)
    const classesSnapshot = await db.collection('classes').get();
    const classMap = new Map();
    classesSnapshot.forEach(doc => {
      classMap.set(doc.id, doc.data().name);
    });
    
    // 3. Monta a resposta com o nome da turma
    const leaderboard = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Pega o nome da turma usando o ID, ou mostra "Sem Turma"
      const className = data.classId ? (classMap.get(data.classId) || 'Turma Removida') : 'Sem Turma';

      return {
        id: doc.id,
        displayName: data.displayName,
        username: data.username,
        points: data.points || 0,
        className: className // <-- NOVO CAMPO
      };
    });
    
    res.status(200).json(leaderboard);

  } catch (error) {
    console.error('[dashboardController:getLeaderboard] Erro:', error);
    if (error.code === 'failed-precondition') {
       return res.status(500).json({ error: 'Erro de índice no Firebase. Verifique o log.' });
    }
    next(error);
  }
};