import { db } from "../config/firebase.js";

/**
 * @route GET /api/plans
 * @description Busca planos (Híbrido: Admin vê tudo, Prof vê os dele)
 */
export const getPlans = async (req, res) => {
  try {
    const { search, gradeLevel, classId, viewMode } = req.query;
    
    // CORREÇÃO: Usar optional chaining para definir userId (safe)
    const userId = req.user?.uid; 

    let query = db.collection('plans');

    if (classId) {
      // Mobile: Filtrar por turma específica
      query = query.where('classId', '==', classId);
    } else if (viewMode === 'admin' || !userId) {
      // Desktop Admin: Modo Admin -> MOSTRA TUDO
      // (Só entra aqui se for Desktop (userId null) ou se a query for forçada para Admin)
    } else {
      // Mobile: Professor -> Mostra "Meus Planos"
      // Este bloco só é atingido se userId for uma string válida (Auth OK)
      query = query.where('authorId', '==', userId); 
    }

    if (gradeLevel) {
      query = query.where('gradeLevel', '==', gradeLevel);
    }
    
    // Ordenação (seguro contra crash)
    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    if (snapshot.empty) return res.status(200).json([]);
    
    let plansList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    plansList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

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

// --- CREATE PLAN ---
export const createPlan = async (req, res) => {
  try {
    const { name, gradeLevel, schoolYear, modules, content } = req.body;
    
    // CORREÇÃO: Usar optional chaining na atribuição de autor
    const userId = req.user?.uid || 'admin_desktop';

    if (!name || !gradeLevel) {
      return res.status(400).json({ error: 'Nome e Nível Escolar são obrigatórios.' });
    }

    // ... (lógica de upload PDF e montagem do newPlan) ...
    
    const newPlan = {
      name, gradeLevel,
      schoolYear: schoolYear || null,
      modules: modules || [], 
      content: content || "", 
      pdfUrl: null, // PDF URL já foi removido por você em favor de Cloudinary no contentController
      authorId: userId,
      classId: null, 
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

// --- GET BY ID ---
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

// --- UPDATE PLAN ---
export const updatePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
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

// --- DELETE PLAN ---
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