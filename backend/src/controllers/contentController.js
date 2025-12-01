import { db } from '../config/firebase.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const CONTENT_COLLECTION = 'contents'; 

// --- UPLOAD (Mantido e Reforçado) ---
export const uploadContent = async (req, res) => {
  try {
    let publicUrl = null;
    let publicId = null;
    let type = req.body.type || (req.file ? req.file.mimetype : 'text'); 

    if (!req.file && !req.body.content && type !== 'text') {
      return res.status(400).json({ error: 'Nenhum arquivo ou texto enviado.' });
    }
    
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'auto',
        folder: 'studyup_uploads',
        use_filename: true,
        unique_filename: false,
        access_mode: 'public' 
      });
      
      publicUrl = uploadResult.secure_url;
      if (publicUrl && req.file.mimetype === 'application/pdf' && !publicUrl.endsWith('.pdf')) {
          publicUrl = publicUrl + '.pdf';
      }
      publicId = uploadResult.public_id;
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }

    const authorId = req.user?.uid || 'anonym';
    
    // Dados normalizados
    const gradeLevel = req.body.gradeLevel ? req.body.gradeLevel.trim() : null; // Ex: "Ensino Médio"
    const schoolYear = req.body.schoolYear ? req.body.schoolYear.trim() : null; // Ex: "3º Ano"
    const classId = (req.body.classId && req.body.classId !== 'null') ? req.body.classId : null;

    const contentData = {
      name: req.body.name || "Sem título",
      type: type,
      url: publicUrl || req.body.url || null, 
      public_id: publicId || null,
      content: req.body.content || null, 
      
      gradeLevel: gradeLevel,
      schoolYear: schoolYear, // Salva o ano específico se vier
      
      teacherId: authorId, 
      classId: classId, 
      planId: req.body.planId || null,
      createdAt: new Date().toISOString(),
    };
    
    const docRef = await db.collection(CONTENT_COLLECTION).add(contentData);
    console.log(`[Upload] ID: ${docRef.id} | Nível: ${gradeLevel} | Ano: ${schoolYear} | Prof: ${authorId}`);
    
    res.status(201).json({ id: docRef.id, ...contentData });

  } catch (error) {
    console.error('[contentController:upload] Erro:', error);
    res.status(500).json({ error: 'Erro ao salvar conteúdo.' });
  }
};

// 🚨 BUSCA BLINDADA (FILTRO EM MEMÓRIA) 🚨
export const getContents = async (req, res) => {
  try {
    const { gradeLevel, classId } = req.query;
    const currentUser = req.user;

    if (!currentUser || !currentUser.uid) {
         return res.status(200).json([]);
    }

    let targetTeacherId = currentUser.uid; // Padrão: busca coisas do próprio usuário
    let filterMode = 'PROFESSOR_OWN'; // Modo padrão

    // --- LÓGICA DE CONTEXTO ---
    if (classId) {
        // Se veio um ID de turma, precisamos saber quem é o professor dessa turma
        // para buscar os materiais DELE.
        const classDoc = await db.collection('classes').doc(classId).get();
        if (classDoc.exists) {
            const classData = classDoc.data();
            targetTeacherId = classData.teacherId; // O dono dos materiais é o prof da turma
            filterMode = 'STUDENT_CLASS'; // Estamos buscando para um aluno (ou contexto de aula)
            
            // Dados para filtragem inteligente
            var className = classData.name || "";
            var classLevel = classData.gradeLevel || "";
            
            // Extrai série do nome (Ex: "3º Ano" de "3º Ano A")
            var classSeries = null;
            const match = className.match(/(\d+º?\s?(Ano|Série|Serie))/i);
            if (match) classSeries = match[0].trim();
            
            console.log(`[getContents] Contexto Turma: ${className} | Prof: ${targetTeacherId} | Série: ${classSeries}`);
        }
    } else if (currentUser.role === 'student') {
        // Aluno sem turma específica (busca genérica pelo nível)
        // Difícil saber o professor sem a turma. Retorna vazio ou busca global.
        // Por segurança, retorna vazio se não tiver turma vinculada.
        console.log("[getContents] Aluno sem turma definida na busca.");
        return res.status(200).json([]);
    }

    // 1. BUSCA TUDO DO PROFESSOR ALVO (Query simples, sem índices complexos)
    const snapshot = await db.collection(CONTENT_COLLECTION)
        .where('teacherId', '==', targetTeacherId)
        .get();

    const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. FILTRAGEM INTELIGENTE (EM MEMÓRIA)
    let results = allDocs;

    if (filterMode === 'STUDENT_CLASS') {
        results = allDocs.filter(item => {
            // A. É exclusivo desta turma?
            if (item.classId === classId) return true;

            // B. É geral (sem turma)?
            if (!item.classId || item.classId === 'null') {
                // Verifica schoolYear (Novo padrão "3º Ano")
                if (classSeries && item.schoolYear === classSeries) return true;
                
                // Verifica gradeLevel (Se for igual à série ou ao nível geral)
                // (Isso cobre o caso de ter salvo "3º Ano" no campo gradeLevel antigamente)
                if (classSeries && item.gradeLevel === classSeries) return true;
                if (classLevel && item.gradeLevel === classLevel) return true;
            }
            return false;
        });
    } else {
        // Modo PROFESSOR (Gerenciamento)
        // Se pediu filtro de nível/ano específico na tela de gestão:
        if (gradeLevel) {
            results = allDocs.filter(item => 
                item.gradeLevel === gradeLevel || item.schoolYear === gradeLevel
            );
        }
    }

    // Ordenação
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log(`[getContents] Retornando ${results.length} itens filtrados.`);
    res.status(200).json(results);

  } catch (error) {
    console.error('[contentController:getContents] Erro:', error.message);
    res.status(500).json({ error: 'Erro ao buscar conteúdos.' });
  }
};

export const deleteContent = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection(CONTENT_COLLECTION).doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Conteúdo não encontrado." });
    const data = docSnap.data();
    if (data.public_id) {
        try {
            await cloudinary.uploader.destroy(data.public_id, { resource_type: 'raw' }); 
            await cloudinary.uploader.destroy(data.public_id, { resource_type: 'image' }); 
        } catch(e) { console.log("Cloudinary:", e.message); }
    }
    await docRef.delete();
    res.status(200).json({ message: "Conteúdo apagado." });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao apagar conteúdo.' });
  }
};

export const updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection(CONTENT_COLLECTION).doc(id).update(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};