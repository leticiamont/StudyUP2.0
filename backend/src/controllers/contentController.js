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
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum ficheiro enviado.' });
    }
    
    const file = req.file;
    console.log('Iniciando upload para o Cloudinary...');

    // Envia o arquivo local para o Cloudinary
    const uploadResult = await cloudinary.uploader.upload(file.path, {
      resource_type: 'auto',
      folder: 'studyup_uploads',
      use_filename: true,
      unique_filename: false,
    });

    const publicUrl = uploadResult.secure_url;

    // Salva os dados no Firestore
    const contentData = {
      name: file.originalname,
      type: file.mimetype,
      url: publicUrl,
      planId: req.body.planId || null,
      classId: req.body.classId || null, 
      authorId: req.user?.uid || 'anonym', 
      createdAt: new Date().toISOString(),
    };
    
    const docRef = await db.collection(CONTENT_COLLECTION).add(contentData);

    // Limpeza do arquivo local (pasta uploads do PC)
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    console.log('Sucesso! Arquivo disponível em:', publicUrl);
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
    const { gradeLevel, classId } = req.query;
    
    // No Desktop (Admin), req.user pode não existir. Tratamos como Admin.
    const userId = req.user?.uid; 
    const role = req.user?.role || 'admin';

    let query = db.collection(CONTENT_COLLECTION);

    if (role === 'student') {
        // Aluno: Vê conteúdo do seu Nível ou da sua Turma
        if (gradeLevel) query = query.where('gradeLevel', '==', gradeLevel);
        else if (classId) query = query.where('classId', '==', classId);
        else return res.status(200).json([]);
        
    } else if (role === 'admin') {
        // Admin: Vê tudo (pode filtrar por nível se quiser)
        if (gradeLevel) query = query.where('gradeLevel', '==', gradeLevel);
        
    } else {
        // Professor: Vê o que ELE criou
        if (userId) query = query.where('teacherId', '==', userId);
        if (gradeLevel) query = query.where('gradeLevel', '==', gradeLevel);
    }

    const snapshot = await query.get();
    const contents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(allContents);

  } catch (error) {
    console.error('[contentController:getContents] Erro:', error.message);
    res.status(500).json({ error: 'Erro ao buscar conteúdos.' });
  }
};

export const deleteContent = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Busca o documento no banco ANTES de apagar (para pegar a URL)
    const docRef = db.collection(CONTENT_COLLECTION).doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) return res.status(404).json({ error: "Conteúdo não encontrado." });

    const data = docSnap.data();
    
    // Tenta apagar do Cloudinary se tiver arquivo
    if (data.public_id) {
        try {
            // Tenta como 'raw' (PDF) e como 'image' (Foto) para garantir
            await cloudinary.uploader.destroy(data.public_id, { resource_type: 'raw' }); 
            await cloudinary.uploader.destroy(data.public_id, { resource_type: 'image' }); 
        } catch(e) { console.log("Aviso Cloudinary:", e.message); }
    }

    await docRef.delete();
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