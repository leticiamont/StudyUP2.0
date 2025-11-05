// O backend que já funciona
const BASE_URL = "http://localhost:3000";

/**
 * @description Executa uma requisição GET (para buscar dados)
 */
async function get(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);

    if (!response.ok) {
      // Tenta ler o erro do backend (se houver)
      const errorData = await response.json().catch(() => null);
      console.error(`Erro HTTP ${response.status} ao buscar ${endpoint}`, errorData);
      throw new Error(`Erro ${response.status}: ${errorData?.error || 'Erro de rede'}`);
    }
    
    return await response.json();

  } catch (error) {
    console.error(`[api.js:get] Falha na requisição: ${error.message}`);
    throw error;
  }
}

/**
 * @description Executa uma requisição POST (para enviar dados)
 */
async function post(endpoint, data) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error(`Erro HTTP ${response.status} ao postar em ${endpoint}`, errorData);
      throw new Error(`Erro ${response.status}: ${errorData?.error || 'Erro de rede'}`);
    }

    return await response.json();

  } catch (error) {
    console.error(`[api.js:post] Falha na requisição: ${error.message}`);
    throw error;
  }
}

// Exporta um objeto 'api' por padrão
// Isso faz o 'import api from ...' funcionar no outro script
export default {
  get,
  post,
  // (Futuramente: put, delete, etc.)
};