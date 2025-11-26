import userService from "../services/userService.js";
import { db } from "../config/firebase.js";
import fs from 'fs';
import csv from 'csv-parser';

// --- CRUD Básico ---
export async function registerUser(req, res, next) {
  try {
    const newUser = await userService.createUser(req.body);
    res.status(201).json(newUser);
  } catch (err) {
    console.error('[userController:registerUser] Erro:', err.message);
    res.status(400).json({ error: err.message });
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

// --- FUNÇÕES DO DESKTOP (Status e Reset) ---

export async function toggleUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { isActive } = req.body; 
    const result = await userService.toggleUserStatus(id, isActive);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function resetUserPassword(req, res, next) {
  try {
    const { id } = req.params;
    const result = await userService.resetPassword(id);
    res.status(200).json(result); 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// --- LISTAGEM INTELIGENTE (Desktop/Mobile) ---
export async function getAllUsers(req, res, next) {
  try {
    const { role, gradeLevel, sort, search, classId } = req.query;
    
    if (!role) {
      return res.status(400).json({ error: "O filtro 'role' (teacher/student) é obrigatório." });
    }

    const [usersList, classesSnapshot] = await Promise.all([
      userService.getAllUsers(role, gradeLevel, sort, search, classId), 
      db.collection('classes').get()
    ]);
    
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

// --- IMPORTAÇÃO EM LOTE (Desktop) ---
export async function batchPreviewUsers(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum ficheiro CSV enviado." });
    }
    
    const results = [];
    const filePath = req.file.path;

    const processFile = new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({ separator: ';' }))
        .on('data', (data) => results.push(data))
        .on('end', () => {
          fs.unlinkSync(filePath);
          resolve(results);
        })
        .on('error', (error) => {
          fs.unlinkSync(filePath);
          reject(error);
        });
    });

    const alunosDoCsv = await processFile;
    const preview = await userService.previewBatchUsers(alunosDoCsv);

    res.status(200).json(preview);

  } catch (err) {
    console.error('[batchPreview] Erro:', err.message);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Erro ao processar o ficheiro.', details: err.message });
  }
}

export async function batchConfirmUsers(req, res, next) {
  try {
    const listaDeAlunos = req.body;
    if (!listaDeAlunos || !Array.isArray(listaDeAlunos) || listaDeAlunos.length === 0) {
      return res.status(400).json({ error: "Nenhuma lista de alunos válida recebida." });
    }
    const relatorio = await userService.confirmBatchUsers(listaDeAlunos);
    res.status(201).json(relatorio);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar alunos.', details: err.message });
  }
}

// --- FUNÇÕES DO MOBILE (Gamificação) ---

export async function deductPoints(req, res, next) {
  try {
    const { uid } = req.user; // UID vem do token verificado (usuário logado)
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Quantidade de pontos inválida." });
    }

    const result = await userService.deductPoints(uid, amount);
    res.status(200).json({ message: "Pontos deduzidos com sucesso.", newPoints: result.newPoints });

  } catch (err) {
    console.error('[userController:deductPoints] Erro:', err.message);
    res.status(400).json({ error: err.message }); // Retorna o erro de 'Pontos insuficientes'
  }
}