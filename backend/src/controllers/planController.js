import { db } from "../config/firebase.js";
import cloudinary from "../config/cloudinary.js"; 
import fs from 'fs'; 

// --- CREATE PLAN ---
export const createPlan = async (req, res) => {
  try {
    const { name, gradeLevel, modules, content } = req.body;
    const userId = req.user.uid;

    if (!name || !gradeLevel) return res.status(400).json({ error: 'Nome e Nível obrigatórios.' });

    let pdfUrl = null;
    if (file) {
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        resource_type: 'raw', folder: 'planos_de_aula', use_filename: true
      });
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      pdfUrl = uploadResult.secure_url;
    }

    const newPlan = {
      name,
      gradeLevel,
      modules: modules || [], 
      content: content || "",
      authorId: userId,
      classId: null, // Começa sem turma
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('plans').add(newPlan);
    
    res.status(201).json({ 
      message: 'Plano criado com sucesso!',
      id: docRef.id,
      ...newPlan
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
};

// --- GET PLANS (filtra por Turma) ---
export const getPlans = async (req, res) => {
  try {
    const { search, gradeLevel, classId } = req.query;
    const userId = req.user.uid;

    let query = db.collection('plans');

    // Filtro de Turma (para mostrar o plano daquela turma)
    if (classId) {
      query = query.where('classId', '==', classId);
    } else {
      // Se não, mostra os meus (banco geral)
      query = query.where('authorId', '==', userId);
    }

    if (gradeLevel) {
      query = query.where('gradeLevel', '==', gradeLevel);
    }
    
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

export const getPlanById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const docRef = db.collection('plans').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Plano não encontrado." });
    }
    
    res.status(200).json({ id: doc.id, ...doc.data() });

  } catch (error) {
    console.error('[planController:getPlanById] Erro:', error);
    next(error);
  }
};

// --- UPDATE PLAN (Atualizado para salvar a Turma/classId) ---
export const updatePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Pega tudo que vier no body (incluindo classId se vier)
    const updates = req.body; 

    const docRef = db.collection('plans').doc(id);
    
    await docRef.update(updates);

    res.status(200).json({ message: "Plano atualizado com sucesso." });

  } catch (error) {
    console.error('[planController:updatePlan] Erro:', error);
    next(error);
  }
};

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