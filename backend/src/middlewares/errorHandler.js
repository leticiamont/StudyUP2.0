export const errorHandler = (err, req, res, next) => {
  console.error("Erro capturado:", err);
  res.status(500).json({ message: "Erro interno do servidor", error: err.message });
};
