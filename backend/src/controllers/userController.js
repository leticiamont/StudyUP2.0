import userService from "../services/userService.js";
import { db } from "../config/firebase.js";
import fs from 'fs';
import csv from 'csv-parser';

// --- CRUD Básico ---
export async function registerUser(req, res) {
  try {
    const newUser = await userService.createUser(req.body);
    res.status(201).json(newUser);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

export async function getUser(req, res) {
  const user = await userService.getUserById(req.params.id);
  if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
  res.json(user);
}

export async function updateUser(req, res) {
  try {
    const updated = await userService.updateUser(req.params.id, req.body);
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

export async function deleteUser(req, res) {
  await userService.deleteUser(req.params.id);
  res.json({ message: "Deletado" });
}

export async function toggleUserStatus(req, res) {
  const result = await userService.toggleUserStatus(req.params.id, req.body.isActive);
  res.json(result);
}

export async function resetUserPassword(req, res) {
  const result = await userService.resetPassword(req.params.id);
  res.status(200).json(result);
}

export async function getAllUsers(req, res) {
  try {
    const { role, gradeLevel, sort, search, classId } = req.query;
    if (!role) return res.status(400).json({ error: "Role obrigatório." });

    const [usersList, classesSnapshot] = await Promise.all([
      userService.getAllUsers(role, gradeLevel, sort, search, classId), 
      db.collection('classes').get()
    ]);
    
    const classMap = new Map(); 
    const classCountMap = new Map(); 
    classesSnapshot.forEach(doc => {
      classMap.set(doc.id, doc.data().name);
      const tid = doc.data().teacherId;
      if (tid) classCountMap.set(tid, (classCountMap.get(tid) || 0) + 1);
    });

    const usersComNomes = usersList.map(user => {
      if (user.role === 'student') return { ...user, className: classMap.get(user.classId) || 'Nenhuma' };
      if (user.role === 'teacher') return { ...user, classCount: classCountMap.get(user.id) || 0 };
      return user; 
    });
    res.json(usersComNomes);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// --- Importação CSV (Desktop) ---
export async function batchPreviewUsers(req, res) {
  if (!req.file) return res.status(400).json({ error: "Sem arquivo." });
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv({ separator: ';' }))
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      fs.unlinkSync(req.file.path);
      const preview = await userService.previewBatchUsers(results);
      res.json(preview);
    });
}

export async function batchConfirmUsers(req, res) {
  const relatorio = await userService.confirmBatchUsers(req.body);
  res.status(201).json(relatorio);
}

// --- Gamificação (Mobile) ---
export async function deductPoints(req, res) {
  try {
    const result = await userService.deductPoints(req.user.uid, req.body.amount);
    res.json(result);
  } catch (err) { res.status(400).json({ error: err.message }); }
}
/**
 * @route POST /api/users/deduct-points
 * @description Deduz uma quantidade de pontos do usuário logado.
 */
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