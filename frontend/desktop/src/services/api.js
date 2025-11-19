const BASE_URL = "http://localhost:3000";

/**
 * @description Executa uma requisição GET (para buscar dados)
 */
async function get(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`Erro ${response.status}: ${errorData?.error || response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[api.js:get] Falha: ${error.message}`);
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
      throw new Error(`Erro ${response.status}: ${errorData?.error || response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[api.js:post] Falha: ${error.message}`);
    throw error;
  }
}

/**
 * @description [NECESSÁRIO] Executa uma requisição PUT (para atualizar dados)
 */
async function put(endpoint, data) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`Erro ${response.status}: ${errorData?.error || response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[api.js:put] Falha: ${error.message}`);
    throw error;
  }
}

/**
 * @description [BÓNUS] Executa uma requisição DELETE (para apagar dados)
 */
async function del(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`Erro ${response.status}: ${errorData?.error || response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[api.js:delete] Falha: ${error.message}`);
    throw error;
  }
}

// Exporta o objeto completo
export default {
  get,
  post,
  put,
  delete: del, // 'delete' é uma palavra reservada, usamos 'del'
};