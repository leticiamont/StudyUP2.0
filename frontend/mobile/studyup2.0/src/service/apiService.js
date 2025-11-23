import AsyncStorage from '@react-native-async-storage/async-storage';

// Ajuste o IP rodar no para celular
const BASE_URL = 'http://localhost:3000'; 

const apiFetch = async (endpoint, options = {}) => {
  const token = await AsyncStorage.getItem('userToken');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers, 
  };
 
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
 
  post: (endpoint, body, options = {}) => 
    apiFetch(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),

  delete: (endpoint, options = {}) => 
    apiFetch(endpoint, { ...options, method: 'DELETE' }),

  put: (endpoint, body, options = {}) => 
    apiFetch(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
};