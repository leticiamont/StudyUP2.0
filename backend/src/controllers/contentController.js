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
    const { classId, gradeLevel } = req.query;
    const userId = req.user?.uid; 

    // Lista final de conteúdos
    let allContents = [];
    const addedIds = new Set(); // Para evitar duplicatas

    // 1. BUSCA POR ID DA TURMA (Prioridade Máxima)
    // Pega tudo que foi postado ESPECIFICAMENTE para essa sala (ex: 9º A)
    if (classId) {
      const snapshotClass = await db.collection(CONTENT_COLLECTION)
        .where('classId', '==', classId)
        .get();
      
      snapshotClass.forEach(doc => {
        allContents.push({ id: doc.id, ...doc.data() });
        addedIds.add(doc.id);
      });
    }

    // 2. BUSCA POR SÉRIE (Conteúdo Genérico)
    // Pega materiais marcados como "9º Ano" (para todas as turmas)
    if (gradeLevel) {
      const snapshotGrade = await db.collection(CONTENT_COLLECTION)
        .where('gradeLevel', '==', gradeLevel)
        .get();

      snapshotGrade.forEach(doc => {
        const data = doc.data();
        
        // FILTRO DE SEGURANÇA:
        // Só adicionamos este conteúdo se:
        // a) Ele NÃO tiver classId (é um conteúdo público para todos do 9º ano)
        // b) OU se o classId dele for igual ao nosso (garantia extra)
        // Isso evita que a aluna do "9º A" veja a prova do "9º B" que foi salva com tag "9º Ano".
        
        const isPublico = !data.classId; 
        const isDaMinhaTurma = data.classId === classId;

        if (!addedIds.has(doc.id) && (isPublico || isDaMinhaTurma)) {
           allContents.push({ id: doc.id, ...data });
           addedIds.add(doc.id);
        }
      });
    }

    // 3. SE NÃO TIVER FILTROS (Visão do Professor/Admin)
    if (!classId && !gradeLevel) {
       const snapshotAuthor = await db.collection(CONTENT_COLLECTION)
         .where('authorId', '==', userId)
         .get();
       
       allContents = snapshotAuthor.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    res.status(200).json(allContents);

  } catch (error) {
    console.error('[contentController:getContents] Erro:', error.message);
    res.status(500).json({ error: 'Erro ao buscar conteúdos.' });
  }
};

// --- FUNÇÃO AUXILIAR (ADICIONAR) ---
// Serve para extrair o ID do arquivo (public_id) a partir do link
const getCloudinaryPublicId = (url) => {
  if (!url) return null;
  try {
    // 1. Descobre se é 'image', 'video' ou 'raw' pela URL
    let resourceType = 'image';
    if (url.includes('/raw/upload')) resourceType = 'raw';
    if (url.includes('/video/upload')) resourceType = 'video';

    // 2. Extrai o ID (tudo que está depois de 'upload/' e da versão 'v123...')
    const regex = /\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/;
    const match = url.match(regex);
    
    const publicId = match ? match[1] : null;
    
    return { publicId, resourceType };
  } catch (error) {
    console.error('Erro ao processar URL do Cloudinary:', error);
    return { publicId: null, resourceType: 'image' };
  }
};

// --- FUNÇÃO DELETAR (SUBSTITUIR A ANTIGA POR ESTA) ---
export const deleteContent = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Busca o documento no banco ANTES de apagar (para pegar a URL)
    const docRef = db.collection(CONTENT_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Conteúdo não encontrado." });
    }

    const contentData = doc.data();

    // 2. Se tiver uma URL do Cloudinary, apaga o arquivo lá
    if (contentData.url && contentData.url.includes('cloudinary.com')) {
      const { publicId, resourceType } = getCloudinaryPublicId(contentData.url);

      if (publicId) {
        console.log(`Apagando do Cloudinary: ${publicId} (Tipo: ${resourceType})`);
        
        // Comando para destruir o arquivo na nuvem
        await cloudinary.uploader.destroy(publicId, { 
          resource_type: resourceType,
          invalidate: true 
        });
      }
    }
    
    // 3. Agora sim, apaga o registro do banco de dados (Firestore)
    await docRef.delete();
    
    console.log(`Conteúdo ${id} apagado com sucesso.`);
    res.status(200).json({ message: "Conteúdo e arquivo apagados com sucesso." });

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