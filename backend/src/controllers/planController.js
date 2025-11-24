import { db } from "../config/firebase.js";

/**
 * @route POST /api/plans
 * @description Cria um NOVO plano (Aceita módulos/conteúdo se vierem)
 */
export const createPlan = async (req, res) => {
  try {
    // MUDANÇA: Agora pegamos 'modules' e 'content' do corpo da requisição
    const { name, gradeLevel, modules, content } = req.body;
    
    const authorId = req.user ? req.user.uid : null; 

    if (!name || !gradeLevel) {
      return res.status(400).json({ error: 'Nome e Nível Escolar são obrigatórios.' });
    }

    const newPlan = {
      name,
      gradeLevel,
      // MUDANÇA: Se vierem módulos (ex: da IA), usa eles. Se não, começa vazio.
      modules: modules || [], 
      content: content || "", // Fallback para texto simples
      authorId,    
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('plans').add(newPlan);
    
    res.status(201).json({ 
      message: 'Plano criado com sucesso.',
      id: docRef.id,
      ...newPlan
    });

  } catch (error) {
    console.error('[planController:createPlan] Erro:', error);
    res.status(500).json({ error: 'Erro ao criar plano.', details: error.message });
  }
};

/**
 * @route GET /api/plans
 * @description Busca TODOS os planos
 */
export const getPlans = async (req, res) => {
  try {
    const { search, gradeLevel, classId } = req.query;
    const userId = req.user ? req.user.uid : null;

    let query = db.collection('plans');

    // Filtro de Turma (para mostrar o plano daquela turma)
    if (classId) {
      query = query.where('classId', '==', classId);
    }
    // Filtro de Nível
    if (gradeLevel) {
      query = query.where('gradeLevel', '==', gradeLevel);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    let plansList = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
    }));

    // Filtro de busca por nome
    if (search) {
      plansList = plansList.filter(plano => 
        plano.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Ordenação manual por data (mais recentes primeiro)
    plansList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json(plansList);

  } catch (error) {
    console.error('[planController:getPlans] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar planos.', details: error.message });
  }
};

/**
 * @route GET /api/plans/:id
 * @description Busca UM plano específico
 */
export const getPlanById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const docRef = db.collection('plans').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Plano de aula não encontrado." });
    }
    
    res.status(200).json({ id: doc.id, ...doc.data() });

  } catch (error) {
    console.error('[planController:getPlanById] Erro:', error);
    next(error);
  }
};

/**
 * @route PUT /api/plans/:id
 * @description ATUALIZA um plano
 */
export const updatePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Pega tudo que veio no body para permitir atualizar qualquer campo (modules, classId, etc)
    const updates = req.body; 

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Nenhum dado para atualizar." });
    }

    const docRef = db.collection('plans').doc(id);
    await docRef.update(updates);

    res.status(200).json({ message: "Plano atualizado com sucesso." });

  } catch (error) {
    console.error('[planController:updatePlan] Erro:', error);
    next(error);
  }
};

/**
 * @route DELETE /api/plans/:id
 * @description APAGA um plano
 */
export const deletePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.collection('plans').doc(id).delete();
    res.status(200).json({ message: "Plano apagado com sucesso." });
  } catch (error) {
    console.error('[planController:deletePlan] Erro:', error);
    next(error);
  }
};