// Importa o 'db' (instância do Firestore)
import { db } from '../config/firebase.js';

/**
 * @route GET /api/plans
 * @description Busca todos os planos de aula base.
 */
export const getPlans = async (req, res) => {
  try {
    const plansCollection = db.collection('plans');
    // Ordena por 'gradeLevel' (Nível Escolar)
    const snapshot = await plansCollection.orderBy('gradeLevel', 'asc').get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    const plansList = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(plansList);

  } catch (error) {
    console.error('[planController:getPlans] Erro ao buscar planos:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar planos de aula.', 
      details: error.message 
    });
  }
};

/**
 * @route POST /api/plans
 * @description Cria um novo plano de aula base (Admin).
 * @body { name, gradeLevel }
 */
export const createPlan = async (req, res) => {
  try {
    // Usando o NOVO SCHEMA que definimos
    const { name, gradeLevel } = req.body;

    // Validação
    if (!name || !gradeLevel) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios ausentes: name e gradeLevel são necessários.' 
      });
    }

    const newPlan = {
      name,         // Ex: "Matemática - 6º Ano"
      gradeLevel,   // Ex: "6º Ano"
      baseContent: [], // Array de conteúdo base (MVP: começa vazio)
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('plans').add(newPlan);

    res.status(201).json({
      id: docRef.id,
      ...newPlan
    });

  } catch (error) {
    console.error('[planController:createPlan] Erro ao criar plano:', error);
    res.status(500).json({ 
      error: 'Erro ao criar plano.', 
      details: error.message 
    });
  }
};