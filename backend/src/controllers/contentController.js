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

// --- FUNÇÃO AUXILIAR: NORMALIZAR TEXTO ---
// Remove espaços e deixa minúsculo para comparar "9º Ano" com "9ºAno"
const normalize = (text) => {
    if (!text) return "";
    return text.toString().toLowerCase().replace(/\s+/g, '').replace('°', 'º').trim();
};

// --- UPLOAD (Mantido e Seguro) ---
export const uploadContent = async (req, res) => {
  try {
    let publicUrl = null;
    let publicId = null; 
    let type = req.body.type || 'text'; // Padrão é texto
    let originalName = req.body.name || "Sem título";

    // CASO 1: Upload de Arquivo (Veio pela rota /upload com Multer)
    if (req.file) {
      console.log('Iniciando upload para o Cloudinary...');
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'auto',
        folder: 'studyup_uploads',
        use_filename: true,
        unique_filename: false,
        access_mode: 'public'
      });
      
      publicUrl = uploadResult.secure_url;
      // Garante .pdf na URL se for PDF
      if (publicUrl && req.file.mimetype === 'application/pdf' && !publicUrl.endsWith('.pdf')) {
          publicUrl = publicUrl + '.pdf';
      }
      
      publicId = uploadResult.public_id;
      type = req.file.mimetype; // 'application/pdf' etc.
      originalName = req.file.originalname;
      
      // Limpa temp
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } 
    
    // CASO 2: Conteúdo de Texto (Veio pela rota / com JSON)
    else if (req.body.content) {
        // Apenas mantém o type='text' e salva o conteúdo
    }
    
    // Validação: Se não tem arquivo E não tem texto, erro.
    if (!publicUrl && !req.body.content && type !== 'text') {
         return res.status(400).json({ error: 'Nenhum conteúdo enviado (arquivo ou texto).' });
    }

    const authorId = req.user?.uid || 'admin_desktop';

    const contentData = {
      name: req.body.name || originalName,
      type: type,
      url: publicUrl || req.body.url || null, 
      public_id: publicId || null, 
      content: req.body.content || null, 
      gradeLevel: req.body.gradeLevel || null, 
      schoolYear: req.body.schoolYear || null,
      teacherId: authorId, 
      authorId: authorId,
      classId: (req.body.classId && req.body.classId !== 'null') ? req.body.classId : null, 
      planId: req.body.planId || null,
      createdAt: new Date().toISOString(),
    };
    
    const docRef = await db.collection(CONTENT_COLLECTION).add(contentData);
    console.log(`Conteúdo salvo: ${contentData.name} (${type})`);
    res.status(201).json({ id: docRef.id, ...contentData });

  } catch (error) {
    console.error('[contentController:upload] Erro:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Erro ao salvar conteúdo.' });
  }
};

// --- BUSCA DE CONTEÚDOS (FILTROS INTELIGENTES) ---
export const getContents = async (req, res) => {
  try {
    const { gradeLevel, classId, schoolYear } = req.query;
    const role = req.user?.role;
    const userId = req.user?.uid;

    let query = db.collection('contents');

    // 1. Se for Aluno (Mobile/Web)
    if (role === 'student') {
        // Se mandou classId (Material exclusivo da turma)
        if (classId) {
            query = query.where('classId', '==', classId);
        } 
        // Se mandou schoolYear (Material do Ano, ex: 3ª Série)
        else if (schoolYear) {
            query = query.where('schoolYear', '==', schoolYear);
        }
        // Se mandou gradeLevel (Material do Nível, ex: Ensino Médio)
        else if (gradeLevel) {
            query = query.where('gradeLevel', '==', gradeLevel);
        }
        // Se não mandou nada, retorna vazio por segurança
        else {
            return res.status(200).json([]);
        }
    } 
    // 2. Se for Professor (Vê o que criou)
    else if (role === 'teacher') {
        query = query.where('teacherId', '==', userId);
    }
    // 3. Se for Admin (Vê tudo, opcionalmente filtra)
    else {
        if (gradeLevel) query = query.where('gradeLevel', '==', gradeLevel);
    }

    const snapshot = await query.get();
    const contents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(contents);

  } catch (error) {
    console.error('[contentController:getContents] Erro:', error.message);
    // Se for erro de índice, não quebra, devolve lista vazia no pior caso
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
        } catch(e) { console.log("Cloudinary cleanup error:", e.message); }
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