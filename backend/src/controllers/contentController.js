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
    let publicUrl = null;
    let publicId = null; // <--- NOVO: Vamos guardar o ID do Cloudinary
    let type = req.body.type || 'text'; 

    if (req.file) {
      console.log('Iniciando upload para o Cloudinary...');
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'auto',
        folder: 'studyup_uploads',
        use_filename: true,
        unique_filename: false,
      });
      publicUrl = uploadResult.secure_url;
      publicId = uploadResult.public_id; // <--- Pegamos o ID aqui
      type = req.file.mimetype;
      
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }

    const contentData = {
      name: req.body.name || "Sem título",
      type: type,
      url: publicUrl || req.body.url || null, 
      public_id: publicId || null, // <--- Salvamos no Banco
      content: req.body.content || null, 
      gradeLevel: req.body.gradeLevel || null, 
      teacherId: req.user.uid, 
      classId: null, 
      createdAt: new Date().toISOString(),
    };
    
    const docRef = await db.collection(CONTENT_COLLECTION).add(contentData);

    console.log('Conteúdo salvo:', contentData.name);
    res.status(201).json({ id: docRef.id, ...contentData });

  } catch (error) {
    console.error('[contentController:upload] Erro:', error);
    res.status(500).json({ error: 'Erro ao salvar conteúdo.' });
  }
};

export const getContents = async (req, res) => {
  try {
    const { gradeLevel, classId } = req.query;
    const { uid, role } = req.user;

    let query = db.collection(CONTENT_COLLECTION);

    if (role === 'student') {
        if (gradeLevel) {
            query = query.where('gradeLevel', '==', gradeLevel);
        } else {
             if (classId) query = query.where('classId', '==', classId);
             else return res.status(200).json([]);
        }
    } else {
        query = query.where('teacherId', '==', uid);
        if (gradeLevel) query = query.where('gradeLevel', '==', gradeLevel);
    }

    const snapshot = await query.get();
    const contents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(contents);

  } catch (error) {
    console.error('[contentController:getContents] Erro:', error.message);
    res.status(500).json({ error: 'Erro ao buscar conteúdos.' });
  }
};

// --- DELETE ATUALIZADO (A MÁGICA ACONTECE AQUI) ---
export const deleteContent = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection(CONTENT_COLLECTION).doc(id);
    
    // 1. Busca o documento antes de apagar para pegar o public_id
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
        return res.status(404).json({ error: "Conteúdo não encontrado." });
    }

    const data = docSnap.data();

    // 2. Se tiver um arquivo no Cloudinary (tem public_id), apaga lá primeiro
    if (data.public_id) {
        console.log(`Apagando do Cloudinary: ${data.public_id}`);
        // resource_type: 'raw' é importante para PDFs, 'image' para imagens
        // Para garantir, tentamos detectar ou usar 'auto' se a lib permitir, 
        // mas geralmente destroy precisa do tipo certo.
        // Vamos tentar apagar genérico:
        await cloudinary.uploader.destroy(data.public_id, { resource_type: 'raw' }); 
        // Nota: Se for imagem, pode precisar de uma segunda tentativa com 'image' se o 'raw' falhar,
        // mas para PDFs 'raw' costuma ser o padrão do Cloudinary.
    }

    // 3. Apaga do Firebase (Firestore)
    await docRef.delete();
    
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