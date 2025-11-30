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
    let publicUrl = null;
    let originalName = req.body.name || 'Sem Título';
    let detectedType = 'text'; // Padrão

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
        originalName = req.file.originalname;
        
        // Limpa arquivo local
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        // DETECÇÃO INTELIGENTE DE TIPO
        const ext = originalName.split('.').pop().toLowerCase();
        if (ext === 'pdf') {
            detectedType = 'pdf';
        } else if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'].includes(ext)) {
            detectedType = 'office'; // Word, Excel, PowerPoint
        } else {
            detectedType = 'file'; // Outros (imagem, zip, etc)
        }
    } 
    // 2. SE FOR TEXTO (EDITOR/IA)
    else if (req.body.content) {
        detectedType = 'text';
    }

    const contentData = {
      name: req.body.name || originalName,
      type: req.body.type || detectedType, // Usa o tipo detectado
      content: req.body.content || "",
      url: publicUrl,
      planId: req.body.planId || null,
      classId: req.body.classId || null,
      gradeLevel: req.body.gradeLevel || null, 
      schoolYear: req.body.schoolYear || null,
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
    // Adicionamos 'schoolYear' na extração
    const { classId, gradeLevel, schoolYear } = req.query; 
    const userId = req.user?.uid; 

    let allContents = [];
    const addedIds = new Set(); // Evita duplicatas

    // 1. BUSCA POR TURMA (Prioridade Máxima)
    // Pega arquivos exclusivos da "Turma A", "Turma B", etc.
    if (classId) {
      const snapshotClass = await db.collection(CONTENT_COLLECTION)
        .where('classId', '==', classId)
        .get();
      
      snapshotClass.forEach(doc => {
        allContents.push({ id: doc.id, ...doc.data() });
        addedIds.add(doc.id);
      });
    }

    // 2. BUSCA POR ANO ESCOLAR (O Correto para "9º Ano", "3ª Série", etc.)
    // Aqui resolvemos o problema: buscamos onde 'schoolYear' é igual ao ano da aluna
    if (schoolYear) {
      const snapshotYear = await db.collection(CONTENT_COLLECTION)
        .where('schoolYear', '==', schoolYear)
        .get();

      snapshotYear.forEach(doc => {
        const data = doc.data();
        // Filtro de Segurança: Só mostra se for público (sem turma) OU se for da minha turma
        const isPublico = !data.classId; 
        const isDaMinhaTurma = data.classId === classId;

        if (!addedIds.has(doc.id) && (isPublico || isDaMinhaTurma)) {
           allContents.push({ id: doc.id, ...data });
           addedIds.add(doc.id);
        }
      });
    }

    // 3. BUSCA POR NÍVEL (Fallback antigo, ex: "Ensino Médio")
    if (gradeLevel && !schoolYear) {
      const snapshotGrade = await db.collection(CONTENT_COLLECTION)
        .where('gradeLevel', '==', gradeLevel)
        .get();

      snapshotGrade.forEach(doc => {
        const data = doc.data();
        const isPublico = !data.classId; 
        const isDaMinhaTurma = data.classId === classId;
        
        if (!addedIds.has(doc.id) && (isPublico || isDaMinhaTurma)) {
           allContents.push({ id: doc.id, ...data });
           addedIds.add(doc.id);
        }
      });
    }

    // 4. SE NÃO TIVER FILTROS (Visão do Professor/Admin)
    if (!classId && !gradeLevel && !schoolYear) {
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