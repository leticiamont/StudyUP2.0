import { db } from '../config/firebase.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Configuração do Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const CONTENT_COLLECTION = 'contents'; 

export const uploadContent = async (req, res) => {
  try {
    let publicUrl = null;
    let publicId = null;
    
    // Detecta o tipo: Se veio arquivo, usa o tipo dele. Se não, vê se veio no corpo ou assume 'text'.
    let type = req.body.type || (req.file ? req.file.mimetype : 'text'); 

    // Validação: Precisa de arquivo OU conteúdo de texto
    if (!req.file && !req.body.content && type !== 'text') {
      return res.status(400).json({ error: 'Nenhum arquivo ou texto enviado.' });
    }
    
    // Upload do Arquivo (Se houver)
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
      // Garante extensão .pdf na URL para visualização correta
      if (publicUrl && req.file.mimetype === 'application/pdf' && !publicUrl.endsWith('.pdf')) {
          publicUrl = publicUrl + '.pdf';
      }
      
      publicId = uploadResult.public_id;
      
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }

    // Identifica o Autor
    const authorId = req.user?.uid || 'anonym';

    // Monta o Objeto
    const contentData = {
      name: req.body.name || "Sem título",
      type: type,
      url: publicUrl || req.body.url || null, 
      public_id: publicId || null,
      content: req.body.content || null,
      gradeLevel: req.body.gradeLevel || null, 
      teacherId: authorId, 
      classId: (req.body.classId && req.body.classId !== 'null') ? req.body.classId : null, 
      planId: req.body.planId || null,
      createdAt: new Date().toISOString(),
    };
    
    // Salva no Banco
    const docRef = await db.collection(CONTENT_COLLECTION).add(contentData);
    
    console.log(`Conteúdo salvo! ID: ${docRef.id} | Tipo: ${type}`);
    res.status(201).json({ id: docRef.id, ...contentData });

  } catch (error) {
    console.error('[contentController:upload] Erro:', error);
    res.status(500).json({ error: 'Erro ao salvar conteúdo.' });
  }
};

export const getContents = async (req, res) => {
  try {
    const { gradeLevel, classId } = req.query;
    
    // Proteção: Se não tiver usuário, retorna lista vazia em vez de erro
    if (!req.user || !req.user.uid) {
         return res.status(200).json([]);
    }

    const userId = req.user.uid; 
    const role = req.user.role;

    let query = db.collection(CONTENT_COLLECTION);

    if (role === 'student') {
        // Lógica de Aluno
        if (gradeLevel) query = query.where('gradeLevel', '==', gradeLevel);
        else if (classId) query = query.where('classId', '==', classId);
        else return res.status(200).json([]);
    } else {
        // Lógica de Professor: Vê o que ELE criou
        query = query.where('teacherId', '==', userId);
        
        if (gradeLevel) {
            query = query.where('gradeLevel', '==', gradeLevel);
        }
    }

    const snapshot = await query.get();
    // 🚨 AQUI ESTAVA O ERRO: Usava 'allContents' que não existia. Agora usa 'contents' corretamente.
    const contents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(contents);

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
    // Tenta apagar do Cloudinary se tiver arquivo
    if (data.public_id) {
        try {
            await cloudinary.uploader.destroy(data.public_id, { resource_type: 'raw' }); 
            await cloudinary.uploader.destroy(data.public_id, { resource_type: 'image' }); 
        } catch(e) { console.log("Aviso Cloudinary:", e.message); }
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