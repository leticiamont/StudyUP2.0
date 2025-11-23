// src/controllers/userController.js
import userService from "../services/userService.js";
import { db } from "../config/firebase.js";
import fs from 'fs';
import csv from 'csv-parser';

export async function registerUser(req, res, next) {
  try {
    const newUser = await userService.createUser(req.body);
    res.status(201).json(newUser);
  } catch (err) {
    console.error('[userController:registerUser] Erro:', err.message);
    res.status(400).json({ error: err.message });
  }
}

export async function getAllUsers(req, res, next) {
  try {
    // 1. Pegamos o classId 
    const { role, gradeLevel, sort, search, classId } = req.query;
    
    if (!role) {
      return res.status(400).json({ error: "O filtro 'role' (teacher/student) é obrigatório." });
    }

    // 2. Buscar "peças" em paralelo
    const [usersList, classesSnapshot] = await Promise.all([
      userService.getAllUsers(role, gradeLevel, sort, search, classId), 
      db.collection('classes').get()
    ]);
    
    // 3. Criar Mapas
    const classMap = new Map(); 
    const classCountMap = new Map(); 
    
    classesSnapshot.forEach(doc => {
      const data = doc.data();
      classMap.set(doc.id, data.name);
      
      if (data.teacherId) {
        const count = (classCountMap.get(data.teacherId) || 0) + 1;
        classCountMap.set(data.teacherId, count);
      }
    });

    // 4. "Juntar" os dados
    const usersComNomes = usersList.map(user => {
      if (user.role === 'student') {
        return {
          ...user,
          className: classMap.get(user.classId) || 'Nenhuma'
        };
      }
      if (user.role === 'teacher') {
        return {
          ...user,
          classCount: classCountMap.get(user.id) || 0
        };
      }
      return user; 
    });

    res.json(usersComNomes);

  } catch (err) {
    console.error('[userController:getAllUsers] Erro:', err.message);
    if (err.code === 'failed-precondition') {
       return res.status(500).json({ error: 'Erro de query. O Firestore provavelmente precisa de um índice.' });
    }
    next(err);
  }
}

export async function getUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const updatedUser = await userService.updateUser(id, req.body);
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const result = await userService.deleteUser(id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/**
 * @route POST /api/users/batch-preview
 * @description Lê um CSV, valida, e devolve a lista JSON (sem salvar)
 */
export async function batchPreviewUsers(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum ficheiro CSV enviado." });
    }
    console.log(`[userController:batchPreview] Ficheiro ${req.file.filename} recebido para pré-visualização.`);
    const results = [];
    const filePath = req.file.path;

    const processFile = new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({ separator: ';' })) // Lê o CSV
        .on('data', (data) => results.push(data))
        .on('end', () => {
          fs.unlinkSync(filePath); // Apaga o ficheiro temporário
          resolve(results);
        })
        .on('error', (error) => {
          fs.unlinkSync(filePath);
          reject(error);
        });
    });

    const alunosDoCsv = await processFile;
    
    // Chama o service de PRÉ-VISUALIZAÇÃO
    const preview = await userService.previewBatchUsers(alunosDoCsv);

    res.status(200).json(preview); // Devolve a lista validada e os erros

  } catch (err) {
    console.error('[userController:batchPreview] Erro:', err.message);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Erro ao processar o ficheiro.', details: err.message });
  }
}

/**
 * @route POST /api/users/batch-confirm
 * @description Recebe uma lista JSON (pré-validada) e salva no banco
 */
export async function batchConfirmUsers(req, res, next) {
  try {
    const listaDeAlunos = req.body; // Recebe o JSON
    if (!listaDeAlunos || !Array.isArray(listaDeAlunos) || listaDeAlunos.length === 0) {
      return res.status(400).json({ error: "Nenhuma lista de alunos válida recebida." });
    }

    console.log(`[userController:batchConfirm] Recebendo ${listaDeAlunos.length} alunos para salvar...`);
    
    // Chama o service de CONFIRMAÇÃO
    const relatorio = await userService.confirmBatchUsers(listaDeAlunos);

    res.status(201).json(relatorio); // Devolve o relatório final

  } catch (err) {
    console.error('[userController:batchConfirm] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao salvar alunos.', details: err.message });
  }
}