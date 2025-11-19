import { db } from '../config/firebase.js';
import axios from 'axios'; 
import FormData from 'form-data'; 

const CONTENT_COLLECTION = 'contents'; 

/**
 * @description Carrega um ficheiro (PDF, etc.) usando a API file.io 
 * @route POST /api/contents/upload
 */
export const uploadContent = async (req, res) => {
  try {
    // 1. 'req.file' vem do 'multer' (que já configurámos no contentRoutes.js)
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum ficheiro enviado.' });
    }
    
    const file = req.file;

    // 2. Prepara o 'FormData' para enviar para a API file.io
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    // 3. Envia o ficheiro para o file.io
    const response = await axios.post('https://file.io', form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    const fileIoData = response.data;

    if (!fileIoData.success) {
      throw new Error('A API file.io falhou no upload.');
    }

    // 4. Pega o link público gratuito
    const publicUrl = fileIoData.link;

    // 5. Guarda os metadados no Firestore 
    const contentData = {
      name: file.originalname,
      type: file.mimetype,
      url: publicUrl, 
      planId: req.body.planId || null,
      authorId: req.user.uid || null, 
      createdAt: new Date().toISOString(),
    };
    
    const docRef = await db.collection(CONTENT_COLLECTION).add(contentData);

    res.status(201).json({ id: docRef.id, ...contentData });

  } catch (error) {
    console.error('[contentController:upload] Erro:', error.message);
    res.status(500).json({ error: 'Erro interno no servidor de upload.' });
  }
};