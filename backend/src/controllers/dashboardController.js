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
    const { classId, teacherId } = req.query;
    const usersCollection = db.collection('users');
    
    let query = usersCollection.where('role', '==', 'student');

    if (classId) {
        // Filtro por UMA turma específica
        query = query.where('classId', '==', classId);
    } 
    else if (teacherId) {
        // "Geral" do Professor (Todas as SUAS turmas)
        
        // 1. Busca os IDs das turmas desse professor
        const classesSnapshot = await db.collection('classes')
            .where('teacherId', '==', teacherId)
            .get();
            
        if (classesSnapshot.empty) {
            // Se o professor não tem turmas, não tem alunos para mostrar
            return res.status(200).json([]); 
        }

        const myClassIds = classesSnapshot.docs.map(doc => doc.id);

        // 2. Filtra alunos onde 'classId' esteja NA LISTA das minhas turmas
        // (O Firestore aceita até 30 itens no operador 'in')
        if (myClassIds.length > 0) {
            query = query.where('classId', 'in', myClassIds);
        } else {
            return res.status(200).json([]);
        }
    }

    // 3. Ordena por pontos
    const snapshot = await query
      .orderBy('points', 'desc')
      .limit(10)
      .get();
      
    if (snapshot.empty) {
      return res.status(200).json([]);
    }
    
    const leaderboard = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        displayName: data.displayName,
        username: data.username,
        points: data.points || 0 
      };
    });
    
    res.status(200).json(leaderboard);

  } catch (error) {
    console.error('[dashboardController:getLeaderboard] Erro:', error);
    if (error.code === 'failed-precondition') {
       return res.status(500).json({ error: 'Erro de índice no Firebase. Verifique o console do backend.' });
    }
    next(error);
  }
};