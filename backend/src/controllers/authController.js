import authService from "../services/authService.js";

export const login = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Token não fornecido" });
    }

    const decoded = await authService.verifyToken(token);

    res.status(200).json({
      message: "Login realizado com sucesso",
      user: decoded,
    });
  } catch (error) {
    next(error);
  }
};
