// src/middlewares/validateUser.js
export function validateUser(req, res, next) {
  // CORRIGIDO: Validando 'displayName' ao invés de 'name'
  const { displayName, email, role } = req.body;

  // Validação simples
  if (!displayName || !role) {
    // CORRIGIDO: Mensagem de erro reflete o campo 'displayName'
    return res.status(400).json({ error: "Nome (displayName) e role são obrigatórios." });
  }

  // Professores e Admins precisam ter e-mail
  if ((role === "teacher" || role === "admin") && !email) {
    return res.status(400).json({ error: "Professores e administradores precisam de email." });
  }

  // (A lógica de 'role' para alunos está ótima e será usada em breve)
  next();
}