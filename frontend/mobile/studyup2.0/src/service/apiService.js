import AsyncStorage from '@react-native-async-storage/async-storage';

//  Mude para o seu IP se for testar no celular
const BASE_URL = 'http://localhost:3000'; 
// const BASE_URL = 'http://192.168.0.90:3000';


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
 const errorData = await response.json();
 throw new Error(errorData.error || 'Erro na API');
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

 
};