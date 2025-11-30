import { db } from '../config/firebase.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Configuração segura (Lendo do .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const CONTENT_COLLECTION = 'contents'; 

// --- FUNÇÃO AUXILIAR PARA EXTRAIR ID DO CLOUDINARY ---
const getCloudinaryPublicId = (url) => {
  if (!url) return null;
  try {
    let resourceType = 'image';
    if (url.includes('/raw/upload')) resourceType = 'raw';
    if (url.includes('/video/upload')) resourceType = 'video';

    const regex = /\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/;
    const match = url.match(regex);
    const publicId = match ? match[1] : null;
    
    return { publicId, resourceType };
  } catch (error) {
    console.error('Erro URL Cloudinary:', error);
    return { publicId: null, resourceType: 'image' };
  }
};


// --- UPLOAD DE CONTEÚDO (ARQUIVO OU TEXTO) ---
export const uploadContent = async (req, res) => {
  try {
    let publicUrl = null;
    let publicId = null;
    
    // Detecta o tipo: Se veio arquivo, usa o tipo dele. Se não, assume 'text'.
    let type = req.body.type || (req.file ? req.file.mimetype : 'text'); 
    let originalName = req.body.name || "Sem título";

    // 1. Upload do Arquivo (Se houver)
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
      // Garante extensão .pdf na URL para visualização correta no Mobile
      if (publicUrl && req.file.mimetype === 'application/pdf' && !publicUrl.endsWith('.pdf')) {
          publicUrl = publicUrl + '.pdf';
      }
      
      publicId = uploadResult.public_id;
      originalName = req.file.originalname;
      
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }

    // 2. Identifica o Autor (Desktop pode enviar sem token, Mobile envia token)
    const authorId = req.user?.uid || 'admin_desktop'; // Fallback seguro

    // 3. Monta o Objeto Final
    const contentData = {
      name: req.body.name || originalName,
      type: type,
      url: publicUrl || req.body.url || null, 
      public_id: publicId || null,
      content: req.body.content || null, // Texto da IA/Editor
      
      // Metadados Escolares
      gradeLevel: req.body.gradeLevel || null, 
      schoolYear: req.body.schoolYear || null, // Importante para o filtro Desktop
      classId: (req.body.classId && req.body.classId !== 'null') ? req.body.classId : null, 
      planId: req.body.planId || null,
      
      teacherId: authorId, 
      authorId: authorId, // Mantém compatibilidade com os dois nomes
      createdAt: new Date().toISOString(),
    };
    
    // 4. Salva no Banco
    const docRef = await db.collection(CONTENT_COLLECTION).add(contentData);
    
    console.log(`Conteúdo salvo! ID: ${docRef.id}`);
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
    const userId = req.user?.uid; 
    const role = req.user?.role;

    let query = db.collection(CONTENT_COLLECTION);

    // Lógica 1: Filtro Exato de Turma (Prioridade Mobile)
    if (classId) {
        query = query.where('classId', '==', classId);
    } 
    // Lógica 2: Filtro de Aluno (Vê conteúdos da sua série)
    else if (role === 'student') {
        if (gradeLevel) query = query.where('gradeLevel', '==', gradeLevel);
        // (Pode adicionar filtro de schoolYear aqui se necessário)
    } 
    // Lógica 3: Filtro de Professor/Admin
    else {
        // Se for Desktop Admin, mostra tudo (ou filtra por nível se pedido)
        if (!userId || role === 'admin') {
             if (gradeLevel) query = query.where('gradeLevel', '==', gradeLevel);
             if (schoolYear) query = query.where('schoolYear', '==', schoolYear);
        } else {
             // Professor vê apenas seus materiais
             query = query.where('teacherId', '==', userId);
             if (gradeLevel) query = query.where('gradeLevel', '==', gradeLevel);
        }
    }

    const snapshot = await query.get();
    const contents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(contents);

  } catch (error) {
    console.error('[contentController:getContents] Erro:', error.message);
    res.status(500).json({ error: 'Erro ao buscar conteúdos.' });
  }
};


// --- DELETAR CONTEÚDO ---
export const deleteContent = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection(CONTENT_COLLECTION).doc(id);
    
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Conteúdo não encontrado." });

    const data = docSnap.data();

    // Tenta apagar do Cloudinary usando ID salvo ou extraindo da URL
    let publicIdToDelete = data.public_id;
    let resourceType = 'raw'; // Padrão para PDF

    if (!publicIdToDelete && data.url && data.url.includes('cloudinary')) {
        const extracted = getCloudinaryPublicId(data.url);
        publicIdToDelete = extracted.publicId;
        resourceType = extracted.resourceType;
    }

    if (publicIdToDelete) {
        try {
            await cloudinary.uploader.destroy(publicIdToDelete, { resource_type: resourceType });
        } catch(e) { console.warn("Aviso Cloudinary:", e.message); }
    }

    await docRef.delete();
    
    console.log(`Conteúdo ${id} apagado.`);
    res.status(200).json({ message: "Conteúdo apagado." });

  } catch (error) {
    console.error("Erro ao deletar:", error);
    res.status(500).json({ error: 'Erro ao apagar conteúdo.' });
  }
};


// --- ATUALIZAR CONTEÚDO ---
export const updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection(CONTENT_COLLECTION).doc(id).update(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};