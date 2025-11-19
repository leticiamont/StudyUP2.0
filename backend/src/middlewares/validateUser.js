export function validateUser(req, res, next) {
  const { displayName, email, role } = req.body;

  if (!displayName || !role) {
    return res.status(400).json({ error: "Nome (displayName) e role são obrigatórios." });
  }


  if ((role === "teacher" || role === "admin") && !email) {
    return res.status(400).json({ error: "Professores e administradores precisam de email." });
  }

  next();
}