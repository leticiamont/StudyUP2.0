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
 * @description Busca o Top 5 alunos por pontos (gamificação)
 */
export const getLeaderboard = async (req, res, next) => {
  try {
    const usersCollection = db.collection('users');
    
    // Query: Aonde 'role' == 'student', 
    // Ordene por 'points' (descendente), 
    // Limite a 5 resultados
    const snapshot = await usersCollection
      .where('role', '==', 'student')
      .orderBy('points', 'desc')
      .limit(5)
      .get();
      
    // ALERTA DE ÍNDICE: Esta query (where + orderBy) vai exigir um
    // índice composto no Firestore. O log do backend vai dar o link.

    if (snapshot.empty) {
      return res.status(200).json([]);
    }
    
    const leaderboard = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        displayName: data.displayName,
        username: data.username,
        points: data.points || 0 // Garante que é 0 se 'undefined'
      };
    });
    
    res.status(200).json(leaderboard);

  } catch (error) {
    console.error('[dashboardController:getLeaderboard] Erro ao buscar leaderboard:', error);
    // Se o erro for de "Índice", o Firebase vai avisar no log
    if (error.code === 'failed-precondition') {
       return res.status(500).json({ error: 'Erro de query. O Firestore provavelmente precisa de um índice. Verifique o log do backend.' });
    }
    next(error);
  }
};