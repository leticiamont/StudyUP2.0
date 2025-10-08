// src/middlewares/validateUser.js
export function validateUser(req, res, next) {
  const { name, email, role } = req.body;

  // Validação simples
  if (!name || !role) {
    return res.status(400).json({ error: "Nome e role são obrigatórios." });
  }

  // Professores e Admins precisam ter e-mail
  if ((role === "teacher" || role === "admin") && !email) {
    return res.status(400).json({ error: "Professores e administradores precisam de email." });
  }

  // Alunos podem não ter email (acesso via username + senha temporária futuramente)
  next();
}
