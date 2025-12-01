import userService from "../services/userService.js";
import { db, admin } from "../config/firebase.js"; // Importando admin para o incremento
import fs from 'fs';
import csv from 'csv-parser';

export async function registerUser(req, res, next) {
  try {
    const newUser = await userService.createUser(req.body);
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getAllUsers(req, res, next) {
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
      if (data.teacherId) classCountMap.set(data.teacherId, (classCountMap.get(data.teacherId) || 0) + 1);
    });

    const usersComNomes = usersList.map(user => {
      if (user.role === 'student') return { ...user, className: classMap.get(user.classId) || 'Nenhuma' };
      if (user.role === 'teacher') return { ...user, classCount: classCountMap.get(user.id) || 0 };
      return user; 
    });

    res.json(usersComNomes);
  } catch (err) { next(err); }
}

export async function getUser(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
    res.json(user);
  } catch (err) { next(err); }
}

export async function updateUser(req, res, next) {
  try {
    const updatedUser = await userService.updateUser(req.params.id, req.body);
    res.json(updatedUser);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

export async function deleteUser(req, res, next) {
  try {
    const result = await userService.deleteUser(req.params.id);
    res.json(result);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// --- LOTE (CSV) ---
export async function batchPreviewUsers(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhum CSV enviado." });
    const results = [];
    const filePath = req.file.path;
    
    const processFile = new Promise((resolve, reject) => {
      fs.createReadStream(filePath).pipe(csv({ separator: ';' }))
        .on('data', (data) => results.push(data))
        .on('end', () => { fs.unlinkSync(filePath); resolve(results); })
        .on('error', (error) => { fs.unlinkSync(filePath); reject(error); });
    });
    const alunosDoCsv = await processFile;
    const preview = await userService.previewBatchUsers(alunosDoCsv);
    res.status(200).json(preview);
  } catch (err) { res.status(500).json({ error: 'Erro no CSV.', details: err.message }); }
}

export async function batchConfirmUsers(req, res, next) {
  try {
    const relatorio = await userService.confirmBatchUsers(req.body);
    res.status(201).json(relatorio);
  } catch (err) { res.status(500).json({ error: 'Erro ao salvar.', details: err.message }); }
}

// --- GAMIFICAÇÃO ---
export async function deductPoints(req, res, next) {
  try {
    const { uid } = req.user;
    const { amount } = req.body;
    const result = await userService.deductPoints(uid, amount);
    res.status(200).json({ message: "Pontos deduzidos.", newPoints: result.newPoints });
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// 🚨 [NOVO] ADICIONAR PONTOS (USADO NO QUIZ) 🚨
export async function addPoints(req, res) {
  try {
    const { uid } = req.user; // ID do usuário logado (vem do token)
    const { points } = req.body;

    if (!points || typeof points !== 'number') {
        return res.status(400).json({ error: "Pontos inválidos." });
    }

    // Incremento atômico (seguro para concorrência)
    const userRef = db.collection("users").doc(uid);
    await userRef.update({
        points: admin.firestore.FieldValue.increment(points)
    });

    console.log(`[Gamification] +${points} XP para ${uid}`);
    res.status(200).json({ success: true, message: "Pontos salvos!" });

  } catch (error) {
    console.error("Erro ao adicionar pontos:", error);
    res.status(500).json({ error: "Erro ao salvar pontuação." });
  }
}