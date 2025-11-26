import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000",
});

// Intercetor de Requisição (Envia o Token)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 🚨 NOVO: Intercetor de Resposta (Trata Token Expirado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Se o erro for 401 (Token Inválido/Expirado) ou 403 (Proibido)
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.error("Sessão expirada. A redirecionar para o login...");
      
      // 1. Limpa o token inválido
      localStorage.removeItem("token");
      localStorage.removeItem("userData");

      // 2. Força o redirecionamento para a home (Login)
      // Nota: Como este ficheiro não é um componente React, usamos window.location
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;