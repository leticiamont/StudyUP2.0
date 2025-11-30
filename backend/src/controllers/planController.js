import { db } from "../config/firebase.js";
import cloudinary from "../config/cloudinary.js"; 
import fs from 'fs';

/**
 * @route GET /api/plans
 * @description Busca planos (Híbrido: Admin vê tudo, Prof vê os dele)
 */
// backend/src/controllers/planController.js

// backend/src/controllers/planController.js

export const getPlans = async (req, res) => {
  try {
    const { gradeLevel, schoolYear } = req.query;
    // Pega o ID se estiver logado, senão null
    const userId = (req.user && req.user.uid) ? req.user.uid : null;

    console.log("\n=== DEBUG PLANOS (Modo Compatibilidade) ===");
    console.log("Professor:", userId || "NÃO LOGADO");

    // 1. BUSCA TUDO (Sem filtro no banco para pegar os antigos também)
    // Nota: Em produção com muitos dados, isso seria lento, mas para dev é perfeito.
    const snapshot = await db.collection('plans').get();
    
    if (snapshot.empty) {
        return res.status(200).json([]);
    }

    // 2. FILTRAGEM INTELIGENTE EM MEMÓRIA
    let plans = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => {
            // A REGRA DE OURO:
            // Mostra o plano se:
            // a) Ele é MEU (tem meu teacherId)
            // b) OU se ele é "ANÔNIMO" (não tem teacherId nenhum - planos antigos)
            return p.teacherId === userId || !p.teacherId;
        });

    console.log(`Encontrados ${plans.length} planos visíveis.`);

    // 3. APLICA OS FILTROS DE PESQUISA (Se houver)
    if (schoolYear) {
        plans = plans.filter(p => p.schoolYear === schoolYear);
    } 
    else if (gradeLevel) {
        const termo = gradeLevel.toLowerCase().trim();
        plans = plans.filter(p => {
            const dados = [p.gradeLevel, p.educationLevel, p.schoolYear].filter(Boolean).join(" ").toLowerCase();
            return dados.includes(termo);
        });
    }

    // Ordena (Mais novos primeiro)
    plans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json(plans);

  } catch (error) {
    console.error('ERRO NO GET PLANS:', error);
    res.status(500).json({ error: 'Erro interno.' });
  }
};
  
  export const getPlanById = async (req, res) => {
    const doc = await db.collection('plans').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Plano não encontrado." });
    res.status(200).json({ id: doc.id, ...doc.data() });
  };
  
 export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('plans').doc(id).delete();
    // (Opcional: Deletar arquivo do Cloudinary aqui também, se quiser)
    res.json({ message: "Plano deletado com sucesso" });
  } catch (error) {
    console.error("Erro deletePlan:", error);
    res.status(500).json({ error: "Erro ao deletar plano" });
  }
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

