import { db } from "../config/firebase.js";
import cloudinary from "../config/cloudinary.js"; 
import fs from 'fs';

/**
 * @route GET /api/plans
 * @description Busca planos (Híbrido: Admin vê tudo, Prof vê os dele)
 */
export const getPlans = async (req, res) => {
    try {
      const { search, gradeLevel, classId, viewMode } = req.query;
      const userId = req.user?.uid;
  
      let query = db.collection('plans');
  
      if (classId) {
        query = query.where('classId', '==', classId);
      } else if (viewMode === 'admin' || !userId) {
        // Desktop Admin vê tudo
      } else {
        query = query.where('authorId', '==', userId); // Mobile vê seus planos
      }
  
      if (gradeLevel) query = query.where('gradeLevel', '==', gradeLevel);
      
      const snapshot = await query.get();
      if (snapshot.empty) return res.status(200).json([]);
      
      let plansList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      plansList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  
      if (search) plansList = plansList.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
      
      res.status(200).json(plansList);
    } catch (error) { res.status(500).json({ error: error.message }); }
  };
  
  export const getPlanById = async (req, res) => {
    const doc = await db.collection('plans').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Plano não encontrado." });
    res.status(200).json({ id: doc.id, ...doc.data() });
  };
  
  export const deletePlan = async (req, res) => {
    await db.collection('plans').doc(req.params.id).delete();
    res.status(200).json({ message: "Deletado." });
  };

// --- CREATE PLAN ---
export const createPlan = async (req, res) => {
  try {
    const { name, gradeLevel, schoolYear, modules, content } = req.body;
    const file = req.file; // O Multer coloca o arquivo aqui
    const userId = req.user?.uid || 'admin_desktop';

    if (!name || !gradeLevel) return res.status(400).json({ error: 'Nome e Nível obrigatórios.' });

    let pdfUrl = null;

    if (file) {
      console.log(`[planController] Upload PDF: ${file.originalname}`);
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        resource_type: 'raw', // Importante para PDF
        folder: 'planos_de_aula',
        use_filename: true
      });
      
      // Limpa arquivo temporário
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      pdfUrl = uploadResult.secure_url;
    } else {
      console.warn("[planController] Nenhum arquivo recebido no req.file");
    }

    const newPlan = {
      name, gradeLevel,
      schoolYear: schoolYear || null,
      modules: modules || [], 
      content: content || "", 
      pdfUrl: pdfUrl, // Salva a URL (ou null se falhou)
      authorId: userId,
      classId: null, 
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('plans').add(newPlan);
    res.status(201).json({ message: 'Plano criado!', id: docRef.id, ...newPlan });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
};

// --- UPDATE PLAN ---
export const updatePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body; 
    const file = req.file; // Novo arquivo (se houver)

    if (file) {
        console.log(`[planController] Atualizando PDF: ${file.originalname}`);
        const uploadResult = await cloudinary.uploader.upload(file.path, {
            resource_type: 'raw', 
            folder: 'planos_de_aula',
            use_filename: true
        });
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        updates.pdfUrl = uploadResult.secure_url; // Atualiza URL
    }

    await db.collection('plans').doc(id).update(updates);
    res.status(200).json({ message: "Atualizado." });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(error);
  }
};

