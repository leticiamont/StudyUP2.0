import { db } from '../config/firebase.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: 'dgy9gqmrr',
  api_key: '157666573927114',
  api_secret: 'tntjcDby_OK6isAfwrHFr9vH8hU'
});

const CONTENT_COLLECTION = 'contents'; 

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
    res.status(500).json({ error: 'Erro ao salvar no Cloudinary.', details: error.message });
  }
};

// 2. FUNÇÃO DE LISTAGEM (GET)
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

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    const contents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

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
    console.error('[contentController:delete] Erro:', error.message);
    res.status(500).json({ error: 'Erro ao apagar conteúdo.' });
  }
};
export const updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    await db.collection(CONTENT_COLLECTION).doc(id).update(updates);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};