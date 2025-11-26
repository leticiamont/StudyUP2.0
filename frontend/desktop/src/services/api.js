const BASE_URL = "http://localhost:3000";

function getHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("authToken");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function handleResponse(response) {
  if (response.status === 401) {
    console.warn("Sessão expirada. Redirecionando para login...");
    localStorage.removeItem("authToken");
    window.location.href = "../pages/login.html";
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || errorData?.message || `Erro ${response.status}`);
  }
  if (response.status === 204) return null;
  return await response.json();
}

// --- MÉTODOS HTTP ---

async function get(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "GET",
      headers: getHeaders(),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error(`[api.get] ${endpoint} -`, error.message);
    throw error;
  }
}

async function post(endpoint, data) {
  try {
    const isFormData = data instanceof FormData;
    const headers = getHeaders();
    if (isFormData) delete headers["Content-Type"];

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: headers,
      body: isFormData ? data : JSON.stringify(data),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error(`[api.post] ${endpoint} -`, error.message);
    throw error;
  }
}

async function put(endpoint, data) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error(`[api.put] ${endpoint} -`, error.message);
    throw error;
  }
}

// --- NOVO MÉTODO PATCH ---
async function patch(endpoint, data) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error(`[api.patch] ${endpoint} -`, error.message);
    throw error;
  }
}

async function del(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error(`[api.delete] ${endpoint} -`, error.message);
    throw error;
  }
}

export default { get, post, put, patch, delete: del };