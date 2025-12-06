import AsyncStorage from '@react-native-async-storage/async-storage';

// Ajuste o IP rodar no para celular
const BASE_URL = 'http://localhost:3000'; // Confirme se seu IP é este mesmo hoje!

const apiFetch = async (endpoint, options = {}) => {
  const token = await AsyncStorage.getItem('userToken');

  // Cabeçalhos padrão
  const headers = {
    ...options.headers, 
  };
  
  // 🚨 CORREÇÃO: Só adiciona JSON se NÃO for FormData (Upload)
  // Se 'options.body' for uma instância de FormData, não definimos Content-Type
  const isFormData = options.body instanceof FormData;
  if (!isFormData) {
      headers['Content-Type'] = 'application/json';
  }
 
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
 
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro na API (${response.status})`);
  }
 
  if (response.status === 204) {
    return { success: true };
  }

  return response.json();
};

export const api = {
  get: (endpoint, options = {}) => 
    apiFetch(endpoint, { ...options, method: 'GET' }),
 
  // No POST/PUT, se o body não for string (ex: FormData), passamos direto
  post: (endpoint, body, options = {}) => {
    const isFormData = body instanceof FormData;
    return apiFetch(endpoint, { 
        ...options, 
        method: 'POST', 
        body: isFormData ? body : JSON.stringify(body) 
    });
  },

  delete: (endpoint, options = {}) => 
    apiFetch(endpoint, { ...options, method: 'DELETE' }),

  put: (endpoint, body, options = {}) => {
    const isFormData = body instanceof FormData;
    return apiFetch(endpoint, { 
        ...options, 
        method: 'PUT', 
        body: isFormData ? body : JSON.stringify(body) 
    });
  },
};

export default api; // Export default para facilitar imports