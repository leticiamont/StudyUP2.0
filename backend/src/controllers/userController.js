import userService from "../services/userService.js";
import { db, admin } from "../config/firebase.js"; // Importante: admin e db
import fs from 'fs';
import csv from 'csv-parser';

// --- CRUD Básico ---

export async function registerUser(req, res) {
  try {
    const newUser = await userService.createUser(req.body);
    res.status(201).json(newUser);
  } catch (err) {
    console.error('[userController:registerUser] Erro:', err.message);
    res.status(400).json({ error: err.message });
  }
}

export async function getUser(req, res) {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const updatedUser = await userService.updateUser(id, req.body);
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    await userService.deleteUser(id);
    res.json({ message: "Deletado com sucesso." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// --- FUNÇÕES DE GESTÃO (Desktop) ---

// ESTA É A FUNÇÃO QUE ESTAVA FALTANDO
export async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body; 
    const result = await userService.toggleUserStatus(id, isActive);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function resetUserPassword(req, res) {
  try {
    const { id } = req.params;
    const result = await userService.resetPassword(id);
    res.status(200).json(result); 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// --- TROCA DE SENHA (PRIMEIRO ACESSO) ---
export async function changePassword(req, res) {
  try {
    // O middleware optionalAuth ou authMiddleware coloca o user em req.user
    const uid = req.user ? req.user.uid : null;
    const { newPassword } = req.body;

    if (!uid) {
        return res.status(401).json({ error: "Usuário não autenticado." });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres." });
    }

    // 1. Atualiza no Auth
    await admin.auth().updateUser(uid, { password: newPassword });

    // 2. Atualiza no Firestore (remove a flag de troca obrigatória)
    await db.collection("users").doc(uid).update({ needsPasswordChange: false });

    res.status(200).json({ message: "Senha alterada com sucesso!" });

  } catch (err) {
    console.error('[changePassword] Erro:', err);
    res.status(500).json({ error: err.message });
  }
}

// --- LISTAGEM INTELIGENTE (Desktop/Mobile) ---

export async function getAllUsers(req, res) {
  try {
    const { role, gradeLevel, sort, search, classId } = req.query;
    
    if (!role) return res.status(400).json({ error: "O filtro 'role' é obrigatório." });

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
        return { ...user, className: classMap.get(user.classId) || 'Nenhuma' };
      }
      if (user.role === 'teacher') {
        return { ...user, classCount: classCountMap.get(user.id) || 0 };
      }
      return user; 
    });

    res.json(usersComNomes);

  } catch (err) {
    console.error('[userController:getAllUsers] Erro:', err.message);
    if (err.code === 'failed-precondition') {
       return res.status(500).json({ error: 'Erro de índice no Firebase.' });
    }
    res.status(500).json({ error: err.message });
  }
}

// --- IMPORTAÇÃO EM LOTE (Desktop) ---

export async function batchPreviewUsers(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhum ficheiro CSV enviado." });
    
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
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Erro ao processar CSV.', details: err.message });
  }
}

export async function batchConfirmUsers(req, res) {
  try {
    const lista = req.body;
    if (!lista || !Array.isArray(lista)) return res.status(400).json({ error: "Lista inválida." });
    const relatorio = await userService.confirmBatchUsers(lista);
    res.status(201).json(relatorio);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar lote.', details: err.message });
  }
}

// --- GAMIFICAÇÃO (Mobile) ---

export async function deductPoints(req, res) {
  try {
    // Se vier do mobile tem user, se não, falha
    if (!req.user || !req.user.uid) return res.status(401).json({ error: "Usuário não autenticado." });
    
    const { uid } = req.user; 
    const { amount } = req.body;
    
    if (!amount || amount <= 0) return res.status(400).json({ error: "Quantidade inválida." });

    const result = await userService.deductPoints(uid, amount);
    res.status(200).json({ message: "Pontos deduzidos.", newPoints: result.newPoints });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function addPoints(req, res) {
    // Placeholder para evitar erro de rota, caso o mobile chame
    res.status(501).json({ error: "Não implementado ainda" });
}