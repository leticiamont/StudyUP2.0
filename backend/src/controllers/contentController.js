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

export const uploadContent = async (req, res) => {
  try {
    // Verifica se é upload de arquivo (req.file) ou texto (req.body apenas)
    let publicUrl = null;
    let mimeType = 'text/plain';
    let originalName = req.body.name || 'Sem Título';

    // 1. SE FOR ARQUIVO (UPLOAD)
    if (req.file) {
        console.log('Iniciando upload para o Cloudinary...');
        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
            resource_type: 'auto',
            folder: 'studyup_uploads',
            use_filename: true,
            unique_filename: false,
        });
        publicUrl = uploadResult.secure_url;
        mimeType = req.file.mimetype;
        originalName = req.file.originalname;
        
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); // Limpa local
    } 
    // 2. SE FOR TEXTO (EDITOR/IA)
    else if (req.body.content) {
        // Mantém lógica de texto
    }

    // Salva os dados no Firestore
    const contentData = {
      name: req.body.name || originalName,
      type: req.body.type || (req.file ? 'pdf' : 'text'), // Força tipo
      content: req.body.content || "", // Se for texto
      url: publicUrl,
      planId: req.body.planId || null,
      classId: req.body.classId || null,
      gradeLevel: req.body.gradeLevel || null, 
      schoolYear: req.body.schoolYear || null, // <--- ADICIONADO: CAMPO CRUCIAL
      authorId: req.user?.uid || 'anonym', 
      createdAt: new Date().toISOString(),
    };
    
    const docRef = await db.collection('contents').add(contentData);

    console.log('Salvo com sucesso:', contentData.name);
    res.status(201).json({ id: docRef.id, ...contentData });

  } catch (error) {
    console.error('[contentController:upload] Erro:', error);
    res.status(500).json({ error: 'Erro ao salvar conteúdo.' });
  }
};

export const getContents = async (req, res) => {
  try {
    const { classId } = req.query;
    const userId = req.user.uid; // O ID do professor logado

    let query = db.collection(CONTENT_COLLECTION);

    if (classId) {
      // Se pedir de uma turma, mostra tudo da turma (filtro por turma)
      query = query.where('classId', '==', classId);
    } else {
      // Se NÃO pedir turma (ou seja, "Meus Conteúdos" ou "Banco"),
      // mostra APENAS o que ESSE professor criou.
      query = query.where('authorId', '==', userId);
    }

    const snapshot = await query.get();
    const contents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(contents);

  } catch (error) {
    console.error('[contentController:getContents] Erro:', error.message);
    res.status(500).json({ error: 'Erro ao buscar conteúdos.' });
  }
};

// 3. FUNÇÃO DE DELETAR
export const deleteContent = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Deleta o registro do banco de dados
    await db.collection(CONTENT_COLLECTION).doc(id).delete();
    
    // (Futuramente adicionar aqui o código para deletar do Cloudinary também)
    
    console.log(`Conteúdo ${id} apagado com sucesso.`);
    res.status(200).json({ message: "Conteúdo apagado." });

  } catch (error) {
    console.error("Erro ao deletar:", error);
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