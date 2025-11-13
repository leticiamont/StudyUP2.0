import { db } from "../config/firebase.js";

/**
 * @route POST /api/plans
 * @description Cria um NOVO plano (apenas o "container" inicial)
 * @body { name, gradeLevel }
 */
export const createPlan = async (req, res) => {
  try {
    const { name, gradeLevel } = req.body;
    if (!name || !gradeLevel) {
      return res.status(400).json({ error: 'Nome e Nível Escolar são obrigatórios.' });
    }

    // O Plano é criado VAZIO, como você sugeriu
    const newPlan = {
      name,
      gradeLevel,
      modules: [], // A grade começa vazia
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('plans').add(newPlan);
    
    // Retorna o ID do novo plano, para o frontend poder redirecionar
    res.status(201).json({ 
      message: 'Plano criado, redirecionando para o construtor...',
      id: docRef.id 
    });

  } catch (error) {
    console.error('[planController:createPlan] Erro:', error);
    res.status(500).json({ error: 'Erro ao criar plano.', details: error.message });
  }
};

/**
 * @route GET /api/plans
 * @description Busca TODOS os planos (para a lista principal)
 * @query search, gradeLevel
 */
export const getPlans = async (req, res) => {
  // ... (Esta função está 100% correta, sem mudanças) ...
  try {
    const { search, gradeLevel } = req.query;
    let query = db.collection('plans');
    if (gradeLevel) {
      query = query.where('gradeLevel', '==', gradeLevel);
    }
    query = query.orderBy('gradeLevel', 'asc');
    const snapshot = await query.get();
    if (snapshot.empty) return res.status(200).json([]);
    let plansList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (search) {
      plansList = plansList.filter(plano => 
        plano.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    res.status(200).json(plansList);
  } catch (error) {
    console.error('[planController:getPlans] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar planos.', details: error.message });
  }
};


/**
 * @route GET /api/plans/:id
 * @description Busca UM plano específico (para a página do "Construtor")
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
 * @description ATUALIZA um plano (salva a grade curricular inteira)
 * @body { name, gradeLevel, modules (o array completo) }
 */
export const updatePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, gradeLevel, modules } = req.body; // Recebe o objeto inteiro

    if (!name || !gradeLevel || !Array.isArray(modules)) {
      return res.status(400).json({ error: "Dados do plano inválidos." });
    }

    const docRef = db.collection('plans').doc(id);
    
    // 'update' substitui os campos
    await docRef.update({
      name,
      gradeLevel,
      modules // Salva o array de Módulos e Tópicos
    });

    res.status(200).json({ message: "Plano atualizado com sucesso." });

  } catch (error) {
    console.error('[planController:updatePlan] Erro:', error);
    next(error);
  }
};

/**
 * @route DELETE /api/plans/:id
 * @description APAGA um plano de aula
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