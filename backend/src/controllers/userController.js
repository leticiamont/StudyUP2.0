// src/controllers/userController.js
import userService from "../services/userService.js";

export async function registerUser(req, res, next) {
  try {
    // (Sem mudanças aqui, o req.body é passado direto)
    // O body agora é { displayName, email, password, role }
    // e o userService.createUser foi atualizado para aceitar isso.
    const newUser = await userService.createUser(req.body);
    res.status(201).json(newUser);
  } catch (err) {
    console.error('[userController:registerUser] Erro:', err.message);
    res.status(400).json({ error: err.message });
  }
}

export async function getAllUsers(req, res, next) {
  try {
    // MODIFICADO: Lê o 'role' da query string (ex: ?role=teacher)
    const { role } = req.query;
    
    // Passa o 'role' (que pode ser undefined) para o service
    const users = await userService.getAllUsers(role);
    res.json(users);
  } catch (err) {
    console.error('[userController:getAllUsers] Erro:', err.message);
    next(err);
  }
}

export async function getUser(req, res, next) {
  // (Sem mudanças)
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
  // (Sem mudanças)
  try {
    const { id } = req.params;
    const updatedUser = await userService.updateUser(id, req.body);
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function deleteUser(req, res, next) {
  // (Sem mudanças)
  try {
    const { id } = req.params;
    const result = await userService.deleteUser(id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}